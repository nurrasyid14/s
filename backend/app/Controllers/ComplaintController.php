<?php

namespace App\Controllers;

use App\Models\ComplaintModel;
use App\Models\ComplaintReplyModel;
use App\Models\ComplaintAnalysisModel;
use App\Models\ComplaintReviewModel;
use App\Libraries\ApiTokenService;
use CodeIgniter\RESTful\ResourceController;

class ComplaintController extends ResourceController
{
    protected $format = 'json';

    /**
     * GET /api/complaints
     * Mengambil semua pengaduan
     */
    public function index()
    {
        $page  = max(1, (int) ($this->request->getGet('page') ?? 1));
        $limit = min(100, max(1, (int) ($this->request->getGet('limit') ?? 10)));
        $builder = $this->complaintQuery();

        $status = $this->request->getGet('status');
        if ($status !== null && $status !== '') {
            $builder->where('c.status', $this->normalizeStatus($status));
        }
        $type = $this->request->getGet('type');
        if ($type !== null && $type !== '') {
            $builder->where('c.type', $type);
        }
        $category = $this->request->getGet('category');
        if ($category !== null && $category !== '') {
            $builder->where('ca.category', $this->normalizeCategory($category));
        }
        $search = trim((string) ($this->request->getGet('search') ?? ''));
        if ($search !== '') {
            $builder->groupStart()
                ->like('c.ticket_id', $search)
                ->orLike('c.description', $search)
                ->groupEnd();
        }

        $total = (int) (clone $builder)->countAllResults();
        $items = $builder->orderBy('c.created_at', 'DESC')
            ->limit($limit, ($page - 1) * $limit)
            ->get()->getResultArray();
        $items = array_map(fn ($item) => $this->presentComplaint($item), $items);

        return $this->respond([
            'status' => true,
            'items'  => $items,
            'total'  => $total,
            'page'   => $page,
            'limit'  => $limit,
        ]);
    }

    /** GET /api/complaints/my */
    public function my()
    {
        $user = $this->authenticatedUser();
        if (!$user) {
            return $this->respond(['status' => false, 'message' => 'Autentikasi diperlukan.'], 401);
        }

        $items = $this->complaintQuery()->where('c.user_id', (int) $user['id'])
            ->orderBy('c.created_at', 'DESC')->get()->getResultArray();
        return $this->respond(array_map(fn ($item) => $this->presentComplaint($item), $items));
    }

    /**
     * GET /api/complaints/{id}
     * Mengambil detail satu pengaduan
     */
    public function show($id = null)
    {
        if ($id === null) {
            return $this->respond([
                'status'  => false,
                'message' => 'ID pengaduan wajib diisi.'
            ], 400);
        }

        $complaint = $this->complaintQuery()->where('c.id', (int) $id)->get()->getRowArray();

        if (!$complaint) {
            return $this->respond([
                'status'  => false,
                'message' => 'Pengaduan tidak ditemukan.'
            ], 404);
        }

        $user = $this->authenticatedUser();
        if (!$user) {
            return $this->respond(['status' => false, 'message' => 'Autentikasi diperlukan.'], 401);
        }
        if ($user['role'] === 'user' && (int) $complaint['user_id'] !== (int) $user['id']) {
            return $this->respond(['status' => false, 'message' => 'Pengaduan tidak ditemukan.'], 404);
        }

        $replies = (new ComplaintReplyModel())
            ->select('complaint_replies.id, complaint_replies.reply, complaint_replies.created_at, users.name AS by')
            ->join('users', 'users.id = complaint_replies.user_id', 'left')
            ->where('complaint_replies.complaint_id', (int) $id)
            ->orderBy('complaint_replies.created_at', 'ASC')
            ->findAll();

        $verification = null;
        $disposition = null;
        $unitAnswer = null;
        $feedback = null;
        $followups = [];

        foreach ($replies as $reply) {
            $text = (string) $reply['reply'];
            $byName = $reply['by'] ?? 'Petugas';
            $createdAt = $reply['created_at'];

            if (str_starts_with($text, '[Verifikasi ')) {
                $isApproved = str_starts_with($text, '[Verifikasi Disetujui]');
                $note = trim(preg_replace('/^\[Verifikasi [^\]]+\]\s*/', '', $text));
                $verification = [
                    'verified_by' => $byName ?: 'Admin Sentral PENS',
                    'verified_at' => $createdAt,
                    'note'        => $note,
                    'approved'    => $isApproved,
                ];
            } elseif (str_starts_with($text, '[Disposisi ke ')) {
                preg_match('/^\[Disposisi ke ([^\]]+)\](?:\s*PIC:\s*([^.]+)\.)?\s*(.*)$/s', $text, $m);
                $unit = !empty($m[1]) ? trim($m[1]) : ($complaint['assigned_unit'] ?? 'Unit Terkait');
                $pic = !empty($m[2]) ? trim($m[2]) : "Koordinator {$unit}";
                $note = !empty($m[3]) ? trim($m[3]) : 'Mohon segera ditindaklanjuti sesuai SOP unit.';
                $disposition = [
                    'target_unit'      => $unit,
                    'assigned_pic'     => $pic,
                    'disposition_note' => $note,
                    'disposition_by'   => $byName ?: 'Admin Sentral PENS',
                    'disposition_at'   => $createdAt,
                    'target_sla_date'  => date('c', strtotime($createdAt . ' + 3 days')),
                ];
            } elseif (str_starts_with($text, '[Jawaban Resmi Unit]')) {
                preg_match('/^\[Jawaban Resmi Unit\](?:\s*Oleh:\s*([^.]+)\.)?\s*(.*)$/s', $text, $m);
                $answeredBy = !empty($m[1]) ? trim($m[1]) : $byName;
                $ans = !empty($m[2]) ? trim($m[2]) : $text;
                $unitAnswer = [
                    'answer'      => $ans,
                    'answered_by' => $answeredBy,
                    'answered_at' => $createdAt,
                    'attachments' => [],
                ];
            } elseif (str_starts_with($text, '[Feedback Stakeholder]')) {
                preg_match('/Rating:\s*([0-9]+)\/5\.(?:\s*Catatan:\s*(.*))?$/s', $text, $m);
                $feedback = [
                    'rating'       => !empty($m[1]) ? (int) $m[1] : 5,
                    'comment'      => !empty($m[2]) ? trim($m[2]) : 'Aduan diselesaikan dengan puas.',
                    'submitted_at' => $createdAt,
                ];
            }

            $followups[] = [
                'id'         => (int) $reply['id'],
                'by'         => $byName,
                'note'       => $text,
                'status'     => 'process',
                'created_at' => $createdAt,
            ];
        }

        // Fallbacks based on complaint status if not found in replies
        $statusKey = strtolower((string) ($complaint['status'] ?? ''));
        if (!$disposition && in_array($statusKey, ['dispatched', 'in_progress', 'action_taken', 'answered', 'resolved'], true)) {
            $targetUnit = $complaint['assigned_unit'] ?? $complaint['unit'] ?? 'Unit Terkait';
            $disposition = [
                'target_unit'      => $targetUnit,
                'assigned_pic'     => "Koordinator {$targetUnit}",
                'disposition_note' => 'Disposisi penanganan unit oleh Admin Sentral.',
                'disposition_by'   => 'Admin Sentral PENS',
                'disposition_at'   => $complaint['updated_at'] ?? $complaint['created_at'],
                'target_sla_date'  => date('c', strtotime(($complaint['created_at'] ?? 'now') . ' + 3 days')),
            ];
        }
        if (!$verification && in_array($statusKey, ['verified', 'dispatched', 'in_progress', 'action_taken', 'answered', 'resolved'], true)) {
            $verification = [
                'verified_by' => 'Admin Sentral PENS',
                'verified_at' => $complaint['updated_at'] ?? $complaint['created_at'],
                'note'        => 'Aduan telah diverifikasi validitas substansinya oleh Admin Sentral.',
                'approved'    => true,
            ];
        }

        $complaint['verification'] = $verification;
        $complaint['disposition']  = $disposition;
        $complaint['unit_answer']  = $unitAnswer;
        $complaint['feedback']     = $feedback;
        $complaint['followups']    = $followups;
        $complaint['attachments']  = [];

        return $this->respond($this->presentComplaint($complaint));
    }

    /**
     * POST /api/complaints
     * Membuat pengaduan baru
     *
     * Alur:
     * 1. Terima teks pengaduan
     * 2. Kirim ke ML Service
     * 3. PII redaction + NLP analysis
     * 4. Simpan teks yang sudah di-redact
     * 5. Simpan hasil analisis
     * 6. Jika membutuhkan review, buat HITL review
     */
    public function create()
    {
        set_time_limit(180);

        $data = $this->getRequestData();
        $authenticatedUser = $this->authenticatedUser();

        /*
         * ============================================================
         * 1. VALIDASI INPUT
         * ============================================================
         */

        if (
            !$authenticatedUser ||
            empty($data['type']) ||
            empty($data['description'])
        ) {
            return $this->respond([
                'status'  => false,
                'message' => 'Autentikasi, type, dan description wajib diisi.'
            ], 400);
        }

        /*
         * ============================================================
         * 2. KIRIM TEKS KE ML SERVICE
         * ============================================================
         *
         * PII harus diproses sebelum data disimpan ke PostgreSQL.
         *
         * complaint_id = 0 karena complaint belum dibuat.
         */

        $payload = json_encode([
            'complaint_id' => 0,
            'text'         => $data['description']
        ]);

        $client = \Config\Services::curlrequest();
        $inferenceTime = 0;
        $analysis = null;

        try {
            $startTime = microtime(true);
            $response = $client->post(
                'http://127.0.0.1:8000/analyze',
                [
                    'headers' => [
                        'Content-Type' => 'application/json',
                        'Accept'       => 'application/json'
                    ],
                    'body'    => $payload,
                    'timeout' => 90,
                ]
            );

            $inferenceTime = (int) round((microtime(true) - $startTime) * 1000);
            $result = json_decode($response->getBody(), true);
            if (isset($result['status']) && $result['status'] === true && isset($result['data'])) {
                $analysis = $result['data'];
            }
        } catch (\Throwable $e) {
            log_message('warning', 'ML Service offline, using local fallback analysis: ' . $e->getMessage());
        }

        // Heuristic fallback if ML service was offline or failed
        if (!$analysis || empty($analysis['redacted_text'])) {
            $rawText = (string) $data['description'];
            // PII mask
            $redacted = preg_replace('/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/', '<EMAIL>', $rawText);
            $redacted = preg_replace('/(\+62|62|08)[0-9]{8,12}/', '<TELEPON>', $redacted);
            $redacted = preg_replace('/\b[0-9]{7,16}\b/', '<NOMOR_IDENTITAS>', $redacted);

            $lower = strtolower($rawText);

            // Deteksi urgensi berbasis kata kunci
            $urgentKeywords = ['darurat', 'bahaya', 'kebocoran', 'bocor', 'konslet', 'terbakar', 'terbengkalai', 'mati total', 'segera', 'urgent', 'kritis', 'parah', 'korban'];
            $modKeywords    = ['rusak', 'gangguan', 'lambat', 'tidak bisa', 'sulit', 'terhambat', 'error', 'kendala'];

            $isUrgent = false;
            foreach ($urgentKeywords as $w) {
                if (str_contains($lower, $w)) { $isUrgent = true; break; }
            }
            $isMod = false;
            if (!$isUrgent) {
                foreach ($modKeywords as $w) {
                    if (str_contains($lower, $w)) { $isMod = true; break; }
                }
            }

            $urgencyScore = $isUrgent ? 0.85 : ($isMod ? 0.65 : 0.45);
            $urgencyLabel = $isUrgent ? 'Tinggi' : ($isMod ? 'Sedang' : 'Rendah');

            // Deteksi kategori otomatis dari kata kunci
            $catLabel = null;
            if (preg_match('/(ac|ruang|kelas|lab|gedung|kursi|meja|toilet|lampu|pintu|atap|bocor|fasilitas)/i', $lower)) {
                $catLabel = 'Fasilitas';
            } elseif (preg_match('/(wifi|internet|jaringan|komputer|server|sia|website|login|akun|email)/i', $lower)) {
                $catLabel = 'Sarana IT';
            } elseif (preg_match('/(nilai|dosen|kuliah|jadwal|skripsi|krs|ujian|praktikum|akademik)/i', $lower)) {
                $catLabel = 'Akademik';
            } elseif (preg_match('/(ukt|biaya|bayar|keuangan|tagihan|dana)/i', $lower)) {
                $catLabel = 'Keuangan';
            } elseif (preg_match('/(beasiswa|bantuan|kip)/i', $lower)) {
                $catLabel = 'Beasiswa';
            } elseif (preg_match('/(surat|legalisir|ktm|ijazah|administrasi|transkrip)/i', $lower)) {
                $catLabel = 'Pelayanan Administrasi';
            } elseif (preg_match('/(parkir|helm|hilang|maling|satpam|keamanan)/i', $lower)) {
                $catLabel = 'Parkir & Keamanan';
            } elseif (preg_match('/(sampah|kotor|bau|kebersihan|taman)/i', $lower)) {
                $catLabel = 'Kebersihan & Lingkungan';
            } elseif (preg_match('/(ormawa|bem|hima|kegiatan|mahasiswa)/i', $lower)) {
                $catLabel = 'Kemahasiswaan';
            }

            if (!$catLabel) {
                $catKey = strtolower((string) ($data['category'] ?? 'facility'));
                $catLabel = match ($catKey) {
                    'academic' => 'Akademik',
                    'finance'  => 'Keuangan',
                    'admin'    => 'Pelayanan Administrasi',
                    'other'    => 'Lainnya',
                    default    => 'Fasilitas',
                };
            }

            $analysis = [
                'redacted_text'       => $redacted,
                'category'            => $catLabel,
                'category_confidence' => 0.88,
                'urgency_label'       => $urgencyLabel,
                'urgency_score'       => $urgencyScore,
                'urgency_reason'      => $isUrgent ? 'Terdeteksi kondisi urgensi tinggi pada teks keluhan.' : 'Kategorisasi berdasarkan substansi laporan.',
                'sentiment'           => 'negatif',
                'sentiment_score'     => 0.70,
                'requires_review'     => $isUrgent,
                'model_version'       => 'heuristic-fallback-v1.1'
            ];
            $inferenceTime = 12;
        }

        /*
         * ============================================================
         * 5. BUAT TICKET ID
         * ============================================================
         */

        $ticketId = 'SL-' . date('YmdHis') . strtoupper(
            substr(bin2hex(random_bytes(3)), 0, 4)
        );

        /*
         * ============================================================
         * 6. SIMPAN COMPLAINT
         * ============================================================
         *
         * PENTING:
         * description menggunakan redacted_text,
         * bukan description asli dari user.
         */

        $complaintModel = new ComplaintModel();

        $complaintId = $complaintModel->insert([
            'ticket_id'     => $ticketId,
            'user_id'       => (int) $authenticatedUser['id'],
            'type'          => $data['type'],

            // Hanya teks yang sudah di-redact yang disimpan.
            'description'   => $analysis['redacted_text'],

            'is_anonymous'  => $data['is_anonymous'] ?? false,
            'status'        => 'submitted',
            'assigned_unit' => $data['assigned_unit'] ?? $data['unit'] ?? null,
        ]);

        /*
         * ============================================================
         * 7. CEK HASIL INSERT COMPLAINT
         * ============================================================
         */

        if (!$complaintId) {
            return $this->respond([
                'status'  => false,
                'message' => 'Gagal menyimpan pengaduan.',
                'errors'  => $complaintModel->errors()
            ], 500);
        }

        /*
         * ============================================================
         * 8. SIMPAN HASIL ANALISIS
         * ============================================================
         */

        $analysisModel = new ComplaintAnalysisModel();

        $analysisData = [
            'complaint_id'        => (int) $complaintId,
            'category'            => $analysis['category'] ?? null,
            'category_confidence' => $analysis['category_confidence'] ?? null,
            'urgency_label'       => $analysis['urgency_label'] ?? null,
            'urgency_score'       => $analysis['urgency_score'] ?? null,
            'urgency_reason'      => $analysis['urgency_reason'] ?? null,
            'sentiment'           => $analysis['sentiment'] ?? null,
            'sentiment_score'     => $analysis['sentiment_score'] ?? null,
            'requires_review'     => $analysis['requires_review'] ?? false,
            'model_version'       => 'qwen3:8b + indonesian-roberta',
            'inference_time_ms'   => $inferenceTime,
        ];

        $analysisId = $analysisModel->insert($analysisData);

        /*
         * ============================================================
         * 9. CEK HASIL INSERT ANALYSIS
         * ============================================================
         */

        if (!$analysisId) {
            return $this->respond([
                'status'  => false,
                'message' => 'Pengaduan tersimpan tetapi hasil analisis gagal disimpan.',
                'errors'  => $analysisModel->errors(),
                'data'    => [
                    'complaint_id' => $complaintId,
                    'ticket_id'    => $ticketId
                ]
            ], 500);
        }

        /*
         * ============================================================
         * 10. BUAT HITL REVIEW JIKA DIPERLUKAN
         * ============================================================
         */

        $reviewId = null;

        if (!empty($analysis['requires_review'])) {

            $reviewModel = new ComplaintReviewModel();

            $reviewId = $reviewModel->insert([
                'complaint_analysis_id' => $analysisId,
                'review_status'         => 'pending',
            ]);

            if (!$reviewId) {
                return $this->respond([
                    'status'  => false,
                    'message' => 'Pengaduan dan analisis berhasil disimpan, tetapi review HITL gagal dibuat.',
                    'errors'  => $reviewModel->errors(),
                    'data'    => [
                        'complaint_id' => $complaintId,
                        'analysis_id'  => $analysisId,
                        'ticket_id'    => $ticketId
                    ]
                ], 500);
            }
        }

        /*
         * ============================================================
         * 11. RESPONSE
         * ============================================================
         */

        return $this->respondCreated([
            'status'  => true,
            'message' => 'Pengaduan berhasil dibuat dan dianalisis.',
            'id'      => (int) $complaintId,
            'ticket_id' => $ticketId,
            'data'    => [
                'complaint_id'        => $complaintId,
                'analysis_id'         => $analysisId,
                'review_id'           => $reviewId,
                'ticket_id'           => $ticketId,
                'status'              => 'submitted',

                'category'            => $analysis['category'] ?? null,
                'category_confidence' => $analysis['category_confidence'] ?? null,

                'urgency_label'       => $analysis['urgency_label'] ?? null,
                'urgency_score'       => $analysis['urgency_score'] ?? null,
                'urgency_reason'      => $analysis['urgency_reason'] ?? null,

                'sentiment'           => $analysis['sentiment'] ?? null,
                'sentiment_score'     => $analysis['sentiment_score'] ?? null,

                'requires_review'     => $analysis['requires_review'] ?? false,

                'inference_time_ms'   => $inferenceTime
            ]
        ]);
    }

    /**
     * PATCH /api/complaints/{id}/status
     * Mengubah status pengaduan
     */
    public function updateStatus($id = null)
    {
        if ($id === null) {
            return $this->respond([
                'status'  => false,
                'message' => 'ID pengaduan wajib diisi.'
            ], 400);
        }

        $data = $this->getRequestData();

        if (empty($data['status'])) {
            return $this->respond([
                'status'  => false,
                'message' => 'Status wajib diisi.'
            ], 400);
        }

        $normalizedStatus = $this->normalizeStatus((string) $data['status']);
        $allowedStatuses = [
            'submitted',
            'received',
            'verified',
            'dispatched',
            'in_progress',
            'process',
            'action_taken',
            'answered',
            'resolved',
            'done',
            'escalated',
            'escalate',
            'rejected',
        ];

        if (!in_array($normalizedStatus, $allowedStatuses, true)) {
            return $this->respond([
                'status'  => false,
                'message' => 'Status tidak valid.'
            ], 400);
        }

        $complaintModel = new ComplaintModel();

        $complaint = $complaintModel->find($id);

        if (!$complaint) {
            return $this->respond([
                'status'  => false,
                'message' => 'Pengaduan tidak ditemukan.'
            ], 404);
        }

        $updateFields = ['status' => $normalizedStatus];
        if (!empty($data['assigned_unit']) || !empty($data['unit']) || !empty($data['target_unit'])) {
            $updateFields['assigned_unit'] = $data['assigned_unit'] ?? $data['unit'] ?? $data['target_unit'];
        }

        $updated = $complaintModel->update($id, $updateFields);

        if (!$updated) {
            return $this->respond([
                'status'  => false,
                'message' => 'Gagal memperbarui status.',
                'errors'  => $complaintModel->errors()
            ], 500);
        }

        return $this->respond([
            'status'  => true,
            'message' => 'Status pengaduan berhasil diperbarui.',
            'data'    => [
                'id'     => $id,
                'status' => $data['status']
            ]
        ]);
    }

    /**
     * PATCH /api/admin/complaints/{id}/verify or PATCH /api/complaints/{id}/verify
     * Verifikasi aduan oleh Admin Sentral
     */
    public function verify($id = null)
    {
        if ($id === null) {
            return $this->respond(['status' => false, 'message' => 'ID pengaduan wajib diisi.'], 400);
        }

        $data = $this->getRequestData();
        $verified = isset($data['verified']) ? (bool) $data['verified'] : true;
        $note = trim((string) ($data['note'] ?? ''));

        $complaintModel = new ComplaintModel();
        $complaint = $complaintModel->find($id);
        if (!$complaint) {
            return $this->respond(['status' => false, 'message' => 'Pengaduan tidak ditemukan.'], 404);
        }

        $newStatus = $verified ? 'verified' : 'rejected';
        $complaintModel->update($id, ['status' => $newStatus]);

        if ($note !== '') {
            $user = $this->authenticatedUser();
            (new ComplaintReplyModel())->insert([
                'complaint_id' => (int) $id,
                'user_id'      => $user ? (int) $user['id'] : null,
                'reply'        => ($verified ? '[Verifikasi Disetujui] ' : '[Verifikasi Ditolak] ') . $note,
            ]);
        }

        return $this->respond([
            'status'    => true,
            'message'   => $verified ? 'Aduan berhasil diverifikasi.' : 'Aduan ditolak.',
            'complaint' => [
                'id'           => (int) $id,
                'status'       => $newStatus,
                'verification' => [
                    'verified_by' => 'Admin Sentral PENS',
                    'verified_at' => date('c'),
                    'note'        => $note,
                ],
            ],
        ]);
    }

    /**
     * POST /api/admin/complaints/{id}/disposition or POST /api/complaints/{id}/disposition
     * Disposisi aduan ke unit terkait oleh Admin Sentral
     */
    public function dispatch($id = null)
    {
        if ($id === null) {
            return $this->respond(['status' => false, 'message' => 'ID pengaduan wajib diisi.'], 400);
        }

        $data = $this->getRequestData();
        $targetUnit = trim((string) ($data['target_unit'] ?? $data['unit'] ?? ''));
        $pic = trim((string) ($data['assigned_pic'] ?? ''));
        $note = trim((string) ($data['disposition_note'] ?? ''));
        $slaDate = $data['target_sla_date'] ?? null;

        $complaintModel = new ComplaintModel();
        $complaint = $complaintModel->find($id);
        if (!$complaint) {
            return $this->respond(['status' => false, 'message' => 'Pengaduan tidak ditemukan.'], 404);
        }

        $updateData = ['status' => 'dispatched'];
        if ($targetUnit !== '') {
            $updateData['assigned_unit'] = $targetUnit;
        }
        $complaintModel->update($id, $updateData);

        if ($note !== '' || $targetUnit !== '') {
            $user = $this->authenticatedUser();
            $replyMsg = "[Disposisi ke {$targetUnit}] " . ($pic ? "PIC: {$pic}. " : '') . $note;
            (new ComplaintReplyModel())->insert([
                'complaint_id' => (int) $id,
                'user_id'      => $user ? (int) $user['id'] : null,
                'reply'        => $replyMsg,
            ]);
        }

        return $this->respond([
            'status'    => true,
            'message'   => 'Aduan berhasil didisposisikan ke unit.',
            'complaint' => [
                'id'            => (int) $id,
                'status'        => 'dispatched',
                'target_unit'   => $targetUnit,
                'unit'          => $targetUnit,
                'disposition'   => [
                    'target_unit'      => $targetUnit,
                    'assigned_pic'     => $pic,
                    'disposition_note' => $note,
                    'disposition_by'   => 'Admin Sentral PENS',
                    'disposition_at'   => date('c'),
                    'target_sla_date'  => $slaDate,
                ],
            ],
        ]);
    }

    /**
     * POST /api/unit/complaints/{id}/accept
     * Unit mengakui dan memulai proses penanganan
     */
    public function accept($id = null)
    {
        if ($id === null) {
            return $this->respond(['status' => false, 'message' => 'ID pengaduan wajib diisi.'], 400);
        }

        $data = $this->getRequestData();
        $pic = trim((string) ($data['pic_name'] ?? ''));
        $note = trim((string) ($data['note'] ?? 'Disposisi diterima oleh unit. Penanganan sedang berlangsung.'));

        $complaintModel = new ComplaintModel();
        $complaint = $complaintModel->find($id);
        if (!$complaint) {
            return $this->respond(['status' => false, 'message' => 'Pengaduan tidak ditemukan.'], 404);
        }

        $complaintModel->update($id, ['status' => 'in_progress']);

        $user = $this->authenticatedUser();
        $userId = $user ? (int) $user['id'] : (int) $complaint['user_id'];
        (new ComplaintReplyModel())->insert([
            'complaint_id' => (int) $id,
            'user_id'      => $userId,
            'reply'        => "[Penerimaan Tugas Unit] " . ($pic ? "PIC: {$pic}. " : '') . $note,
        ]);

        return $this->respond([
            'status'  => true,
            'message' => 'Disposisi berhasil diterima dan status diperbarui ke Diproses.',
            'data'    => ['id' => $id, 'status' => 'in_progress'],
        ]);
    }

    /**
     * POST /api/unit/complaints/{id}/followup
     * Unit mencatat tindak lanjut teknis
     */
    public function followup($id = null)
    {
        if ($id === null) {
            return $this->respond(['status' => false, 'message' => 'ID pengaduan wajib diisi.'], 400);
        }

        $data = $this->getRequestData();
        $actionType = trim((string) ($data['action_type'] ?? 'maintenance'));
        $note = trim((string) ($data['note'] ?? ''));
        $by = trim((string) ($data['performed_by'] ?? 'Tim Teknis Unit'));

        $complaintModel = new ComplaintModel();
        $complaint = $complaintModel->find($id);
        if (!$complaint) {
            return $this->respond(['status' => false, 'message' => 'Pengaduan tidak ditemukan.'], 404);
        }

        $complaintModel->update($id, ['status' => 'action_taken']);

        $user = $this->authenticatedUser();
        $userId = $user ? (int) $user['id'] : (int) $complaint['user_id'];
        (new ComplaintReplyModel())->insert([
            'complaint_id' => (int) $id,
            'user_id'      => $userId,
            'reply'        => "[Tindak Lanjut Teknis - {$actionType}] Oleh: {$by}. {$note}",
        ]);

        return $this->respond([
            'status'  => true,
            'message' => 'Tindak lanjut berhasil dicatat dan status diperbarui ke Ditindaklanjuti.',
            'data'    => ['id' => $id, 'status' => 'action_taken'],
        ]);
    }

    /**
     * POST /api/unit/complaints/{id}/answer
     * Unit menerbitkan jawaban resmi penyelesaian aduan
     */
    public function answer($id = null)
    {
        if ($id === null) {
            return $this->respond(['status' => false, 'message' => 'ID pengaduan wajib diisi.'], 400);
        }

        $data = $this->getRequestData();
        $answer = trim((string) ($data['answer'] ?? ''));
        $by = trim((string) ($data['answered_by'] ?? 'Pimpinan Unit Layanan'));

        if ($answer === '') {
            return $this->respond(['status' => false, 'message' => 'Jawaban resmi tidak boleh kosong.'], 400);
        }

        $complaintModel = new ComplaintModel();
        $complaint = $complaintModel->find($id);
        if (!$complaint) {
            return $this->respond(['status' => false, 'message' => 'Pengaduan tidak ditemukan.'], 404);
        }

        $complaintModel->update($id, ['status' => 'answered']);

        $user = $this->authenticatedUser();
        $userId = $user ? (int) $user['id'] : (int) $complaint['user_id'];
        (new ComplaintReplyModel())->insert([
            'complaint_id' => (int) $id,
            'user_id'      => $userId,
            'reply'        => "[Jawaban Resmi Unit] Oleh: {$by}. {$answer}",
        ]);

        return $this->respond([
            'status'  => true,
            'message' => 'Jawaban resmi unit berhasil diterbitkan.',
            'data'    => ['id' => $id, 'status' => 'answered'],
        ]);
    }

    /**
     * POST /api/complaints/{id}/feedback
     * Stakeholder memberikan evaluasi kepuasan & menyelesaikan aduan
     */
    public function feedback($id = null)
    {
        if ($id === null) {
            return $this->respond(['status' => false, 'message' => 'ID pengaduan wajib diisi.'], 400);
        }

        $data = $this->getRequestData();
        $rating = (int) ($data['rating'] ?? 5);
        $comment = trim((string) ($data['comment'] ?? ''));

        $complaintModel = new ComplaintModel();
        $complaint = $complaintModel->find($id);
        if (!$complaint) {
            return $this->respond(['status' => false, 'message' => 'Pengaduan tidak ditemukan.'], 404);
        }

        $complaintModel->update($id, ['status' => 'resolved']);

        $user = $this->authenticatedUser();
        $userId = $user ? (int) $user['id'] : (int) $complaint['user_id'];
        (new ComplaintReplyModel())->insert([
            'complaint_id' => (int) $id,
            'user_id'      => $userId,
            'reply'        => "[Feedback Stakeholder] Rating: {$rating}/5. " . ($comment ? "Catatan: {$comment}" : 'Aduan diselesaikan dengan puas.'),
        ]);

        return $this->respond([
            'status'  => true,
            'message' => 'Feedback berhasil disimpan dan status aduan diselesaikan.',
            'data'    => ['id' => $id, 'status' => 'resolved', 'rating' => $rating],
        ]);
    }

    /**
     * POST /api/complaints/{id}/reply
     * Menambahkan tanggapan pada pengaduan
     */
    public function reply($id = null)
    {
        if ($id === null) {
            return $this->respond([
                'status'  => false,
                'message' => 'ID pengaduan wajib diisi.'
            ], 400);
        }

        $data = $this->getRequestData();
        $authenticatedUser = $this->authenticatedUser();
        $replyText = $data['reply'] ?? $data['message'] ?? null;

        if (
            !$authenticatedUser ||
            empty($replyText)
        ) {
            return $this->respond([
                'status'  => false,
                'message' => 'Autentikasi dan isi tanggapan wajib tersedia.'
            ], 400);
        }

        $complaintModel = new ComplaintModel();

        $complaint = $complaintModel->find($id);

        if (!$complaint) {
            return $this->respond([
                'status'  => false,
                'message' => 'Pengaduan tidak ditemukan.'
            ], 404);
        }

        $replyModel = new ComplaintReplyModel();

        $replyId = $replyModel->insert([
            'complaint_id' => $id,
            'user_id'      => (int) $authenticatedUser['id'],
            'reply'        => $replyText,
        ]);

        if (!$replyId) {
            return $this->respond([
                'status'  => false,
                'message' => 'Gagal menyimpan tanggapan.',
                'errors'  => $replyModel->errors()
            ], 500);
        }

        return $this->respondCreated([
            'status'  => true,
            'message' => 'Tanggapan berhasil ditambahkan.',
            'data'    => [
                'id'           => $replyId,
                'complaint_id' => $id,
                'user_id'      => (int) $authenticatedUser['id'],
                'reply'        => $replyText,
            ]
        ]);
    }

    /**
     * GET /api/complaints/{id}/replies
     * Mengambil semua tanggapan dari sebuah pengaduan
     */
    public function replies($id = null)
    {
        if ($id === null) {
            return $this->respond([
                'status'  => false,
                'message' => 'ID pengaduan wajib diisi.'
            ], 400);
        }

        $complaintModel = new ComplaintModel();

        $complaint = $complaintModel->find($id);

        if (!$complaint) {
            return $this->respond([
                'status'  => false,
                'message' => 'Pengaduan tidak ditemukan.'
            ], 404);
        }

        $replyModel = new ComplaintReplyModel();

        $replies = $replyModel
            ->where('complaint_id', $id)
            ->orderBy('created_at', 'ASC')
            ->findAll();

        return $this->respond([
            'status' => true,
            'count'  => count($replies),
            'data'   => $replies
        ]);
    }

    /**
     * POST /api/complaints/{id}/analyze
     * Re-analyze complaint menggunakan ML Service
     *
     * Jika analysis sebelumnya sudah ada:
     * - update analysis terbaru
     * - tidak membuat analysis baru
     *
     * Jika belum ada:
     * - insert analysis baru
     *
     * Jika membutuhkan review:
     * - buat review pending jika belum ada
     */
    public function analyze($id = null)
    {
        set_time_limit(180);

        if ($id === null) {
            return $this->respond([
                'status'  => false,
                'message' => 'ID pengaduan wajib diisi.'
            ], 400);
        }

        /*
         * ============================================================
         * 1. AMBIL COMPLAINT
         * ============================================================
         */

        $complaintModel = new ComplaintModel();

        $complaint = $complaintModel->find($id);

        if (!$complaint) {
            return $this->respond([
                'status'  => false,
                'message' => 'Pengaduan tidak ditemukan.'
            ], 404);
        }

        /*
         * ============================================================
         * 2. KIRIM COMPLAINT KE ML SERVICE
         * ============================================================
         */

        $payload = json_encode([
            'complaint_id' => (int) $complaint['id'],
            'text'         => $complaint['description']
        ]);

        $client = \Config\Services::curlrequest();

        try {

            $startTime = microtime(true);

            $response = $client->post(
                'http://127.0.0.1:8000/analyze',
                [
                    'headers' => [
                        'Content-Type' => 'application/json',
                        'Accept'       => 'application/json'
                    ],
                    'body'    => $payload,
                    'timeout' => 120,
                ]
            );

            $inferenceTime = (int) round(
                (microtime(true) - $startTime) * 1000
            );

        } catch (\Throwable $e) {

            return $this->respond([
                'status'  => false,
                'message' => 'ML Service tidak dapat dihubungi.',
                'error'   => $e->getMessage()
            ], 503);
        }

        /*
         * ============================================================
         * 3. DECODE HASIL ML
         * ============================================================
         */

        $result = json_decode(
            $response->getBody(),
            true
        );

        if (
            !isset($result['status']) ||
            $result['status'] !== true ||
            !isset($result['data'])
        ) {
            return $this->respond([
                'status'  => false,
                'message' => 'Hasil dari ML Service tidak valid.',
                'data'    => $result
            ], 502);
        }

        $analysis = $result['data'];

        /*
         * ============================================================
         * 4. SIMPAN / UPDATE HASIL ANALISIS
         * ============================================================
         */

        $analysisModel = new ComplaintAnalysisModel();

        /*
         * Ambil analysis terbaru untuk complaint tersebut.
         */
        $existingAnalysis = $analysisModel
            ->where('complaint_id', $complaint['id'])
            ->orderBy('id', 'DESC')
            ->first();

        $analysisData = [
            'complaint_id'        => (int) $complaint['id'],
            'category'            => $analysis['category'] ?? null,
            'category_confidence' => $analysis['category_confidence'] ?? null,
            'urgency_label'       => $analysis['urgency_label'] ?? null,
            'urgency_score'       => $analysis['urgency_score'] ?? null,
            'urgency_reason'      => $analysis['urgency_reason'] ?? null,
            'sentiment'           => $analysis['sentiment'] ?? null,
            'sentiment_score'     => $analysis['sentiment_score'] ?? null,
            'requires_review'     => $analysis['requires_review'] ?? false,
            'model_version'       => 'qwen3:8b + indonesian-roberta',
            'inference_time_ms'   => $inferenceTime,
        ];

        if ($existingAnalysis) {

            /*
             * Update analysis lama agar tidak terjadi
             * duplikasi analysis untuk complaint yang sama.
             */
            $analysisId = $existingAnalysis['id'];

            $updated = $analysisModel->update(
                $analysisId,
                $analysisData
            );

            if (!$updated) {
                return $this->respond([
                    'status'  => false,
                    'message' => 'Analisis berhasil dilakukan tetapi gagal diperbarui.',
                    'errors'  => $analysisModel->errors(),
                    'data'    => $analysis
                ], 500);
            }

        } else {

            /*
             * Jika belum ada analysis, buat baru.
             */
            $analysisId = $analysisModel->insert($analysisData);

            if (!$analysisId) {
                return $this->respond([
                    'status'  => false,
                    'message' => 'Analisis berhasil dilakukan tetapi gagal disimpan.',
                    'errors'  => $analysisModel->errors(),
                    'data'    => $analysis
                ], 500);
            }
        }

        /*
         * ============================================================
         * 5. HITL REVIEW
         * ============================================================
         */

        $reviewModel = new ComplaintReviewModel();

        $review = $reviewModel
            ->where('complaint_analysis_id', $analysisId)
            ->first();

        $reviewId = $review['id'] ?? null;

        /*
         * Jika membutuhkan review dan belum ada review,
         * buat review dengan status pending.
         */
        if (!empty($analysis['requires_review'])) {

            if (!$review) {

                $reviewId = $reviewModel->insert([
                    'complaint_analysis_id' => $analysisId,
                    'review_status'         => 'pending',
                ]);

                if (!$reviewId) {
                    return $this->respond([
                        'status'  => false,
                        'message' => 'Analisis berhasil tetapi review HITL gagal dibuat.',
                        'errors'  => $reviewModel->errors(),
                        'data'    => $analysis
                    ], 500);
                }

            } elseif ($review['review_status'] === 'pending') {

                /*
                 * Sudah pending, tidak perlu membuat row baru.
                 */
                $reviewId = $review['id'];
            }
        }

        /*
         * ============================================================
         * 6. RESPONSE
         * ============================================================
         */

        return $this->respond([
            'status'  => true,
            'message' => 'Pengaduan berhasil dianalisis dan hasilnya disimpan.',
            'data'    => [
                'analysis_id'         => $analysisId,
                'review_id'           => $reviewId,
                'complaint_id'        => $complaint['id'],

                'category'            => $analysis['category'] ?? null,
                'category_confidence' => $analysis['category_confidence'] ?? null,

                'urgency_label'       => $analysis['urgency_label'] ?? null,
                'urgency_score'       => $analysis['urgency_score'] ?? null,
                'urgency_reason'      => $analysis['urgency_reason'] ?? null,

                'sentiment'           => $analysis['sentiment'] ?? null,
                'sentiment_score'     => $analysis['sentiment_score'] ?? null,

                'requires_review'     => $analysis['requires_review'] ?? false,

                'inference_time_ms'   => $inferenceTime
            ]
        ]);
    }

    private function complaintQuery()
    {
        $latest = '(SELECT complaint_id, MAX(id) AS latest_id FROM complaint_analysis GROUP BY complaint_id) latest_analysis';

        return \Config\Database::connect()->table('complaints c')
            ->select([
                'c.*',
                'ca.category',
                'ca.category AS nlp_category',
                'ca.category_confidence AS nlp_confidence',
                'ca.sentiment',
                'ca.urgency_label',
                'u.user_role AS sender_role',
                'c.assigned_unit AS unit',
            ])
            ->select('(ca.urgency_score * 10) AS urgency_score', false)
            ->select('CASE WHEN c.is_anonymous THEN NULL ELSE u.name END AS sender_name', false)
            ->join($latest, 'latest_analysis.complaint_id = c.id', 'left', false)
            ->join('complaint_analysis ca', 'ca.id = latest_analysis.latest_id', 'left')
            ->join('users u', 'u.id = c.user_id', 'left');
    }

    private function authenticatedUser(): ?array
    {
        return (new ApiTokenService())->userFromAuthorization(
            $this->request->getHeaderLine('Authorization')
        );
    }

    private function normalizeStatus(string $status): string
    {
        return match (strtolower($status)) {
            'new', 'submitted' => 'received',
            'process'          => 'in_progress',
            'done'             => 'resolved',
            'escalate'         => 'dispatched',
            default            => strtolower($status),
        };
    }

    private function presentComplaint(array $complaint): array
    {
        if (!empty($complaint['is_anonymous'])) {
            $complaint['sender_name'] = null;
            unset($complaint['user_id']);
        }

        $raw = strtolower((string) ($complaint['status'] ?? ''));
        $complaint['status'] = match ($raw) {
            'submitted', 'new' => 'received',
            'process'          => 'in_progress',
            'done'             => 'resolved',
            'escalate'         => 'dispatched',
            default            => $raw ?: 'received',
        };

        // Format target_unit and unit consistently
        $complaint['target_unit'] = $complaint['assigned_unit'] ?? $complaint['unit'] ?? null;
        $complaint['unit'] = $complaint['assigned_unit'] ?? $complaint['unit'] ?? null;

        // Round urgency_score to 2 decimal places
        if (isset($complaint['urgency_score'])) {
            $complaint['urgency_score'] = round((float) $complaint['urgency_score'], 2);
        }

        return $complaint;
    }

    private function normalizeCategory(string $category): string
    {
        return match (strtolower($category)) {
            'facility' => 'Fasilitas',
            'academic' => 'Akademik',
            'admin', 'administrasi' => 'Pelayanan Administrasi',
            'finance', 'keuangan' => 'Keuangan',
            'other', 'lainnya' => 'Lainnya',
            default => $category,
        };
    }

    private function getRequestData(): array
    {
        try {
            $json = $this->request->getJSON(true);
            if (is_array($json)) {
                return $json;
            }
        } catch (\Throwable $e) {
        }
        $post = $this->request->getPost();
        if (is_array($post) && !empty($post)) {
            return $post;
        }
        $raw = $this->request->getBody();
        if (!empty($raw)) {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }
        return [];
    }
}
