<?php

namespace App\Services;

class PriorityService
{
    private const URGENT_KEYWORDS = [
        'darurat', 'bahaya', 'kebocoran', 'bocor', 'konslet', 'terbakar',
        'terbengkalai', 'mati total', 'segera', 'urgent', 'kritis', 'parah', 'korban', 'keselamatan'
    ];

    private const MODERATE_KEYWORDS = [
        'rusak', 'gangguan', 'lambat', 'tidak bisa', 'sulit', 'terhambat', 'error', 'kendala'
    ];

    /**
     * Sanitasi PII menggunakan regex fail-safe bahasa Indonesia.
     */
    public function redactPIIFallback(string $rawText): string
    {
        // 1. Email
        $redacted = preg_replace('/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/', '<EMAIL>', $rawText);
        // 2. Nomor HP Indonesia (+62 / 62 / 08)
        $redacted = preg_replace('/(?:\+62|62|0)8[1-9]\d{1,2}[\s\-]?\d{3,4}[\s\-]?\d{3,5}\b/', '<TELEPON>', $redacted);
        // 3. NIM PENS (10 digit diawali 332)
        $redacted = preg_replace('/\b332\d{7}\b/', '<NIM>', $redacted);
        // 4. Nomor identitas umum lainnya (7 - 16 digit angka berurutan)
        $redacted = preg_replace('/\b[0-9]{7,16}\b/', '<NOMOR_IDENTITAS>', $redacted);

        return (string) $redacted;
    }

    /**
     * Evaluasi urgensi berbasis kata kunci dan dampak operasional.
     */
    public function evaluateUrgency(string $text): array
    {
        $lower = strtolower($text);

        $isUrgent = false;
        $matchedKeyword = null;
        foreach (self::URGENT_KEYWORDS as $word) {
            if (str_contains($lower, $word)) {
                $isUrgent = true;
                $matchedKeyword = $word;
                break;
            }
        }

        $isModerate = false;
        if (!$isUrgent) {
            foreach (self::MODERATE_KEYWORDS as $word) {
                if (str_contains($lower, $word)) {
                    $isModerate = true;
                    $matchedKeyword = $word;
                    break;
                }
            }
        }

        if ($isUrgent) {
            return [
                'urgency_label'  => 'Tinggi',
                'urgency_score'  => 0.85,
                'urgency_reason' => "Terdeteksi indikasi situasi kritis/mendesak (kata kunci: '{$matchedKeyword}').",
                'is_urgent'      => true,
            ];
        }

        if ($isModerate) {
            return [
                'urgency_label'  => 'Sedang',
                'urgency_score'  => 0.60,
                'urgency_reason' => "Terdeteksi kendala operasional yang membutuhkan penanganan (kata kunci: '{$matchedKeyword}').",
                'is_urgent'      => false,
            ];
        }

        return [
            'urgency_label'  => 'Rendah',
            'urgency_score'  => 0.35,
            'urgency_reason' => 'Masukan bersifat informatif atau keluhan non-kritis dengan dampak operasional terbatas.',
            'is_urgent'      => false,
        ];
    }

    /**
     * Klasifikasikan unit tujuan secara heuristik berdasarkan kata kunci substansi.
     */
    public function classifyUnitFallback(string $text, ?string $userPreferredCategory = null): string
    {
        $lower = strtolower($text);

        // 1. Akademik (nilai, krs, transkrip, yudisium, kurikulum, perkuliahan)
        if (preg_match('/(nilai|krs|khs|transkrip|yudisium|ijazah|kurikulum|jadwal kuliah|perwalian|dosen pembimbing|skripsi)/i', $lower)) {
            return 'Akademik';
        }
        // 2. Keuangan (ukt, pembayaran, tagihan bank, beasiswa keuangan)
        if (preg_match('/(ukt|biaya|bayar|keuangan|tagihan|dana|restitusi|slip|va|virtual account)/i', $lower)) {
            return 'Keuangan';
        }
        // 3. Kemahasiswaan (beasiswa, ormawa, ukm, lomba, asrama)
        if (preg_match('/(beasiswa|ormawa|bem|hima|ukm|kegiatan mahasiswa|lomba|prestasi|asrama)/i', $lower)) {
            return 'Kemahasiswaan';
        }
        // 4. TIK/Sistem Informasi (jaringan internet, wifi, server, akun login, website)
        if (preg_match('/(wifi|internet|jaringan|komputer|server|sia|siakad|website|login|akun|email|portal|elearning|ethol)/i', $lower)) {
            return 'TIK/Sistem Informasi';
        }
        // 5. Laboratorium/Jurusan (alat lab, kalibrasi, praktikum alat)
        if (preg_match('/(alat lab|komputer lab|teknisi lab|osiloskop|soldering|multimeter|kalibrasi alat)/i', $lower)) {
            return 'Laboratorium/Jurusan';
        }
        // 6. Sarana Prasarana dan Layanan Umum (fasilitas fisik gedung)
        if (preg_match('/(ac|ruang kelas|gedung|kursi|meja|toilet|lampu|pintu|atap|bocor|fasilitas|listrik|air|kebersihan|sampah|lift)/i', $lower)) {
            return 'Sarana Prasarana dan Layanan Umum';
        }
        if (preg_match('/(buku|jurnal|perpustakaan|ruang baca|pinjam|repositori)/i', $lower)) {
            return 'Perpustakaan';
        }
        if (preg_match('/(parkir|helm|hilang|maling|satpam|keamanan|tertib|pos|stnk)/i', $lower)) {
            return 'Keamanan dan Ketertiban';
        }
        if (preg_match('/(magang|pkl|mitra|industri|kerjasama|mou|mbkm)/i', $lower)) {
            return 'Kerjasama dan Hubungan Eksternal';
        }
        if (preg_match('/(karir|alumni|tracer|lowongan|job fair)/i', $lower)) {
            return 'Ukarni dan Hubungan Alumni';
        }
        if (preg_match('/(kepegawaian|tendik|staf|gaji|presensi|sdm|loket fakultas)/i', $lower)) {
            return 'SDM/Kepegawaian';
        }
        if (preg_match('/(informasi publik|ppid|keterbukaan|data publik|dokumen publik)/i', $lower)) {
            return 'Informasi Publik/PPID';
        }
        if (preg_match('/(kebijakan|direksi|senat|manajemen|direktur|pimpinan)/i', $lower)) {
            return 'Pimpinan/Manajemen';
        }

        // Jika tidak ada kata kunci yang cocok, gunakan kategori usulan pengguna
        if ($userPreferredCategory) {
            $catKey = strtolower(trim($userPreferredCategory));
            return match ($catKey) {
                'academic', 'akademik'        => 'Akademik',
                'finance', 'keuangan'         => 'Keuangan',
                'admin', 'sdm'                => 'SDM/Kepegawaian',
                'ti', 'tik', 'it'             => 'TIK/Sistem Informasi',
                'other', 'lainnya'            => 'Lainnya/Lintas Unit',
                default                       => 'Sarana Prasarana dan Layanan Umum',
            };
        }

        return 'Sarana Prasarana dan Layanan Umum';
    }

    /**
     * Bentuk hasil analisis cadangan (Heuristic Fallback) saat ML Service tidak tersedia.
     *
     * Catatan Integritas Data:
     * - Jangan memalsukan keyakinan model neural (confidence diisi null).
     * - Tandai secara eksplisit 'is_fallback' = true dan sumber analisis 'heuristic'.
     */
    public function generateFallbackAnalysis(string $rawText, string $type = 'complaint', ?string $userPreferredCategory = null): array
    {
        $redactedText = $this->redactPIIFallback($rawText);
        $urgency = $this->evaluateUrgency($redactedText);
        $assignedUnit = $this->classifyUnitFallback($redactedText, $userPreferredCategory);

        return [
            'redacted_text'       => $redactedText,
            'category'            => $assignedUnit,
            'category_confidence' => null, // Jujur: null karena bukan probabilitas model AI
            'target_unit'         => $assignedUnit,
            'unit_confidence'     => null, // Jujur: null
            'unit_reason'         => 'Rekomendasi disposisi heuristik berdasarkan pencocokan kata kunci substansi keluhan.',
            'urgency_label'       => $urgency['urgency_label'],
            'urgency_score'       => $urgency['urgency_score'],
            'urgency_reason'      => $urgency['urgency_reason'],
            'sentiment'           => 'negative',
            'sentiment_score'     => null, // Jujur: null
            'sentiment_scores'    => null, // Distribusi probabilitas model neural tidak tersedia
            'submission_type'     => $type === 'suggestion' ? 'aspiration' : $type,
            'requires_review'     => $urgency['is_urgent'], // Wajib review jika terdeteksi urgensi tinggi
            'is_fallback'         => true,
            'analysis_source'     => 'heuristic',
            'model_version'       => 'heuristic-fallback-v1.2',
        ];
    }
}
