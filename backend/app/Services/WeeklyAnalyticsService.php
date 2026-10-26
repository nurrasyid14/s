<?php

namespace App\Services;

use DateTimeImmutable;
use DateTimeZone;
use RuntimeException;

class WeeklyAnalyticsService
{
    private const TIMEZONE = 'Asia/Jakarta';
    private const AGGREGATE_DAYS = [7, 30, 90, 180];

    public function refreshRollingWindows(): array
    {
        $timezone = new DateTimeZone(self::TIMEZONE);
        $now = new DateTimeImmutable('now', $timezone);
        $utc = new DateTimeZone('UTC');
        $oldestStart = $now->modify('-180 days');
        $db = \Config\Database::connect();
        $complaintsTable = $db->prefixTable('complaints');
        $analysisTable = $db->prefixTable('complaint_analysis');
        $rows = $db->query(
            sprintf(
                'SELECT c.created_at, c.status, c.assigned_unit, ca.category, ca.sentiment
             FROM %s c
             LEFT JOIN (
                 SELECT complaint_id, MAX(id) AS latest_id
                 FROM %s
                 GROUP BY complaint_id
             ) latest ON latest.complaint_id = c.id
             LEFT JOIN %s ca ON ca.id = latest.latest_id
             WHERE c.created_at >= ? AND c.created_at < ?',
                $complaintsTable,
                $analysisTable,
                $analysisTable
            ),
            [
                $oldestStart->setTimezone($utc)->format('Y-m-d H:i:s'),
                $now->setTimezone($utc)->format('Y-m-d H:i:s'),
            ]
        )->getResultArray();

        $aggregates = [];
        foreach (self::AGGREGATE_DAYS as $days) {
            $start = $now->modify("-{$days} days");
            $windowRows = array_values(array_filter(
                $rows,
                static function (array $row) use ($start, $utc): bool {
                    if (empty($row['created_at'])) {
                        return false;
                    }

                    try {
                        $createdAt = new DateTimeImmutable($row['created_at'], $utc);
                    } catch (\Throwable $e) {
                        return false;
                    }

                    return $createdAt >= $start->setTimezone($utc);
                }
            ));
            $aggregates[(string) $days] = $this->buildSnapshot($windowRows, $days, $start, $now);
        }

        $snapshot = [
            'schema_version' => 2,
            'generated_at' => $now->format(DATE_ATOM),
            'timezone' => self::TIMEZONE,
            'aggregates' => $aggregates,
        ];
        $file = $this->writeSnapshot($snapshot);

        return ['snapshot' => $snapshot, 'file' => $file];
    }

    public function latestSnapshot(int $days): ?array
    {
        if (!in_array($days, self::AGGREGATE_DAYS, true)) {
            throw new \InvalidArgumentException('Unsupported analytics aggregation window.');
        }

        $files = glob($this->outputDirectory() . DIRECTORY_SEPARATOR . 'analytics-*.json');
        if ($files === false || $files === []) {
            return null;
        }

        rsort($files, SORT_STRING);
        $contents = file_get_contents($files[0]);
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
            'schema_version' => $snapshot['schema_version'],
            'generated_at' => $snapshot['generated_at'],
            'timezone' => $snapshot['timezone'],
        ];
    }

    private function buildSnapshot(
        array $rows,
        int $days,
        DateTimeImmutable $start,
        DateTimeImmutable $end
    ): array {
        $topicCounts = [];
        $unitCounts = [];
        $statusCounts = [];
        $sentimentCounts = [
            'negative' => 0,
            'neutral' => 0,
            'positive' => 0,
            'unknown' => 0,
        ];

        foreach ($rows as $row) {
            $topic = trim((string) ($row['category'] ?? ''));
            $topic = $topic !== '' ? $topic : 'Belum diklasifikasi';
            $topicCounts[$topic] = ($topicCounts[$topic] ?? 0) + 1;

            $unit = trim((string) ($row['assigned_unit'] ?? ''));
            $unit = $unit !== '' ? $unit : 'Belum ditugaskan';
            $unitCounts[$unit] = ($unitCounts[$unit] ?? 0) + 1;

            $status = trim((string) ($row['status'] ?? ''));
            $status = $status !== '' ? $status : 'unknown';
            $statusCounts[$status] = ($statusCounts[$status] ?? 0) + 1;

            $sentiment = strtolower(trim((string) ($row['sentiment'] ?? '')));
            $sentiment = match ($sentiment) {
                'negative', 'negatif' => 'negative',
                'neutral', 'netral' => 'neutral',
                'positive', 'positif' => 'positive',
                default => 'unknown',
            };
            $sentimentCounts[$sentiment]++;
        }

        $topics = $this->topCounts($topicCounts, 5);
        $topTopic = $topics[0] ?? null;
        $total = count($rows);
        $negativePct = $total > 0
            ? round(($sentimentCounts['negative'] / $total) * 100, 1)
            : 0.0;

        if ($total === 0) {
            $summaryId = 'Tidak ada aduan yang tercatat dalam periode ini.';
            $summaryEn = 'No complaints were recorded during this period.';
        } else {
            $topicName = $topTopic['label'] ?? 'Belum diklasifikasi';
            $topicCount = $topTopic['count'] ?? 0;
            $summaryId = sprintf(
                'Dalam %d hari terakhir (%s sampai %s) tercatat %d aduan. Topik terbanyak adalah %s (%d aduan), dengan sentimen negatif sebesar %.1f%%.',
                $days,
                $start->format('d-m-Y H:i'),
                $end->format('d-m-Y H:i'),
                $total,
                $topicName,
                $topicCount,
                $negativePct
            );
            $summaryEn = sprintf(
                '%d complaints were recorded in the last %d days (%s to %s). The most common topic was %s (%d complaints), and %.1f%% of records had negative sentiment.',
                $total,
                $days,
                $start->format('Y-m-d H:i'),
                $end->format('Y-m-d H:i'),
                $topicName,
                $topicCount,
                $negativePct
            );
        }

        return [
            'aggregate_days' => $days,
            'period' => [
                'start_at' => $start->format(DATE_ATOM),
                'end_at' => $end->format(DATE_ATOM),
            ],
            'record_count' => $total,
            'summary' => [
                'id' => $summaryId,
                'en' => $summaryEn,
            ],
            'popular_topics' => $topics,
            'sentiment' => $sentimentCounts,
            'top_units' => $this->topCounts($unitCounts, 5),
            'statuses' => $this->topCounts($statusCounts, 20),
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
        if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) {
            throw new RuntimeException('Unable to create weekly analytics lake directory.');
        }

        $generatedAt = new DateTimeImmutable($snapshot['generated_at']);
        $filename = sprintf('analytics-%s-%s.json', $generatedAt->format('Ymd\THis'), bin2hex(random_bytes(3)));
        $target = $directory . DIRECTORY_SEPARATOR . $filename;
        $temporary = $target . '.tmp';
        $json = json_encode($snapshot, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR) . PHP_EOL;

        if (file_put_contents($temporary, $json, LOCK_EX) !== strlen($json)) {
            @unlink($temporary);
            throw new RuntimeException('Unable to write weekly analytics snapshot.');
        }
        if (!rename($temporary, $target)) {
            @unlink($temporary);
            throw new RuntimeException('Unable to publish weekly analytics snapshot to the data lake.');
        }

        return $target;
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
