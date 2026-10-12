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
        $complaint['followups'] = array_map(static fn ($reply) => [
            'id'         => (int) $reply['id'],
            'by'         => $reply['by'] ?? 'Stakeholder',
            'note'       => $reply['reply'],
            'status'     => 'process',
            'created_at' => $reply['created_at'],
        ], $replies);
        $complaint['attachments'] = [];

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

        $data = $this->request->getJSON(true);
        if (!is_array($data)) {
            $data = $this->request->getPost();
        }
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

        try {

            $startTime = microtime(true);

            $response = $client->post(
                'http://localhost:8000/analyze',
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
         * 3. DECODE HASIL ML SERVICE
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
                'message' => 'Analisis pengaduan gagal.',
                'data'    => $result
            ], 502);
        }

        $analysis = $result['data'];

        /*
         * ============================================================
         * 4. PASTIKAN HASIL PII REDACTION TERSEDIA
         * ============================================================
         */

        if (
            !isset($analysis['redacted_text']) ||
            trim($analysis['redacted_text']) === ''
        ) {
            return $this->respond([
                'status'  => false,
                'message' => 'Teks hasil PII redaction tidak tersedia.'
            ], 502);
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

        $data = $this->request->getJSON(true);

        if (empty($data['status'])) {
            return $this->respond([
                'status'  => false,
                'message' => 'Status wajib diisi.'
            ], 400);
        }

        $normalizedStatus = $this->normalizeStatus((string) $data['status']);
        $allowedStatuses = [
            'submitted',
            'in_progress',
            'resolved',
            'escalated',
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

        $updated = $complaintModel->update($id, [
            'status' => $normalizedStatus
        ]);

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

        $data = $this->request->getJSON(true);
        if (!is_array($data)) {
            $data = [];
        }
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
                'http://localhost:8000/analyze',
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
            'new' => 'submitted',
            'process' => 'in_progress',
            'done' => 'resolved',
            'escalate' => 'escalated',
            default => $status,
        };
    }

    private function presentComplaint(array $complaint): array
    {
        if (!empty($complaint['is_anonymous'])) {
            $complaint['sender_name'] = null;
            unset($complaint['user_id']);
        }

        $complaint['status'] = match (strtolower((string) ($complaint['status'] ?? ''))) {
            'submitted' => 'new',
            'in_progress' => 'process',
            'resolved' => 'done',
            'escalated' => 'escalate',
            default => $complaint['status'] ?? null,
        };

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
}
