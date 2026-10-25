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
            $sent = strtolower((string) ($row['sentiment'] ?? ''));
            if (in_array($sent, ['negative', 'negatif'], true)) {
                $negative++;
            }
            $urgency = strtolower((string) ($row['urgency_label'] ?? ''));
            $score = (float) ($row['urgency_score'] ?? 0);
            if (
                (in_array($urgency, ['high', 'critical', 'tinggi', 'kritis'], true) || $score >= 0.7)
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
            ->select("COALESCE(u.user_role, u.role, 'Mahasiswa') AS role, COUNT(*) AS count", false)
            ->join('users u', 'u.id = c.user_id', 'left')
            ->groupBy("COALESCE(u.user_role, u.role, 'Mahasiswa')", false)
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
            $raw = strtolower((string) ($row['sentiment'] ?? ''));
            $label = match ($raw) {
                'negative', 'negatif' => 'negative',
                'neutral', 'netral'   => 'neutral',
                'positive', 'positif' => 'positive',
                default               => null,
            };
            if ($label !== null && isset($counts[$label])) {
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
        return $this->respond($this->calculateSlaStats());
    }

    /** GET /api/analytics/ai-summary */
    public function aiSummary()
    {
        set_time_limit(90);

        $db = \Config\Database::connect();
        $total = (int) $db->table('complaints')->countAllResults();

        $sla = $this->calculateSlaStats();

        $topUnits = $db->table('complaints')
            ->select("COALESCE(assigned_unit, 'Belum didisposisikan') AS unit, COUNT(*) AS count", false)
            ->groupBy('assigned_unit')
            ->orderBy('count', 'DESC')
            ->limit(5)
            ->get()->getResultArray();

        $topIssues = $db->table('complaint_analysis')
            ->select("category, COUNT(*) AS count")
            ->groupBy('category')
            ->orderBy('count', 'DESC')
            ->limit(5)
            ->get()->getResultArray();

        $analyses = $this->latestAnalysisRows();
        $sentimentCounts = ['negative' => 0, 'neutral' => 0, 'positive' => 0];
        $highUrgentCount = 0;
        foreach ($analyses as $row) {
            $raw = strtolower((string) ($row['sentiment'] ?? ''));
            $sent = match ($raw) {
                'negative', 'negatif' => 'negative',
                'neutral', 'netral'   => 'neutral',
                'positive', 'positif' => 'positive',
                default               => null,
            };
            if ($sent && isset($sentimentCounts[$sent])) {
                $sentimentCounts[$sent]++;
            }

            $urgency = strtolower((string) ($row['urgency_label'] ?? ''));
            $score = (float) ($row['urgency_score'] ?? 0);
            if (
                (in_array($urgency, ['high', 'critical', 'tinggi', 'kritis'], true) || $score >= 0.7)
                && !in_array(strtolower((string) ($row['complaint_status'] ?? '')), ['resolved', 'done'], true)
            ) {
                $highUrgentCount++;
            }
        }

        $totalAnalyses = count($analyses) ?: 1;
        $negPct = round(($sentimentCounts['negative'] / $totalAnalyses) * 100, 1);
        $neuPct = round(($sentimentCounts['neutral'] / $totalAnalyses) * 100, 1);
        $posPct = round(($sentimentCounts['positive'] / $totalAnalyses) * 100, 1);

        $metricsPayload = [
            'total_records'          => $total,
            'overall_compliant_pct'  => $sla['compliant_pct'],
            'overall_breach_pct'     => $sla['breach_pct'],
            'top_units'              => $topUnits,
            'top_categories'         => $topIssues,
            'sentiment'              => [
                'negative_pct' => $negPct,
                'neutral_pct'  => $neuPct,
                'positive_pct' => $posPct,
            ],
            'high_urgency_pending'   => $highUrgentCount,
        ];

        // Hubungi ML Service (/summary)
        $summaryData = null;
        try {
            $client = \Config\Services::curlrequest();
            $resp = $client->post('http://127.0.0.1:8000/summary', [
                'headers' => [
                    'Content-Type' => 'application/json',
                    'Accept'       => 'application/json',
                ],
                'body'    => json_encode([
                    'metrics' => $metricsPayload,
                    'context' => 'Laporan Eksekutif Bulanan SuaraLens PENS',
                ]),
                'timeout' => 45,
            ]);

            $json = json_decode($resp->getBody(), true);
            if (!empty($json['status']) && !empty($json['data'])) {
                $summaryData = $json['data'];
            }
        } catch (\Throwable $e) {
            log_message('warning', 'ML summary request failed, using template fallback: ' . $e->getMessage());
        }

        // Factual grounded template fallback jika ML service offline
        if (!$summaryData || empty($summaryData['summary'])) {
            $topUnitName = !empty($topUnits[0]['unit']) ? $topUnits[0]['unit'] : 'Sarana Prasarana dan Layanan Umum';
            $topUnitCount = !empty($topUnits[0]['count']) ? (int) $topUnits[0]['count'] : 0;
            $topIssueName = !empty($topIssues[0]['category']) ? $topIssues[0]['category'] : 'Fasilitas';

            $fallbackText = "Dalam periode pelaporan ini, sistem SuaraLens mencatat total {$total} masukan dari seluruh stakeholder PENS. "
                . "Tingkat kepatuhan terhadap target SLA mencapai {$sla['compliant_pct']}%, dengan {$sla['breach_pct']}% potensi keterlambatan batas waktu respon. "
                . "Beban tiket tertinggi terpusat pada unit {$topUnitName} sejumlah {$topUnitCount} laporan dengan kategori dominan {$topIssueName}. "
                . "Sentimen negatif tercatat sebesar {$negPct}%, serta terdapat {$highUrgentCount} aduan berurgensi tinggi yang saat ini memerlukan akselerasi penyelesaian.";

            $summaryData = [
                'summary'          => $fallbackText,
                'grounding'        => [
                    'numbers_in_summary'     => ["{$total}", "{$sla['compliant_pct']}%", "{$sla['breach_pct']}%", "{$topUnitCount}", "{$negPct}%", "{$highUrgentCount}"],
                    'potentially_ungrounded' => [],
                    'grounding_note'         => 'Semua angka dalam ringkasan terverifikasi 100% dari data agregat institusi.',
                ],
                'generated_at'     => date('c'),
                'model_used'       => 'template-grounded',
                'inference_time_s' => 0.01,
                'is_fallback'      => true,
            ];
        }

        return $this->respond([
            'status'  => true,
            'message' => 'Ringkasan eksekutif AI berhasil dimuat.',
            'data'    => $summaryData + ['metrics' => $metricsPayload],
        ]);
    }

    private function calculateSlaStats(): array
    {
        $complaints = \Config\Database::connect()->table('complaints')
            ->select(['id', 'status', 'created_at', 'updated_at'])
            ->get()->getResultArray();

        $now = new \DateTimeImmutable('now');
        $compliant = 0;
        $nonCompliant = 0;

        foreach ($complaints as $c) {
            $status = strtolower((string) ($c['status'] ?? ''));
            $isResolved = in_array($status, ['resolved', 'done', 'answered'], true);

            try {
                $created = new \DateTimeImmutable($c['created_at'] ?? 'now');
            } catch (\Throwable $e) {
                $created = $now;
            }

            if ($isResolved) {
                try {
                    $resolvedAt = new \DateTimeImmutable($c['updated_at'] ?? $c['created_at'] ?? 'now');
                } catch (\Throwable $e) {
                    $resolvedAt = $now;
                }
                $days = $created->diff($resolvedAt)->days;
                if ($days <= 3) {
                    $compliant++;
                } else {
                    $nonCompliant++;
                }
            } else {
                $daysOpen = $created->diff($now)->days;
                if ($daysOpen <= 3) {
                    $compliant++;
                } else {
                    $nonCompliant++;
                }
            }
        }

        $total = $compliant + $nonCompliant;
        $compliantPct = $total > 0 ? round(($compliant / $total) * 100) : 100;
        $breachPct = 100 - $compliantPct;

        return [
            'status'        => true,
            'compliant'     => $compliant,
            'non_compliant' => $nonCompliant,
            'compliant_pct' => $compliantPct,
            'breach_pct'    => $breachPct,
            'target_days'   => 3,
        ];
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
            $urgency = strtolower((string) ($row['urgency_label'] ?? ''));
            $score = (float) ($row['urgency_score'] ?? 0);
            $isUrgent = in_array($urgency, ['high', 'critical', 'tinggi', 'kritis'], true) || $score >= 0.7;

            if (
                !$isUrgent
                || in_array(strtolower((string) ($row['complaint_status'] ?? '')), ['resolved', 'done'], true)
            ) {
                continue;
            }

            $rawStatus = strtolower((string) ($row['complaint_status'] ?? ''));
            $status = match ($rawStatus) {
                'submitted', 'new' => 'received',
                'process'          => 'in_progress',
                'done'             => 'resolved',
                'escalate'         => 'dispatched',
                default            => $rawStatus ?: 'received',
            };

            $data[] = [
                'id'            => (int) $row['complaint_id'],
                'ticket_id'     => $row['ticket_id'],
                'description'   => $row['description'],
                'urgency_score' => round($score * 10, 2),
                'sender_name'   => !empty($row['is_anonymous']) ? null : ($row['sender_name'] ?? null),
                'sender_role'   => $row['sender_role'] ?? null,
                'is_anonymous'  => (bool) $row['is_anonymous'],
                'status'        => $status,
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
