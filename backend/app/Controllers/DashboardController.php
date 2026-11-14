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

        // Semua metrik dihitung dari data nyata; tanpa data hasilnya 0.
        $slaRate = $total > 0 ? min(100, round((($resolved + $answered) / $total) * 100)) : 0;

        return $this->respond([
            'unitName'          => $unitName,
            'total'             => $total,
            'dispatched'        => $dispatched,
            'inProgress'        => $inProgress,
            'actionTaken'       => $actionTaken,
            'answered'          => $answered,
            'resolved'          => $resolved,
            'activePending'     => $dispatched + $inProgress + $actionTaken,
            'avgRating'         => 0.0,
            'feedbackCount'     => 0,
            'slaComplianceRate' => (int) $slaRate,
            'avgResolutionDays' => $this->averageResolutionDays($items),
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

        $emptyStages = [
            'received'     => 0,
            'verified'     => 0,
            'dispatched'   => 0,
            'in_progress'  => 0,
            'action_taken' => 0,
            'answered'     => 0,
            'resolved'     => 0,
        ];
        // Tahap dipecah per jenis (aduan/masukan/saran) agar filter jenis di dashboard akurat
        $emptyTypeStages = ['complaint' => $emptyStages, 'feedback' => $emptyStages, 'suggestion' => $emptyStages];
        $globalTypeStages = $emptyTypeStages;

        $unitMap = [];
        foreach ($standardUnits as $name => $meta) {
            $unitMap[$name] = [
                'name'              => $name,
                'code'              => $meta['code'],
                'total'             => 0,
                'types'             => ['complaint' => 0, 'feedback' => 0, 'suggestion' => 0],
                'typeStages'        => $emptyTypeStages,
                'stages'            => $emptyStages,
                'avgResolutionDays' => 0.0,
                'slaTargetDays'     => $meta['targetDays'],
                'slaComplianceRate' => 0.0,
                'rating'            => 0.0,
                'topCategories'     => [],
            ];
        }

        // Akumulator per unit: durasi penyelesaian (detik) dan jumlah kategori
        $resolutionSecs = [];
        $categoryCounts = [];

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
            $unitMap[$targetName]['typeStages'][$type][$st]++;
            $globalTypeStages[$type][$st]++;

            $category = trim((string) ($c['category'] ?? ''));
            if ($category !== '') {
                $categoryCounts[$targetName][$category] = ($categoryCounts[$targetName][$category] ?? 0) + 1;
            }

            if ($st === 'resolved' && !empty($c['created_at']) && !empty($c['updated_at'])) {
                $secs = strtotime($c['updated_at']) - strtotime($c['created_at']);
                if ($secs > 0) {
                    $resolutionSecs[$targetName][] = $secs;
                }
            }
        }

        foreach ($unitMap as $uName => &$uData) {
            if (!empty($resolutionSecs[$uName])) {
                $uData['avgResolutionDays'] = round(array_sum($resolutionSecs[$uName]) / count($resolutionSecs[$uName]) / 86400, 1);
            }
            if (!empty($categoryCounts[$uName])) {
                arsort($categoryCounts[$uName]);
                $uData['topCategories'] = array_slice(array_keys($categoryCounts[$uName]), 0, 4);
            }
        }
        unset($uData);

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
                : 0.0;
            $u['slaComplianceRate'] = $slaRate;

            $statusHealth = 'no_data';
            if ($u['total'] > 0) {
                $statusHealth = 'optimal';
                if ($u['slaComplianceRate'] < 90) {
                    $statusHealth = 'attention';
                } elseif ($u['slaComplianceRate'] >= 95) {
                    $statusHealth = 'excellent';
                }
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

        // Rata-rata hanya dari unit yang sudah punya data; jika belum ada, 0.
        $unitsWithData = array_values(array_filter($unitList, fn ($u) => $u['total'] > 0));
        $countWithData = count($unitsWithData);
        $avgOf = fn (string $key) => $countWithData > 0
            ? round(array_sum(array_column($unitsWithData, $key)) / $countWithData, 1)
            : 0.0;
        $avgSla = $avgOf('slaComplianceRate');
        $avgRes = $avgOf('avgResolutionDays');
        $avgSat = $avgOf('rating');

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
            'globalTypeStages'      => $globalTypeStages,
            'stagesList'            => $stagesList,
            'streamlinedStagesList' => $streamlinedStagesList,
            'units'                 => $unitList,
            'distribution'          => $distribution,
        ]);
    }

    /**
     * GET /api/admin/dashboard
     * Agregat untuk Dashboard Administrator, dihitung dari SELURUH aduan (bukan hanya halaman list).
     */
    public function adminDashboard()
    {
        $db = \Config\Database::connect('default');
        $rows = $db->table('complaints c')
            ->select(['c.type', 'c.status', 'c.assigned_unit', 'c.created_at', 'c.updated_at'])
            ->get()->getResultArray();

        $stageOf = static fn (string $raw): string => match (strtolower(trim($raw))) {
            'submitted', 'new', ''   => 'received',
            'process'                => 'in_progress',
            'done'                   => 'resolved',
            'escalate', 'disposition'=> 'dispatched',
            default                  => strtolower(trim($raw)),
        };

        $stages = ['received' => 0, 'verified' => 0, 'dispatched' => 0, 'in_progress' => 0, 'action_taken' => 0, 'answered' => 0, 'resolved' => 0];
        $types = ['complaint' => 0, 'feedback' => 0, 'suggestion' => 0];
        $units = [];
        $resolutionSecs = [];

        // 8 bulan terakhir (termasuk bulan ini) untuk grafik tren; label bulan diformat frontend (sesuai bahasa)
        $monthly = [];
        $now = new \DateTimeImmutable('first day of this month');
        for ($i = 7; $i >= 0; $i--) {
            $d = $now->modify("-{$i} months");
            $monthly[$d->format('Y-m')] = [
                'month'      => $d->format('Y-m'),
                'completed'  => 0,
                'inProgress' => 0,
            ];
        }

        foreach ($rows as $row) {
            $st = $stageOf((string) ($row['status'] ?? ''));
            if (!isset($stages[$st])) {
                $st = 'received';
            }
            $stages[$st]++;

            $type = strtolower((string) ($row['type'] ?? 'complaint'));
            if (!isset($types[$type])) {
                $type = 'complaint';
            }
            $types[$type]++;

            $unit = trim((string) ($row['assigned_unit'] ?? ''));
            if ($unit !== '') {
                $units[$unit] = ($units[$unit] ?? 0) + 1;
            }

            if ($st === 'resolved' && !empty($row['created_at']) && !empty($row['updated_at'])) {
                $diff = strtotime($row['updated_at']) - strtotime($row['created_at']);
                if ($diff > 0) {
                    $resolutionSecs[] = $diff;
                }
            }

            if (!empty($row['created_at'])) {
                $key = date('Y-m', strtotime($row['created_at']));
                if (isset($monthly[$key])) {
                    if ($st === 'resolved') {
                        $monthly[$key]['completed']++;
                    } elseif (!in_array($st, ['received', 'verified'], true)) {
                        $monthly[$key]['inProgress']++;
                    }
                }
            }
        }

        arsort($units);
        $unitRanking = [];
        foreach ($units as $name => $count) {
            $unitRanking[] = ['name' => $name, 'count' => $count];
        }

        return $this->respond([
            'status'            => true,
            'total'             => count($rows),
            'byType'            => $types,
            'stages'            => $stages,
            'verificationQueue' => $stages['received'],
            'dispositionQueue'  => $stages['verified'],
            'activeDispatched'  => $stages['dispatched'] + $stages['in_progress'] + $stages['action_taken'] + $stages['answered'],
            'resolved'          => $stages['resolved'],
            'avgResolutionDays' => $resolutionSecs ? round(array_sum($resolutionSecs) / count($resolutionSecs) / 86400, 1) : 0.0,
            'unitRanking'       => $unitRanking,
            'monthly'           => array_values($monthly),
        ]);
    }

    /**
     * Rata-rata hari penyelesaian aduan berstatus resolved (selisih updated_at - created_at).
     * Mengembalikan 0 jika belum ada aduan yang selesai.
     */
    private function averageResolutionDays(array $items): float
    {
        $secs = [];
        foreach ($items as $item) {
            if (($item['status'] ?? '') !== 'resolved' || empty($item['created_at']) || empty($item['updated_at'])) {
                continue;
            }
            $diff = strtotime($item['updated_at']) - strtotime($item['created_at']);
            if ($diff > 0) {
                $secs[] = $diff;
            }
        }

        return $secs ? round(array_sum($secs) / count($secs) / 86400, 1) : 0.0;
    }
}