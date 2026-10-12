<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;

class AnalyticsController extends ResourceController
{
    protected $format = 'json';

    /** GET /api/analytics/summary */
    public function summary()
    {
        $db = \Config\Database::connect();
        $now = new \DateTimeImmutable('now');
        $monthStart = $now->modify('first day of this month')->setTime(0, 0);
        $previousStart = $monthStart->modify('-1 month');

        $total = (int) $db->table('complaints')->countAllResults();
        $currentMonth = (int) $db->table('complaints')
            ->where('created_at >=', $monthStart->format('Y-m-d H:i:s'))
            ->countAllResults();
        $previousMonth = (int) $db->table('complaints')
            ->where('created_at >=', $previousStart->format('Y-m-d H:i:s'))
            ->where('created_at <', $monthStart->format('Y-m-d H:i:s'))
            ->countAllResults();

        $analyses = $this->latestAnalysisRows();
        $negative = 0;
        $highPending = 0;
        foreach ($analyses as $row) {
            if (strtolower((string) ($row['sentiment'] ?? '')) === 'negative') {
                $negative++;
            }
            if (
                in_array(strtolower((string) ($row['urgency_label'] ?? '')), ['high', 'critical'], true)
                && !in_array(strtolower((string) ($row['complaint_status'] ?? '')), ['resolved', 'done'], true)
            ) {
                $highPending++;
            }
        }

        $negativePct = count($analyses) > 0 ? round($negative / count($analyses), 4) : 0.0;

        return $this->respond([
            'total_complaints'          => $total,
            'total_complaints_trend'    => $this->percentChange($currentMonth, $previousMonth),
            'avg_sla_days'              => null,
            'avg_sla_trend'             => null,
            'negative_sentiment_pct'    => $negativePct,
            'negative_sentiment_trend'  => null,
            'high_urgency_pending'      => $highPending,
            'sla_available'             => false,
            'sla_message'               => 'Metrik SLA belum tersedia karena skema belum menyimpan tenggat dan waktu penyelesaian aduan.',
        ]);
    }

    /** GET /api/analytics/trend?period=daily|weekly|monthly */
    public function trend()
    {
        $period = strtolower((string) ($this->request->getGet('period') ?? 'monthly'));
        if (!in_array($period, ['daily', 'weekly', 'monthly'], true)) {
            return $this->failValidationErrors('period harus daily, weekly, atau monthly.');
        }

        $rows = \Config\Database::connect()->table('complaints')
            ->select('created_at')
            ->where('created_at IS NOT NULL', null, false)
            ->get()->getResultArray();

        $counts = [];
        $cutoff = (new \DateTimeImmutable('now'))->modify('-12 months');
        foreach ($rows as $row) {
            try {
                $date = new \DateTimeImmutable($row['created_at']);
            } catch (\Throwable $e) {
                continue;
            }
            if ($date < $cutoff) {
                continue;
            }

            $key = match ($period) {
                'daily'   => $date->format('Y-m-d'),
                'weekly'  => $date->format('o-\\WW'),
                default   => $date->format('Y-m'),
            };
            $counts[$key] = ($counts[$key] ?? 0) + 1;
        }
        ksort($counts);

        $data = [];
        foreach ($counts as $date => $count) {
            $data[] = ['date' => $date, 'count' => $count];
        }

        return $this->respond($data);
    }

    /** GET /api/analytics/distribution */
    public function distribution()
    {
        $rows = \Config\Database::connect()->table('complaints c')
            ->select("COALESCE(u.user_role, u.role) AS role, COUNT(*) AS count", false)
            ->join('users u', 'u.id = c.user_id', 'left')
            ->groupBy('u.role')
            ->get()->getResultArray();

        $total = array_sum(array_map(static fn ($r) => (int) $r['count'], $rows));
        $data = array_map(static function ($row) use ($total) {
            $count = (int) $row['count'];
            return [
                'role'  => $row['role'] ?? 'unknown',
                'count' => $count,
                'pct'   => $total > 0 ? round($count / $total, 4) : 0,
            ];
        }, $rows);

        return $this->respond($data);
    }

    /** GET /api/analytics/sentiment */
    public function sentiment()
    {
        $counts = ['negative' => 0, 'neutral' => 0, 'positive' => 0];
        foreach ($this->latestAnalysisRows() as $row) {
            $label = strtolower((string) ($row['sentiment'] ?? ''));
            if (isset($counts[$label])) {
                $counts[$label]++;
            }
        }

        $labels = [
            'negative' => ['Negatif', 'Negative', '#ef4444'],
            'neutral'  => ['Netral', 'Neutral', '#f59e0b'],
            'positive' => ['Positif', 'Positive', '#10b981'],
        ];
        $data = [];
        foreach ($labels as $key => [$name, $nameEn, $color]) {
            $data[] = compact('name', 'nameEn', 'color') + ['value' => $counts[$key]];
        }

        return $this->respond($data);
    }

    /** GET /api/analytics/issues */
    public function issues()
    {
        $counts = [];
        foreach ($this->latestAnalysisRows() as $row) {
            $category = (string) ($row['category'] ?? 'Belum diklasifikasi');
            $counts[$category] = ($counts[$category] ?? 0) + 1;
        }
        arsort($counts);

        $data = [];
        foreach ($counts as $category => $count) {
            $data[] = ['category' => $category, 'count' => $count];
        }

        return $this->respond($data);
    }

    /** GET /api/analytics/sla */
    public function sla()
    {
        return $this->respond([
            'status'        => false,
            'message'       => 'SLA belum dapat dihitung: backend belum memiliki target SLA dan waktu penyelesaian per aduan.',
            'compliant'     => null,
            'non_compliant' => null,
        ], 501);
    }

    /** GET /api/analytics/units */
    public function units()
    {
        $rows = \Config\Database::connect()->table('complaints')
            ->select("COALESCE(assigned_unit, 'Belum ditugaskan') AS unit, COUNT(*) AS count", false)
            ->groupBy('assigned_unit')
            ->orderBy('count', 'DESC')
            ->get()->getResultArray();

        return $this->respond(array_map(static fn ($row) => [
            'unit'  => $row['unit'],
            'count' => (int) $row['count'],
        ], $rows));
    }

    /** GET /api/analytics/urgent */
    public function urgent()
    {
        $data = [];
        foreach ($this->latestAnalysisRows() as $row) {
            if (
                !in_array(strtolower((string) ($row['urgency_label'] ?? '')), ['high', 'critical'], true)
                || in_array(strtolower((string) ($row['complaint_status'] ?? '')), ['resolved', 'done'], true)
            ) {
                continue;
            }

            $data[] = [
                'id'            => (int) $row['complaint_id'],
                'ticket_id'     => $row['ticket_id'],
                'description'   => $row['description'],
                'urgency_score' => round((float) ($row['urgency_score'] ?? 0) * 10, 1),
                'sender_name'   => !empty($row['is_anonymous']) ? null : ($row['sender_name'] ?? null),
                'sender_role'   => $row['sender_role'] ?? null,
                'is_anonymous'  => (bool) $row['is_anonymous'],
                'status'        => $row['complaint_status'],
            ];
        }

        usort($data, static fn ($a, $b) => $b['urgency_score'] <=> $a['urgency_score']);
        return $this->respond(array_slice($data, 0, 10));
    }

    /** Latest analysis per complaint, with only the fields needed by analytics. */
    private function latestAnalysisRows(): array
    {
        $latest = '(SELECT complaint_id, MAX(id) AS latest_id FROM complaint_analysis GROUP BY complaint_id) latest';

        return \Config\Database::connect()->table('complaint_analysis ca')
            ->select([
                'ca.complaint_id', 'ca.category', 'ca.urgency_label', 'ca.urgency_score', 'ca.sentiment',
                'c.ticket_id', 'c.description', 'c.status AS complaint_status', 'c.is_anonymous',
                'u.name AS sender_name', 'u.user_role AS sender_role',
            ])
            ->join($latest, 'latest.latest_id = ca.id', 'inner', false)
            ->join('complaints c', 'c.id = ca.complaint_id', 'inner')
            ->join('users u', 'u.id = c.user_id', 'left')
            ->get()->getResultArray();
    }

    private function percentChange(int $current, int $previous): ?float
    {
        if ($previous === 0) {
            return null;
        }
        return round((($current - $previous) / $previous) * 100, 2);
    }
}
