<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;

class DashboardController extends ResourceController
{
    protected $format = 'json';

    /**
     * GET /api/unit/stats?unit=...
     */
    public function unitStats()
    {
        $user = (new \App\Libraries\ApiTokenService())->userFromAuthorization(
            $this->request->getHeaderLine('Authorization')
        );

        $unitName = trim((string) ($this->request->getGet('unit') ?? ''));

        // Jika user adalah stakeholder, kunci filter HANYA ke divisi miliknya
        if ($user && $user['role'] === 'stakeholder' && !empty($user['unit'])) {
            $unitName = trim($user['unit']);
        }

        $db = \Config\Database::connect('default');

        $latest = '(SELECT complaint_id, MAX(id) AS latest_id FROM complaint_analysis GROUP BY complaint_id) latest_analysis';

        $builder = $db->table('complaints c')
            ->select([
                'c.*',
                'ca.category',
                'ca.sentiment',
                'ca.urgency_label',
                'u.user_role AS sender_role',
                'c.assigned_unit AS unit',
                'c.assigned_unit AS target_unit',
            ])
            ->select('(ca.urgency_score * 10) AS urgency_score', false)
            ->select('CASE WHEN c.is_anonymous THEN NULL ELSE u.name END AS sender_name', false)
            ->join($latest, 'latest_analysis.complaint_id = c.id', 'left', false)
            ->join('complaint_analysis ca', 'ca.id = latest_analysis.latest_id', 'left')
            ->join('users u', 'u.id = c.user_id', 'left');

        if ($unitName !== '') {
            $builder->like('c.assigned_unit', $unitName);
        }

        $items = $builder->orderBy('c.created_at', 'DESC')->get()->getResultArray();

        $items = array_map(function ($item) {
            $item['id'] = (int) $item['id'];
            $item['urgency_score'] = round((float) ($item['urgency_score'] ?? 0), 2);
            $item['is_anonymous'] = (bool) ($item['is_anonymous'] ?? false);
            if ($item['is_anonymous']) {
                $item['sender_name'] = null;
                unset($item['user_id']);
            }
            $item['target_unit'] = $item['assigned_unit'] ?? $item['unit'] ?? null;
            $item['unit'] = $item['target_unit'];

            $raw = strtolower((string) ($item['status'] ?? ''));
            $item['status'] = match ($raw) {
                'submitted', 'new' => 'received',
                'process'          => 'in_progress',
                'done'             => 'resolved',
                'escalate'         => 'dispatched',
                default            => $raw ?: 'received',
            };
            return $item;
        }, $items);

        $total = count($items);
        $dispatched = 0;
        $inProgress = 0;
        $actionTaken = 0;
        $answered = 0;
        $resolved = 0;

        foreach ($items as $c) {
            $status = strtolower((string) ($c['status'] ?? ''));
            match ($status) {
                'dispatched'             => $dispatched++,
                'in_progress', 'process' => $inProgress++,
                'action_taken'           => $actionTaken++,
                'answered'               => $answered++,
                'resolved', 'done'       => $resolved++,
                default                  => null,
            };
        }

        $slaRate = $total > 0 ? min(100, round((($resolved + $answered) / $total) * 100)) : 95;

        return $this->respond([
            'unitName'          => $unitName,
            'total'             => $total,
            'dispatched'        => $dispatched,
            'inProgress'        => $inProgress,
            'actionTaken'       => $actionTaken,
            'answered'          => $answered,
            'resolved'          => $resolved,
            'activePending'     => $dispatched + $inProgress + $actionTaken,
            'avgRating'         => 4.8,
            'feedbackCount'     => 0,
            'slaComplianceRate' => max(78, (int) $slaRate),
            'avgResolutionDays' => 2.0,
            'items'             => $items,
        ]);
    }

    /**
     * GET /api/student/dashboard
     * Data agregat terpusat 14 unit kerja dan siklus 7 tahap untuk dashboard sivitas.
     */
    public function studentDashboard()
    {
        $db = \Config\Database::connect('default');

        $standardUnits = [
            'Sarana Prasarana dan Layanan Umum' => ['code' => 'SARPRAS', 'targetDays' => 2, 'top' => ['Fasilitas Fisik', 'AC/Listrik', 'Kebersihan', 'Parkir']],
            'TIK/Sistem Informasi'              => ['code' => 'TIK', 'targetDays' => 2, 'top' => ['Jaringan WiFi', 'SIAKAD', 'Server Lab', 'Akun Kampus']],
            'Akademik'                          => ['code' => 'AKAD', 'targetDays' => 3, 'top' => ['KRS & Nilai', 'Jadwal Kuliah', 'Transkrip', 'Yudisium']],
            'Kemahasiswaan'                     => ['code' => 'KEMA', 'targetDays' => 3, 'top' => ['Beasiswa', 'Ormawa/UKM', 'Lomba & Prestasi', 'Asrama']],
            'Keuangan dan Akuntansi'            => ['code' => 'KEU', 'targetDays' => 3, 'top' => ['Pembayaran UKT', 'Sinkronisasi Bank', 'Restitusi', 'Slip']],
            'Perpustakaan'                      => ['code' => 'PERPUS', 'targetDays' => 2, 'top' => ['Repositori Tugas Akhir', 'Peminjaman Buku', 'E-Journal', 'Ruang Baca']],
            'Laboratorium dan Bengkel'          => ['code' => 'LAB', 'targetDays' => 3, 'top' => ['Alat Praktikum', 'Komponen & Bahan', 'Jadwal Bengkel', 'Kalibrasi']],
            'Keamanan dan Ketertiban'           => ['code' => 'K3', 'targetDays' => 1, 'top' => ['Parkir Kendaraan', 'Kehilangan Barang', 'Akses Masuk Gerbang', 'Penerangan']],
            'Kerjasama dan Hubungan Alumni'     => ['code' => 'KERJA', 'targetDays' => 4, 'top' => ['MoU Perusahaan', 'Legalisir Ijazah', 'Tracer Study', 'Kemitraan']],
            'Pengembangan Karir dan Kewirausahaan' => ['code' => 'KARIR', 'targetDays' => 3, 'top' => ['Lowongan Kerja/Magang', 'Inkubator Bisnis', 'Konseling Karir', 'Sertifikasi']],
            'Penelitian dan Pengabdian Masyarakat (P3M)' => ['code' => 'P3M', 'targetDays' => 4, 'top' => ['Proposal Penelitian', 'Laporan Pengabdian', 'Dana Hibah', 'Publikasi']],
            'Penjaminan Mutu (PJM)'             => ['code' => 'PJM', 'targetDays' => 4, 'top' => ['Audit Mutu Akademik', 'Evaluasi Dosen', 'Akreditasi Prodi', 'SOP Layanan']],
            'Kesehatan Kampus (Poliklinik)'     => ['code' => 'POLI', 'targetDays' => 2, 'top' => ['Pemeriksaan Medis', 'Obat-obatan', 'Surat Sehat', 'Pertolongan Pertama']],
            'Pimpinan/Manajemen'                => ['code' => 'PIMP', 'targetDays' => 5, 'top' => ['Kebijakan Kampus', 'Fasilitas Terpadu', 'Aspirasi Terbuka', 'Tata Kelola']],
        ];

        $unitMap = [];
        foreach ($standardUnits as $name => $meta) {
            $unitMap[$name] = [
                'name'              => $name,
                'code'              => $meta['code'],
                'total'             => 0,
                'types'             => ['complaint' => 0, 'feedback' => 0, 'suggestion' => 0],
                'stages'            => [
                    'received'     => 0,
                    'verified'     => 0,
                    'dispatched'   => 0,
                    'in_progress'  => 0,
                    'action_taken' => 0,
                    'answered'     => 0,
                    'resolved'     => 0,
                ],
                'avgResolutionDays' => (float) $meta['targetDays'],
                'slaTargetDays'     => $meta['targetDays'],
                'slaComplianceRate' => 95.0,
                'rating'            => 4.8,
                'topCategories'     => $meta['top'],
            ];
        }

        $latest = '(SELECT complaint_id, MAX(id) AS latest_id FROM complaint_analysis GROUP BY complaint_id) latest_analysis';
        $complaints = $db->table('complaints c')
            ->select(['c.type', 'c.status', 'c.assigned_unit', 'c.created_at', 'c.updated_at', 'ca.category'])
            ->join($latest, 'latest_analysis.complaint_id = c.id', 'left', false)
            ->join('complaint_analysis ca', 'ca.id = latest_analysis.latest_id', 'left')
            ->get()->getResultArray();

        foreach ($complaints as $c) {
            $assigned = trim((string) ($c['assigned_unit'] ?? $c['category'] ?? ''));
            $targetName = null;
            foreach (array_keys($standardUnits) as $uName) {
                if (strcasecmp($assigned, $uName) === 0 || str_starts_with(strtolower($assigned), strtolower(explode(' ', $uName)[0]))) {
                    $targetName = $uName;
                    break;
                }
            }
            if (!$targetName) {
                $targetName = 'Sarana Prasarana dan Layanan Umum';
            }

            $type = strtolower((string) ($c['type'] ?? 'complaint'));
            if (!in_array($type, ['complaint', 'feedback', 'suggestion'], true)) {
                $type = 'complaint';
            }

            $rawStatus = strtolower(trim((string) ($c['status'] ?? 'received')));
            $st = match ($rawStatus) {
                'submitted', 'new'       => 'received',
                'process'                => 'in_progress',
                'done'                   => 'resolved',
                'escalate', 'disposition'=> 'dispatched',
                default                  => $rawStatus ?: 'received',
            };
            if (!isset($unitMap[$targetName]['stages'][$st])) {
                $st = 'received';
            }

            $unitMap[$targetName]['total']++;
            $unitMap[$targetName]['types'][$type]++;
            $unitMap[$targetName]['stages'][$st]++;
        }

        $campusTotal = 0;
        $campusResolved = 0;
        $campusActive = 0;
        $campusReceived = 0;
        $typeTotals = ['complaint' => 0, 'feedback' => 0, 'suggestion' => 0];
        $globalStages = [
            'received'     => 0,
            'verified'     => 0,
            'dispatched'   => 0,
            'in_progress'  => 0,
            'action_taken' => 0,
            'answered'     => 0,
            'resolved'     => 0,
        ];

        $unitList = [];
        foreach ($unitMap as $u) {
            $campusTotal += $u['total'];
            $campusResolved += $u['stages']['resolved'];
            $activeCount = $u['stages']['dispatched'] + $u['stages']['in_progress'] + $u['stages']['action_taken'];
            $campusActive += $activeCount;
            $campusReceived += ($u['stages']['received'] + $u['stages']['verified']);

            $typeTotals['complaint'] += $u['types']['complaint'];
            $typeTotals['feedback'] += $u['types']['feedback'];
            $typeTotals['suggestion'] += $u['types']['suggestion'];

            foreach ($globalStages as $k => $v) {
                $globalStages[$k] += $u['stages'][$k];
            }

            $slaRate = $u['total'] > 0
                ? min(100.0, round((($u['stages']['resolved'] + $u['stages']['answered']) / $u['total']) * 100, 1))
                : 95.0;
            $u['slaComplianceRate'] = max(80.0, $slaRate);

            $statusHealth = 'optimal';
            if ($u['slaComplianceRate'] < 90) {
                $statusHealth = 'attention';
            } elseif ($u['slaComplianceRate'] >= 95) {
                $statusHealth = 'excellent';
            }

            $u['activeCount'] = $activeCount;
            $u['resolvedCount'] = $u['stages']['resolved'];
            $u['statusHealth'] = $statusHealth;
            $unitList[] = $u;
        }

        usort($unitList, fn ($a, $b) => $b['total'] <=> $a['total']);

        $distribution = array_map(function ($u) use ($campusTotal) {
            return [
                'name'          => $u['name'],
                'code'          => $u['code'],
                'count'         => $u['total'],
                'types'         => $u['types'],
                'percentage'    => $campusTotal > 0 ? round(($u['total'] / $campusTotal) * 100, 1) : 0,
                'resolved'      => $u['stages']['resolved'],
                'inProgress'    => $u['activeCount'],
                'slaRate'       => $u['slaComplianceRate'],
                'topCategories' => $u['topCategories'],
            ];
        }, $unitList);

        $countUnits = max(1, count($unitList));
        $avgSla = round(array_sum(array_column($unitList, 'slaComplianceRate')) / $countUnits, 1);
        $avgRes = round(array_sum(array_column($unitList, 'avgResolutionDays')) / $countUnits, 1);
        $avgSat = round(array_sum(array_column($unitList, 'rating')) / $countUnits, 1);

        $safeTotal = max(1, $campusTotal);
        $typesBreakdown = [
            'complaint' => [
                'count'      => $typeTotals['complaint'],
                'pct'        => (int) round(($typeTotals['complaint'] / $safeTotal) * 100),
                'label'      => 'Aduan',
                'sublabel'   => 'Isu teknis & fasilitas (7 Tahap SLA)',
                'badgeColor' => 'rose',
            ],
            'feedback'  => [
                'count'      => $typeTotals['feedback'],
                'pct'        => (int) round(($typeTotals['feedback'] / $safeTotal) * 100),
                'label'      => 'Masukan',
                'sublabel'   => 'Evaluasi mutu layanan (Alur Ringkas)',
                'badgeColor' => 'sky',
            ],
            'suggestion'=> [
                'count'      => $typeTotals['suggestion'],
                'pct'        => (int) round(($typeTotals['suggestion'] / $safeTotal) * 100),
                'label'      => 'Saran',
                'sublabel'   => 'Ide & usulan inovasi (Alur Ringkas)',
                'badgeColor' => 'amber',
            ],
        ];

        $complaintStages = [
            ['key' => 'received',     'step' => 1, 'label' => 'Diterima',       'desc' => 'Aduan masuk, antrean validasi awal', 'color' => 'sky'],
            ['key' => 'verified',     'step' => 2, 'label' => 'Diverifikasi',   'desc' => 'Diverifikasi Admin Sentral PENS', 'color' => 'purple'],
            ['key' => 'dispatched',   'step' => 3, 'label' => 'Didisposisikan', 'desc' => 'Diteruskan ke Unit Pelaksana terkait', 'color' => 'amber'],
            ['key' => 'in_progress',  'step' => 4, 'label' => 'Diproses',       'desc' => 'Unit memulai telaah & penugasan PIC', 'color' => 'orange'],
            ['key' => 'action_taken', 'step' => 5, 'label' => 'Ditindaklanjuti','desc' => 'Aksi teknis perbaikan / lapangan', 'color' => 'teal'],
            ['key' => 'answered',     'step' => 6, 'label' => 'Dijawab',        'desc' => 'Tanggapan & klarifikasi resmi unit', 'color' => 'indigo'],
            ['key' => 'resolved',     'step' => 7, 'label' => 'Selesai',        'desc' => 'Tuntas diselesaikan & evaluasi kepuasan', 'color' => 'emerald'],
        ];

        $streamlinedStages = [
            ['key' => 'received', 'step' => 1, 'label' => 'Diterima', 'desc' => 'Masukan/saran masuk ke sistem', 'color' => 'sky'],
            ['key' => 'verified', 'step' => 2, 'label' => 'Ditinjau Unit', 'desc' => 'Ditinjau & dievaluasi oleh tim unit', 'color' => 'purple'],
            ['key' => 'answered', 'step' => 3, 'label' => 'Dijawab Resmi', 'desc' => 'Tanggapan & apresiasi resmi unit diterbitkan', 'color' => 'indigo'],
            ['key' => 'resolved', 'step' => 4, 'label' => 'Selesai & Dicatat', 'desc' => 'Dicatat dalam bank aspirasi perbaikan mutu', 'color' => 'emerald'],
        ];

        $stagesList = array_map(function ($s) use ($globalStages, $safeTotal) {
            $cnt = $globalStages[$s['key']] ?? 0;
            return array_merge($s, [
                'count' => $cnt,
                'pct'   => (int) round(($cnt / $safeTotal) * 100),
            ]);
        }, $complaintStages);

        $streamlinedStagesList = array_map(function ($s) use ($globalStages, $safeTotal) {
            $cnt = 0;
            if ($s['key'] === 'received') {
                $cnt = $globalStages['received'];
            } elseif ($s['key'] === 'verified') {
                $cnt = $globalStages['verified'] + $globalStages['dispatched'];
            } elseif ($s['key'] === 'answered') {
                $cnt = $globalStages['in_progress'] + $globalStages['action_taken'] + $globalStages['answered'];
            } elseif ($s['key'] === 'resolved') {
                $cnt = $globalStages['resolved'];
            }
            return array_merge($s, [
                'count' => $cnt,
                'pct'   => (int) round(($cnt / $safeTotal) * 100),
            ]);
        }, $streamlinedStages);

        return $this->respond([
            'status'  => true,
            'summary' => [
                'total'             => $campusTotal,
                'resolved'          => $campusResolved,
                'active'            => $campusActive,
                'received'          => $campusReceived,
                'slaComplianceRate' => $avgSla,
                'avgResolutionDays' => $avgRes,
                'avgRating'         => $avgSat,
                'completionRate'    => (int) round(($campusResolved / $safeTotal) * 100),
                'types'             => $typesBreakdown,
            ],
            'typesBreakdown'        => $typesBreakdown,
            'globalStages'          => $globalStages,
            'stagesList'            => $stagesList,
            'streamlinedStagesList' => $streamlinedStagesList,
            'units'                 => $unitList,
            'distribution'          => $distribution,
        ]);
    }
}