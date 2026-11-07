<?php

namespace App\Services;

use DateTimeImmutable;
use DateTimeZone;
use RuntimeException;
use InvalidArgumentException;

/**
 * WeeklyAnalyticsService
 * ======================
 * Layanan agregasi analytics rolling-window (7, 30, 90, 180 hari) SuaraLens.
 * 
 * Fitur:
 * - Sinkronisasi inkremental dengan PostgreSQL melalui DataExtractionService.
 * - Perhitungan kepatuhan SLA institusi berbasis SLAService.
 * - Perbandingan periode sebelumnya (trend percentage delta).
 * - Pembersihan berkala snapshot lama (pruning, max 10 file).
 * - Fallback auto-recovery jika snapshot belum tersedia.
 */
class WeeklyAnalyticsService
{
    private const TIMEZONE = 'Asia/Jakarta';
    private const AGGREGATE_DAYS = [7, 30, 90, 180];
    private const MAX_SNAPSHOT_FILES = 10;
    private const PIPELINE_VERSION = '1.2.0';

    private SLAService $slaService;
    private DataExtractionService $extractionService;

    public function __construct()
    {
        $this->slaService = new SLAService();
        $this->extractionService = new DataExtractionService();
    }

    /**
     * Memperbarui seluruh snapshot rolling-windows (7, 30, 90, 180 hari).
     *
     * @param bool $forceExtract Jika true, paksa ekstraksi ulang dari awal data.
     * @return array Metadata dan path file snapshot yang disimpan.
     */
    public function refreshRollingWindows(bool $forceExtract = false): array
    {
        $timezone = new DateTimeZone(self::TIMEZONE);
        $now = new DateTimeImmutable('now', $timezone);
        $utc = new DateTimeZone('UTC');

        // 1. Ekstraksi inkremental data terbaru dari PostgreSQL
        $extractionResult = $this->extractionService->extractIncremental($forceExtract);

        // 2. Query data hingga 360 hari lalu untuk mendukung perbandingan periode 180 hari
        $oldestStart = $now->modify('-360 days');
        $db = \Config\Database::connect('default');
        $complaintsTable = $db->prefixTable('complaints');
        $analysisTable = $db->prefixTable('complaint_analysis');

        $rows = $db->query(
            sprintf(
                'SELECT 
                    c.id, c.created_at, c.updated_at, c.status, c.assigned_unit,
                    ca.category, ca.sentiment, ca.urgency_label, ca.urgency_score
                 FROM %s c
                 LEFT JOIN (
                     SELECT complaint_id, MAX(id) AS latest_id
                     FROM %s
                     GROUP BY complaint_id
                 ) latest ON latest.complaint_id = c.id
                 LEFT JOIN %s ca ON ca.id = latest.latest_id
                 WHERE (
                     (c.created_at >= ? AND c.created_at <= ?)
                     OR
                     (c.updated_at >= ? AND c.updated_at <= ?)
                 )',
                $complaintsTable,
                $analysisTable,
                $analysisTable
            ),
            [
                $oldestStart->setTimezone($utc)->format('Y-m-d H:i:s'),
                $now->setTimezone($utc)->format('Y-m-d H:i:s'),
                $oldestStart->setTimezone($utc)->format('Y-m-d H:i:s'),
                $now->setTimezone($utc)->format('Y-m-d H:i:s'),
            ]
        )->getResultArray();

        // 3. Bangun agregasi tiap window
        $aggregates = [];
        foreach (self::AGGREGATE_DAYS as $days) {
            $currentStart = $now->modify("-{$days} days");
            $previousStart = $currentStart->modify("-{$days} days");

            $currentWindowRows = [];
            $previousWindowRows = [];

            foreach ($rows as $row) {
                $createdAtStr = $row['created_at'] ?? null;
                if (empty($createdAtStr)) {
                    continue;
                }

                try {
                    $createdAt = new DateTimeImmutable($createdAtStr, $utc)->setTimezone($timezone);
                } catch (\Throwable $e) {
                    continue;
                }

                if ($createdAt >= $currentStart && $createdAt <= $now) {
                    $currentWindowRows[] = $row;
                } elseif ($createdAt >= $previousStart && $createdAt < $currentStart) {
                    $previousWindowRows[] = $row;
                }
            }

            $aggregates[(string) $days] = $this->buildSnapshot(
                $currentWindowRows,
                $previousWindowRows,
                $days,
                $currentStart,
                $now
            );
        }

        $watermark = $this->extractionService->loadWatermark();

        $snapshot = [
            'schema_version'   => 2, // Kompatibel dengan frontend
            'generated_at'     => $now->format(DATE_ATOM),
            'timezone'         => self::TIMEZONE,
            'pipeline_version' => self::PIPELINE_VERSION,
            'watermark'        => $watermark['last_watermark'] ?? null,
            'aggregates'       => $aggregates,
        ];

        $file = $this->writeSnapshot($snapshot);
        $this->pruneOldSnapshots();

        return [
            'snapshot'   => $snapshot,
            'file'       => $file,
            'extraction' => $extractionResult,
        ];
    }

    /**
     * Mengambil snapshot analytics terbaru untuk window hari yang diminta.
     * Jika belum ada snapshot di disk, jalankan refreshRollingWindows otomatis.
     */
    public function latestSnapshot(int $days): ?array
    {
        if (!in_array($days, self::AGGREGATE_DAYS, true)) {
            throw new InvalidArgumentException('Unsupported analytics aggregation window. Must be 7, 30, 90, or 180.');
        }

        $directory = $this->outputDirectory();
        $files = glob($directory . DIRECTORY_SEPARATOR . 'analytics-*.json');

        if ($files === false || $files === []) {
            // Auto-recovery: refresh rolling windows jika belum ada snapshot sama sekali
            $refreshed = $this->refreshRollingWindows();
            $files = [$refreshed['file']];
        }

        rsort($files, SORT_STRING);
        $contents = @file_get_contents($files[0]);
        if ($contents === false) {
            throw new RuntimeException('Unable to read latest weekly analytics snapshot.');
        }

        $snapshot = json_decode($contents, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($snapshot) || ($snapshot['schema_version'] ?? null) !== 2) {
            throw new RuntimeException('Latest weekly analytics snapshot has an unsupported format.');
        }

        $aggregate = $snapshot['aggregates'][(string) $days] ?? null;
        if (!is_array($aggregate)) {
            throw new RuntimeException('Requested aggregation window is missing from the latest snapshot.');
        }

        return $aggregate + [
            'schema_version'   => $snapshot['schema_version'],
            'generated_at'     => $snapshot['generated_at'],
            'timezone'         => $snapshot['timezone'],
            'pipeline_version' => $snapshot['pipeline_version'] ?? self::PIPELINE_VERSION,
        ];
    }

    private function buildSnapshot(
        array $rows,
        array $previousRows,
        int $days,
        DateTimeImmutable $start,
        DateTimeImmutable $end
    ): array {
        $topicCounts = [];
        $unitCounts = [];
        $statusCounts = [];
        $urgencyCounts = [
            'low'      => 0,
            'medium'   => 0,
            'high'     => 0,
            'critical' => 0,
        ];
        $sentimentCounts = [
            'negative' => 0,
            'neutral'  => 0,
            'positive' => 0,
            'unknown'  => 0,
        ];

        $slaCompliant = 0;
        $slaBreach = 0;
        $resolutionDaysSum = 0.0;
        $resolutionCount = 0;

        foreach ($rows as $row) {
            // Topik / Kategori
            $topic = trim((string) ($row['category'] ?? ''));
            $topic = $topic !== '' ? $topic : 'Belum diklasifikasi';
            $topicCounts[$topic] = ($topicCounts[$topic] ?? 0) + 1;

            // Unit Kerja
            $unit = trim((string) ($row['assigned_unit'] ?? ''));
            $unit = $unit !== '' ? $unit : 'Belum ditugaskan';
            $unitCounts[$unit] = ($unitCounts[$unit] ?? 0) + 1;

            // Status Tiket
            $status = strtolower(trim((string) ($row['status'] ?? 'submitted')));
            $statusCounts[$status] = ($statusCounts[$status] ?? 0) + 1;

            // Urgensi
            $urgency = strtolower(trim((string) ($row['urgency_label'] ?? 'medium')));
            if (!isset($urgencyCounts[$urgency])) {
                $urgency = 'medium';
            }
            $urgencyCounts[$urgency]++;

            // Sentimen
            $sentiment = strtolower(trim((string) ($row['sentiment'] ?? '')));
            $sentiment = match ($sentiment) {
                'negative', 'negatif' => 'negative',
                'neutral', 'netral'   => 'neutral',
                'positive', 'positif' => 'positive',
                default               => 'unknown',
            };
            $sentimentCounts[$sentiment]++;

            // Perhitungan Kepatuhan SLA
            $isResolved = in_array($status, ['resolved', 'done', 'answered', 'closed'], true);
            $createdAtStr = $row['created_at'] ?? 'now';
            $assignedUnit = $row['assigned_unit'] ?? 'Lainnya/Lintas Unit';

            try {
                $createdDt = new DateTimeImmutable($createdAtStr);
                $deadlineStr = $this->slaService->calculateDeadline($assignedUnit, $createdAtStr);
                $deadlineDt = new DateTimeImmutable($deadlineStr);

                if ($isResolved) {
                    $resolvedAtStr = $row['updated_at'] ?? $createdAtStr;
                    $resolvedDt = new DateTimeImmutable($resolvedAtStr);
                    $diff = $createdDt->diff($resolvedDt);
                    $daysTaken = round($diff->days + ($diff->h / 24), 2);
                    $resolutionDaysSum += $daysTaken;
                    $resolutionCount++;

                    if ($resolvedDt <= $deadlineDt) {
                        $slaCompliant++;
                    } else {
                        $slaBreach++;
                    }
                } else {
                    if ($end <= $deadlineDt) {
                        $slaCompliant++;
                    } else {
                        $slaBreach++;
                    }
                }
            } catch (\Throwable $e) {
                $slaBreach++;
            }
        }

        $total = count($rows);
        $topics = $this->topCounts($topicCounts, 5);
        $topTopic = $topics[0] ?? null;

        $negativePct = $total > 0
            ? round(($sentimentCounts['negative'] / $total) * 100, 1)
            : 0.0;

        $compliancePct = $total > 0
            ? round(($slaCompliant / $total) * 100, 1)
            : 100.0;

        $breachPct = $total > 0
            ? round(($slaBreach / $total) * 100, 1)
            : 0.0;

        $avgResolutionDays = $resolutionCount > 0
            ? round($resolutionDaysSum / $resolutionCount, 2)
            : 0.0;

        // Perbandingan dengan Periode Sebelumnya
        $prevTotal = count($previousRows);
        $countChangePct = 0.0;
        if ($prevTotal > 0) {
            $countChangePct = round((($total - $prevTotal) / $prevTotal) * 100, 1);
        }

        // Narasi Ringkasan
        if ($total === 0) {
            $summaryId = 'Tidak ada aduan yang tercatat dalam periode ini.';
            $summaryEn = 'No complaints were recorded during this period.';
        } else {
            $topicName = $topTopic['label'] ?? 'Belum diklasifikasi';
            $topicCount = $topTopic['count'] ?? 0;
            $summaryId = sprintf(
                'Dalam %d hari terakhir (%s sampai %s) tercatat %d aduan. Topik terbanyak adalah %s (%d aduan), dengan sentimen negatif sebesar %.1f%% dan kepatuhan SLA sebesar %.1f%%.',
                $days,
                $start->format('d-m-Y H:i'),
                $end->format('d-m-Y H:i'),
                $total,
                $topicName,
                $topicCount,
                $negativePct,
                $compliancePct
            );
            $summaryEn = sprintf(
                '%d complaints were recorded in the last %d days (%s to %s). The most common topic was %s (%d complaints), %.1f%% had negative sentiment, and SLA compliance was %.1f%%.',
                $total,
                $days,
                $start->format('Y-m-d H:i'),
                $end->format('Y-m-d H:i'),
                $topicName,
                $topicCount,
                $negativePct,
                $compliancePct
            );
        }

        return [
            'aggregate_days' => $days,
            'period' => [
                'start_at' => $start->format(DATE_ATOM),
                'end_at'   => $end->format(DATE_ATOM),
            ],
            'record_count' => $total,
            'summary' => [
                'id' => $summaryId,
                'en' => $summaryEn,
            ],
            'popular_topics' => $topics,
            'sentiment'      => $sentimentCounts,
            'urgency'        => $urgencyCounts,
            'top_units'      => $this->topCounts($unitCounts, 5),
            'statuses'       => $this->topCounts($statusCounts, 20),
            'sla' => [
                'compliant_count'     => $slaCompliant,
                'breach_count'        => $slaBreach,
                'compliance_pct'      => $compliancePct,
                'breach_pct'          => $breachPct,
                'avg_resolution_days' => $avgResolutionDays,
            ],
            'previous_period_comparison' => [
                'previous_record_count' => $prevTotal,
                'count_change_pct'      => $countChangePct,
                'trend'                 => $countChangePct > 5.0 ? 'increasing' : ($countChangePct < -5.0 ? 'decreasing' : 'stable'),
            ],
        ];
    }

    private function topCounts(array $counts, int $limit): array
    {
        $items = [];
        foreach ($counts as $label => $count) {
            $items[] = ['label' => (string) $label, 'count' => (int) $count];
        }

        usort($items, static fn (array $a, array $b): int =>
            ($b['count'] <=> $a['count']) ?: strcmp($a['label'], $b['label'])
        );

        return array_slice($items, 0, $limit);
    }

    private function writeSnapshot(array $snapshot): string
    {
        $directory = $this->outputDirectory();
        if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
            throw new RuntimeException('Unable to create weekly analytics directory.');
        }

        $generatedAt = new DateTimeImmutable($snapshot['generated_at']);
        $filename = sprintf('analytics-%s-%s.json', $generatedAt->format('Ymd\THis'), bin2hex(random_bytes(3)));
        $target = $directory . DIRECTORY_SEPARATOR . $filename;
        $temporary = $target . '.tmp';
        $json = json_encode($snapshot, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR) . PHP_EOL;

        if (file_put_contents($temporary, $json, LOCK_EX) !== strlen($json)) {
            @unlink($temporary);
            throw new RuntimeException('Unable to write weekly analytics temporary snapshot.');
        }

        if (!rename($temporary, $target)) {
            @unlink($temporary);
            throw new RuntimeException('Unable to publish weekly analytics snapshot.');
        }

        return $target;
    }

    private function pruneOldSnapshots(): void
    {
        $directory = $this->outputDirectory();
        $files = glob($directory . DIRECTORY_SEPARATOR . 'analytics-*.json');
        if ($files === false || count($files) <= self::MAX_SNAPSHOT_FILES) {
            return;
        }

        rsort($files, SORT_STRING);
        $toDelete = array_slice($files, self::MAX_SNAPSHOT_FILES);
        foreach ($toDelete as $oldFile) {
            @unlink($oldFile);
        }
    }

    private function outputDirectory(): string
    {
        $configuredPath = trim((string) env('WEEKLY_ANALYTICS_OUTPUT_DIR', ''));
        if ($configuredPath === '') {
            $configuredPath = '..' . DIRECTORY_SEPARATOR . 'data'
                . DIRECTORY_SEPARATOR . 'output' . DIRECTORY_SEPARATOR . 'weekly_analytics';
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
