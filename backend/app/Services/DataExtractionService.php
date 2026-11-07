<?php

namespace App\Services;

use DateTimeImmutable;
use DateTimeZone;
use RuntimeException;
use InvalidArgumentException;

/**
 * DataExtractionService
 * =====================
 * Layanan ekstraksi data inkremental dari PostgreSQL ke Analytical Data Layer (JSONL).
 * 
 * Prinsip Kerja:
 * 1. Pelacakan Watermark Persisten (updated_at).
 * 2. Privacy-Preserving (Zero PII: tidak mengekstrak nama, telepon, email, NIM pelapor).
 * 3. Atomic Write (menulis ke .tmp, lock eksklusif, lalu rename).
 * 4. Watermark Integrity (watermark tidak akan maju jika batch gagal).
 * 5. Idempotent & Fault-Tolerant (dapat diulang tanpa duplikasi record).
 */
class DataExtractionService
{
    private const TIMEZONE = 'Asia/Jakarta';
    private const PIPELINE_VERSION = '1.2.0';

    private \CodeIgniter\Database\BaseConnection $db;
    private SLAService $slaService;
    private string $outputDir;
    private string $watermarkFile;
    private string $extractedDataFile;

    public function __construct(?string $outputDir = null)
    {
        $this->db = \Config\Database::connect('default');
        $this->slaService = new SLAService();

        if ($outputDir === null || trim($outputDir) === '') {
            $this->outputDir = $this->resolveDefaultDir();
        } else {
            $this->outputDir = rtrim($outputDir, '\\/');
        }

        $this->watermarkFile = $this->outputDir . DIRECTORY_SEPARATOR . 'extraction_watermark.json';
        $this->extractedDataFile = $this->outputDir . DIRECTORY_SEPARATOR . 'complaints_stream.jsonl';
    }

    /**
     * Jalankan ekstraksi inkremental berdasarkan watermark terakhir.
     *
     * @param bool $force Jika true, abaikan watermark dan ekstrak ulang dari awal.
     * @return array Metadata ringkasan eksekusi batch.
     */
    public function extractIncremental(bool $force = false): array
    {
        $this->ensureDirectoryExists($this->outputDir);

        $now = new DateTimeImmutable('now', new DateTimeZone(self::TIMEZONE));
        $utc = new DateTimeZone('UTC');
        $cutoffUtc = $now->setTimezone($utc)->format('Y-m-d H:i:s');

        $watermark = $this->loadWatermark();
        $watermarkStart = ($force || empty($watermark['last_watermark'])) 
            ? '1970-01-01 00:00:00' 
            : $watermark['last_watermark'];

        $complaintsTable = $this->db->prefixTable('complaints');
        $analysisTable = $this->db->prefixTable('complaint_analysis');

        // Query inkremental: ambil record yang created_at atau updated_at berada di antara watermark dan cutoff.
        // TIDAK MENGAMBIL field sensitif/PII (user_id, raw complainant details).
        $sql = sprintf(
            'SELECT 
                c.id, c.ticket_id, c.type, c.status, c.assigned_unit,
                c.created_at, c.updated_at,
                ca.category, ca.category_confidence, ca.urgency_label, ca.urgency_score,
                ca.sentiment, ca.sentiment_score, ca.submission_type, ca.model_version
             FROM %s c
             LEFT JOIN (
                 SELECT complaint_id, MAX(id) AS latest_id
                 FROM %s
                 GROUP BY complaint_id
             ) latest ON latest.complaint_id = c.id
             LEFT JOIN %s ca ON ca.id = latest.latest_id
             WHERE (
                 (c.updated_at IS NOT NULL AND c.updated_at > ? AND c.updated_at <= ?)
                 OR
                 (c.updated_at IS NULL AND c.created_at > ? AND c.created_at <= ?)
             )
             ORDER BY COALESCE(c.updated_at, c.created_at) ASC',
            $complaintsTable,
            $analysisTable,
            $analysisTable
        );

        $rows = $this->db->query($sql, [
            $watermarkStart, $cutoffUtc,
            $watermarkStart, $cutoffUtc
        ])->getResultArray();

        $recordCount = count($rows);
        $maxWatermarkFound = $watermarkStart;

        // 1. Validasi & Transformasi record ke bentuk analitik
        $transformedRecords = [];
        foreach ($rows as $row) {
            $transformed = $this->validateAndTransformRow($row, $now);
            $transformedRecords[] = $transformed;

            $recordWatermark = $row['updated_at'] ?? $row['created_at'];
            if ($recordWatermark !== null && strcmp($recordWatermark, $maxWatermarkFound) > 0) {
                $maxWatermarkFound = $recordWatermark;
            }
        }

        // 2. Tulis ke Analytical Data Layer secara atomic
        if ($recordCount > 0) {
            $this->appendOrUpsertStream($transformedRecords, $force);
        }

        // 3. Majukan watermark HANYA SETELAH penyimpanan berhasil
        $newWatermark = [
            'pipeline_version'             => self::PIPELINE_VERSION,
            'watermark_column'             => 'COALESCE(updated_at, created_at)',
            'last_watermark'               => $maxWatermarkFound,
            'last_extracted_at'            => $now->format(DATE_ATOM),
            'last_extracted_count'         => $recordCount,
            'cumulative_records_extracted' => ($force ? 0 : ($watermark['cumulative_records_extracted'] ?? 0)) + $recordCount,
            'status'                       => 'success',
            'error_message'                => null,
        ];
        $this->saveWatermark($newWatermark);

        return [
            'status'             => 'success',
            'records_extracted'  => $recordCount,
            'watermark_start'    => $watermarkStart,
            'watermark_end'      => $maxWatermarkFound,
            'extracted_at'       => $now->format(DATE_ATOM),
            'stream_file'        => $this->extractedDataFile,
            'watermark_file'     => $this->watermarkFile,
        ];
    }

    /**
     * Membaca isi Analytical Data Layer (JSONL).
     *
     * @return array Daftar baris record ter-analisis.
     */
    public function readStreamRecords(): array
    {
        if (!file_exists($this->extractedDataFile)) {
            return [];
        }

        $records = [];
        $handle = fopen($this->extractedDataFile, 'r');
        if ($handle === false) {
            return [];
        }

        while (($line = fgets($handle)) !== false) {
            $trimmed = trim($line);
            if ($trimmed === '') {
                continue;
            }
            $item = json_decode($trimmed, true);
            if (is_array($item) && isset($item['id'])) {
                // Keyed by id for deduplication / latest state
                $records[$item['id']] = $item;
            }
        }
        fclose($handle);

        return array_values($records);
    }

    /**
     * Muat watermark persisten dari disk.
     */
    public function loadWatermark(): array
    {
        if (!file_exists($this->watermarkFile)) {
            return [
                'pipeline_version'             => self::PIPELINE_VERSION,
                'last_watermark'               => null,
                'last_extracted_at'            => null,
                'cumulative_records_extracted' => 0,
                'status'                       => 'uninitialized',
            ];
        }

        $contents = @file_get_contents($this->watermarkFile);
        if ($contents === false) {
            return [
                'pipeline_version'             => self::PIPELINE_VERSION,
                'last_watermark'               => null,
                'last_extracted_at'            => null,
                'cumulative_records_extracted' => 0,
                'status'                       => 'unreadable',
            ];
        }

        $decoded = json_decode($contents, true);
        return is_array($decoded) ? $decoded : [];
    }

    /**
     * Validasi baris data dan perkaya dengan dimensi analitik (SLA, resolusi).
     */
    private function validateAndTransformRow(array $row, DateTimeImmutable $now): array
    {
        $id = (int) ($row['id'] ?? 0);
        if ($id <= 0) {
            throw new RuntimeException("Invalid complaint row: Missing or invalid ID.");
        }

        $createdAt = $row['created_at'] ?? null;
        if (empty($createdAt)) {
            throw new RuntimeException("Invalid complaint row {$id}: Missing created_at.");
        }

        $status = strtolower(trim((string) ($row['status'] ?? 'submitted')));
        $unit = trim((string) ($row['assigned_unit'] ?? ''));
        $unit = $unit !== '' ? $unit : 'Lainnya/Lintas Unit';

        $isResolved = in_array($status, ['resolved', 'done', 'answered', 'closed'], true);

        // Hitung durasi dan kepatuhan SLA menggunakan SLAService
        $resolutionDays = null;
        $isCompliant = true;

        try {
            $createdDt = new DateTimeImmutable($createdAt);
            $deadline = $this->slaService->calculateDeadline($unit, $createdAt);
            $deadlineDt = new DateTimeImmutable($deadline);

            if ($isResolved) {
                $resolvedAt = $row['updated_at'] ?? $createdAt;
                $resolvedDt = new DateTimeImmutable($resolvedAt);
                $diff = $createdDt->diff($resolvedDt);
                $resolutionDays = round($diff->days + ($diff->h / 24) + ($diff->i / 1440), 2);
                $isCompliant = ($resolvedDt <= $deadlineDt);
            } else {
                $diffOpen = $createdDt->diff($now);
                $resolutionDays = round($diffOpen->days + ($diffOpen->h / 24), 2);
                $isCompliant = ($now <= $deadlineDt);
            }
        } catch (\Throwable $e) {
            $isCompliant = false;
        }

        return [
            'id'                  => $id,
            'ticket_id'           => $row['ticket_id'] ?? "ADU-{$id}",
            'type'                => $row['type'] ?? 'complaint',
            'status'              => $status,
            'assigned_unit'       => $unit,
            'category'            => $row['category'] ?? 'Belum diklasifikasi',
            'category_confidence' => $row['category_confidence'] !== null ? (float) $row['category_confidence'] : null,
            'urgency'             => $row['urgency_label'] ?? 'Medium',
            'urgency_score'       => $row['urgency_score'] !== null ? (float) $row['urgency_score'] : 0.5,
            'sentiment'           => $this->normalizeSentiment($row['sentiment'] ?? null),
            'sentiment_score'     => $row['sentiment_score'] !== null ? (float) $row['sentiment_score'] : null,
            'submission_type'     => $row['submission_type'] ?? 'complaint',
            'created_at'          => $createdAt,
            'updated_at'          => $row['updated_at'] ?? $createdAt,
            'is_resolved'         => $isResolved,
            'resolution_days'     => $resolutionDays,
            'is_sla_compliant'    => $isCompliant,
            'model_version'       => $row['model_version'] ?? 'heuristic-v1',
        ];
    }

    private function normalizeSentiment(?string $raw): string
    {
        $raw = strtolower(trim((string) $raw));
        return match ($raw) {
            'negative', 'negatif' => 'negative',
            'neutral', 'netral'   => 'neutral',
            'positive', 'positif' => 'positive',
            default               => 'unknown',
        };
    }

    /**
     * Menyimpan record ke stream JSONL dengan mekanisme update/upsert berbasis ID.
     */
    private function appendOrUpsertStream(array $newRecords, bool $forceReset): void
    {
        $allRecords = [];
        if (!$forceReset && file_exists($this->extractedDataFile)) {
            $existing = $this->readStreamRecords();
            foreach ($existing as $r) {
                $allRecords[$r['id']] = $r;
            }
        }

        // Terapkan update / record baru
        foreach ($newRecords as $r) {
            $allRecords[$r['id']] = $r;
        }

        // Urutkan berdasarkan ID
        ksort($allRecords);

        // Atomic write
        $tempFile = $this->extractedDataFile . '.tmp';
        $fp = fopen($tempFile, 'w');
        if ($fp === false) {
            throw new RuntimeException("Unable to open temporary stream file: {$tempFile}");
        }

        if (!flock($fp, LOCK_EX)) {
            fclose($fp);
            @unlink($tempFile);
            throw new RuntimeException("Unable to acquire exclusive lock on stream temporary file.");
        }

        foreach ($allRecords as $record) {
            fwrite($fp, json_encode($record, JSON_UNESCAPED_UNICODE) . PHP_EOL);
        }

        fflush($fp);
        flock($fp, LOCK_UN);
        fclose($fp);

        if (!rename($tempFile, $this->extractedDataFile)) {
            @unlink($tempFile);
            throw new RuntimeException("Unable to publish stream file to Analytical Data Layer.");
        }
    }

    private function saveWatermark(array $watermark): void
    {
        $tempFile = $this->watermarkFile . '.tmp';
        $json = json_encode($watermark, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;

        if (file_put_contents($tempFile, $json, LOCK_EX) === false) {
            @unlink($tempFile);
            throw new RuntimeException("Unable to write watermark temporary file.");
        }

        if (!rename($tempFile, $this->watermarkFile)) {
            @unlink($tempFile);
            throw new RuntimeException("Unable to publish watermark file.");
        }
    }

    private function ensureDirectoryExists(string $dir): void
    {
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new RuntimeException("Unable to create directory: {$dir}");
        }
    }

    private function resolveDefaultDir(): string
    {
        $configuredPath = trim((string) env('ANALYTICS_DATA_LAYER_DIR', ''));
        if ($configuredPath === '') {
            $configuredPath = '..' . DIRECTORY_SEPARATOR . 'data'
                . DIRECTORY_SEPARATOR . 'output' . DIRECTORY_SEPARATOR . 'extracted_analytics';
        }

        $drivePath = preg_match('/^[A-Za-z]:/', $configuredPath) === 1;
        $isAbsolute = str_starts_with($configuredPath, '/')
            || str_starts_with($configuredPath, '\\')
            || ($drivePath && in_array(substr($configuredPath, 2, 1), ['\\', '/'], true));
        if (!$isAbsolute) {
            $configuredPath = rtrim(ROOTPATH, '\\/') . DIRECTORY_SEPARATOR . $configuredPath;
        }

        return rtrim($configuredPath, '\\/');
    }
}
