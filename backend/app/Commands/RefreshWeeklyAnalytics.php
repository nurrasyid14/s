<?php

namespace App\Commands;

use App\Services\WeeklyAnalyticsService;
use App\Services\DataExtractionService;
use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;

class RefreshWeeklyAnalytics extends BaseCommand
{
    protected $group = 'Analytics';
    protected $name = 'analytics:refresh-weekly';
    protected $description = 'Refresh 7, 30, 90, and 180-day analytics aggregates and incremental data extraction.';
    protected $usage = 'analytics:refresh-weekly [--force] [--extract-only]';

    protected $options = [
        '--force'        => 'Abaikan watermark dan ekstrak ulang seluruh data historis dari awal.',
        '--extract-only' => 'Hanya jalankan ekstraksi inkremental tanpa mempublikasikan snapshot rolling-window.',
    ];

    public function run(array $params)
    {
        CLI::write("============================================================", 'yellow');
        CLI::write("SUARALENS DATA ANALYTICS & EXTRACTION PIPELINE", 'yellow');
        CLI::write("============================================================", 'yellow');

        // 1. Process Concurrency Lock (Mencegah eksekusi beruntun / tabrakan file)
        $lockDir = WRITEPATH . 'locks';
        if (!is_dir($lockDir)) {
            @mkdir($lockDir, 0755, true);
        }
        $lockFile = $lockDir . DIRECTORY_SEPARATOR . 'analytics_refresh.lock';
        $lockFp = fopen($lockFile, 'c');

        if ($lockFp === false || !flock($lockFp, LOCK_EX | LOCK_NB)) {
            CLI::write('[WARNING] Job analytics:refresh-weekly lain sedang berjalan. Operasi dibatalkan.', 'red');
            return;
        }

        try {
            $force = array_key_exists('force', $params) || CLI::getOption('force');
            $extractOnly = array_key_exists('extract-only', $params) || CLI::getOption('extract-only');

            if ($force) {
                CLI::write('[INFO] Mode --force aktif: Watermark direset ke awal.', 'cyan');
            }

            if ($extractOnly) {
                CLI::write('[INFO] Menjalankan DataExtractionService saja...', 'cyan');
                $extraction = (new DataExtractionService())->extractIncremental((bool) $force);
                CLI::write(sprintf(
                    '✓ Ekstraksi selesai: %d record diekstrak (Watermark: %s -> %s)',
                    $extraction['records_extracted'],
                    $extraction['watermark_start'],
                    $extraction['watermark_end']
                ), 'green');
                CLI::write('  Stream file: ' . $extraction['stream_file'], 'white');
                return;
            }

            CLI::write('[INFO] Menjalankan WeeklyAnalyticsService & Incremental Extraction...', 'cyan');
            $service = new WeeklyAnalyticsService();
            $result = $service->refreshRollingWindows((bool) $force);
            $snapshot = $result['snapshot'];
            $extraction = $result['extraction'];

            CLI::write(sprintf(
                '✓ Ekstraksi inkremental: %d record baru/diperbarui.',
                $extraction['records_extracted']
            ), 'green');
            CLI::write('  Watermark saat ini: ' . ($extraction['watermark_end'] ?? '-'), 'white');

            CLI::write("\n[Ringkasan Rolling Windows]", 'cyan');
            foreach ($snapshot['aggregates'] as $days => $aggregate) {
                $sla = $aggregate['sla'] ?? [];
                $prev = $aggregate['previous_period_comparison'] ?? [];
                CLI::write(sprintf(
                    '  • Window %3d hari: %d aduan | SLA Compliance: %.1f%% | Δ vs Sebelumnya: %+.1f%% (%s)',
                    $days,
                    $aggregate['record_count'],
                    $sla['compliance_pct'] ?? 100.0,
                    $prev['count_change_pct'] ?? 0.0,
                    $prev['trend'] ?? 'stable'
                ), 'green');
            }

            CLI::write("\n[Artefak Tersimpan]", 'cyan');
            CLI::write('  Snapshot file : ' . $result['file'], 'white');
            CLI::write('  Stream JSONL  : ' . $extraction['stream_file'], 'white');
            CLI::write('  Watermark JSON: ' . $extraction['watermark_file'], 'white');
            CLI::write("\n✅ Pipeline analitik mingguan berhasil disinkronkan.\n", 'green');
        } catch (\Throwable $e) {
            CLI::write("\n[ERROR] Pipeline analitik gagal: " . $e->getMessage(), 'red');
            CLI::write($e->getTraceAsString(), 'red');
        } finally {
            if ($lockFp !== false) {
                flock($lockFp, LOCK_UN);
                fclose($lockFp);
            }
        }
    }
}
