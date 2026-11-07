<?php

namespace App\Controllers;

use App\Libraries\ApiTokenService;
use App\Models\ComplaintModel;
use App\Models\ComplaintReplyModel;
use App\Models\ComplaintAnalysisModel;
use App\Models\ComplaintReviewModel;
use App\Services\ComplaintService;
use App\Services\MLService;
use App\Services\EvidenceService;
use CodeIgniter\RESTful\ResourceController;
use InvalidArgumentException;
use Throwable;

class ComplaintController extends ResourceController
{
    protected $format = 'json';

    private ComplaintService $complaintService;
    private MLService $mlService;
    private EvidenceService $evidenceService;

    public function __construct(
        ?ComplaintService $complaintService = null,
        ?MLService $mlService = null,
        ?EvidenceService $evidenceService = null
    ) {
        $this->complaintService = $complaintService ?? new ComplaintService();
        $this->mlService        = $mlService ?? new MLService();
        $this->evidenceService  = $evidenceService ?? new EvidenceService();
    }

    /**
     * GET /api/complaints
     * Mengambil daftar seluruh pengaduan dengan filter.
     */
    public function index()
    {
        $page  = max(1, (int) ($this->request->getGet('page') ?? 1));
        $limit = min(100, max(1, (int) ($this->request->getGet('limit') ?? 10)));
        $builder = $this->complaintQuery();

        $user = $this->authenticatedUser();
        if ($user && $user['role'] === 'stakeholder' && !empty($user['unit'])) {
            $builder->like('c.assigned_unit', trim($user['unit']));
        } elseif ($this->request->getGet('unit')) {
            $builder->like('c.assigned_unit', trim((string) $this->request->getGet('unit')));
        }

        $status = $this->request->getGet('status');
        if ($status !== null && $status !== '') {
            $builder->where('c.status', $this->complaintService->normalizeStatus((string) $status));
        }

        $type = $this->request->getGet('type');
        if ($type !== null && $type !== '') {
            $builder->where('c.type', $type);
        }

        $category = $this->request->getGet('category');
        if ($category !== null && $category !== '') {
            $builder->where('ca.category', $this->normalizeCategory((string) $category));
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

        $items = array_map(fn ($item) => $this->complaintService->presentComplaint($item), $items);

        return $this->respond([
            'status' => true,
            'items'  => $items,
            'total'  => $total,
            'page'   => $page,
            'limit'  => $limit,
        ]);
    }

    /**
     * GET /api/complaints/my
     * Mengambil pengaduan milik pengguna yang sedang login.
     */
    public function my()
    {
        $user = $this->authenticatedUser();
        if (!$user) {
            return $this->respond(['status' => false, 'message' => 'Autentikasi diperlukan.'], 401);
        }

        $items = $this->complaintQuery()
            ->where('c.user_id', (int) $user['id'])
            ->orderBy('c.created_at', 'DESC')
            ->get()->getResultArray();

        return $this->respond(array_map(fn ($item) => $this->complaintService->presentComplaint($item), $items));
    }

    /**
     * GET /api/complaints/{id}
     * Mengambil detail satu pengaduan lengkap dengan jejak workflow.
     */
    public function show($id = null)
    {
        if ($id === null) {
            return $this->respond(['status' => false, 'message' => 'ID pengaduan wajib diisi.'], 400);
        }

        $user = $this->authenticatedUser();
        if (!$user) {
            return $this->respond(['status' => false, 'message' => 'Autentikasi diperlukan.'], 401);
        }

        $detail = $this->complaintService->getComplaintDetail((int) $id, $user);
        if (!$detail) {
            return $this->respond(['status' => false, 'message' => 'Pengaduan tidak ditemukan.'], 404);
        }

        return $this->respond($detail);
    }

    /**
     * POST /api/complaints
     * Membuat pengaduan baru melalui ComplaintService.
     */
    public function create()
    {
        set_time_limit(180);

        $data = $this->getRequestData();
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->respond(['status' => false, 'message' => 'Autentikasi diperlukan.'], 401);
        }

        if (empty($data['type']) || empty($data['description'])) {
            return $this->respond([
                'status'  => false,
                'message' => 'Tipe pengajuan dan deskripsi wajib diisi.',
            ], 400);
        }

        try {
            $files = $this->request->getFiles();
            $result = $this->complaintService->createComplaint($data, $user, $files);
            return $this->respondCreated($result);
        } catch (InvalidArgumentException $e) {
            return $this->respond(['status' => false, 'message' => $e->getMessage()], 400);
        } catch (Throwable $e) {
            log_message('error', 'Gagal membuat pengaduan: ' . $e->getMessage());
            return $this->respond([
                'status'  => false,
                'message' => 'Terjadi kesalahan internal saat memproses pengaduan.',
            ], 500);
        }
    }

    /**
     * PATCH /api/complaints/{id}/status
     * Mengubah status pengaduan dengan validasi peran.
     */
    public function updateStatus($id = null)
    {
        if ($id === null) {
            return $this->respond(['status' => false, 'message' => 'ID pengaduan wajib diisi.'], 400);
        }

        $data = $this->getRequestData();
        $user = $this->authenticatedUser();
        if (!$user) {
            return $this->respond(['status' => false, 'message' => 'Autentikasi diperlukan.'], 401);
        }

        if (empty($data['status'])) {
            return $this->respond(['status' => false, 'message' => 'Status wajib diisi.'], 400);
        }

        try {
            $assignedUnit = $data['assigned_unit'] ?? $data['unit'] ?? $data['target_unit'] ?? null;
            $note = $data['note'] ?? null;
            $res = $this->complaintService->updateStatus((int) $id, (string) $data['status'], $note, $assignedUnit, $user);
            return $this->respond($res);
        } catch (InvalidArgumentException $e) {
            return $this->respond(['status' => false, 'message' => $e->getMessage()], 400);
        } catch (Throwable $e) {
            log_message('error', 'Gagal update status: ' . $e->getMessage());
            return $this->respond(['status' => false, 'message' => 'Gagal memperbarui status pengaduan.'], 500);
        }
    }

    /**
     * PATCH /api/admin/complaints/{id}/verify or PATCH /api/complaints/{id}/verify
     * Verifikasi aduan oleh Admin Sentral.
     */
    public function verify($id = null)
    {
        if ($id === null) {
            return $this->respond(['status' => false, 'message' => 'ID pengaduan wajib diisi.'], 400);
        }

        $user = $this->authenticatedUser();
        if (!$user || !in_array($user['role'], ['admin', 'stakeholder'], true)) {
            return $this->respond(['status' => false, 'message' => 'Otoritas verifikasi diperlukan.'], 403);
        }

        $data = $this->getRequestData();
        $verified = isset($data['verified']) ? (bool) $data['verified'] : true;
        $note = trim((string) ($data['note'] ?? ''));

        try {
            $res = $this->complaintService->verifyComplaint((int) $id, $verified, $note, $user);
            return $this->respond($res);
        } catch (InvalidArgumentException $e) {
            return $this->respond(['status' => false, 'message' => $e->getMessage()], 404);
        } catch (Throwable $e) {
            log_message('error', 'Gagal verifikasi: ' . $e->getMessage());
            return $this->respond(['status' => false, 'message' => 'Gagal memproses verifikasi aduan.'], 500);
        }
    }

    /**
     * POST /api/admin/complaints/{id}/disposition or POST /api/complaints/{id}/disposition
     * Disposisi aduan ke unit terkait oleh Admin Sentral.
     */
    public function dispatch($id = null)
    {
        if ($id === null) {
            return $this->respond(['status' => false, 'message' => 'ID pengaduan wajib diisi.'], 400);
        }

        $user = $this->authenticatedUser();
        if (!$user || !in_array($user['role'], ['admin', 'stakeholder'], true)) {
            return $this->respond(['status' => false, 'message' => 'Otoritas disposisi diperlukan.'], 403);
        }

        $data = $this->getRequestData();
        $targetUnit = trim((string) ($data['target_unit'] ?? $data['unit'] ?? ''));
        $pic = trim((string) ($data['assigned_pic'] ?? ''));
        $note = trim((string) ($data['disposition_note'] ?? ''));
        $slaDate = $data['target_sla_date'] ?? null;

        if ($targetUnit === '') {
            return $this->respond(['status' => false, 'message' => 'Unit target disposisi wajib ditentukan.'], 400);
        }

        try {
            $res = $this->complaintService->dispatchComplaint((int) $id, $targetUnit, $pic, $note, $slaDate, $user);
            return $this->respond($res);
        } catch (InvalidArgumentException $e) {
            return $this->respond(['status' => false, 'message' => $e->getMessage()], 400);
        } catch (Throwable $e) {
            log_message('error', 'Gagal disposisi: ' . $e->getMessage());
            return $this->respond(['status' => false, 'message' => 'Gagal memproses disposisi aduan.'], 500);
        }
    }

    /**
     * POST /api/unit/complaints/{id}/accept
     * Unit mengakui dan memulai proses penanganan aduan (in_progress).
     */
    public function accept($id = null)
    {
        if ($id === null) {
            return $this->respond(['status' => false, 'message' => 'ID pengaduan wajib diisi.'], 400);
        }

        $user = $this->authenticatedUser();
        if (!$user) {
            return $this->respond(['status' => false, 'message' => 'Autentikasi diperlukan.'], 401);
        }

        $data = $this->getRequestData();
        $pic = trim((string) ($data['pic_name'] ?? ''));
        $note = trim((string) ($data['note'] ?? ''));

        try {
            $res = $this->complaintService->acceptByUnit((int) $id, $pic, $note, $user);
            return $this->respond($res);
        } catch (InvalidArgumentException $e) {
            return $this->respond(['status' => false, 'message' => $e->getMessage()], 400);
        } catch (Throwable $e) {
            log_message('error', 'Gagal penerimaan unit: ' . $e->getMessage());
            return $this->respond(['status' => false, 'message' => 'Gagal memproses penerimaan tugas unit.'], 500);
        }
    }

    /**
     * POST /api/unit/complaints/{id}/followup
     * Unit mencatat tindak lanjut teknis di lapangan (action_taken).
     */
    public function followup($id = null)
    {
        if ($id === null) {
            return $this->respond(['status' => false, 'message' => 'ID pengaduan wajib diisi.'], 400);
        }

        $user = $this->authenticatedUser();
        if (!$user) {
            return $this->respond(['status' => false, 'message' => 'Autentikasi diperlukan.'], 401);
        }

        $data = $this->getRequestData();
        $actionType = trim((string) ($data['action_type'] ?? 'maintenance'));
        $note = trim((string) ($data['note'] ?? ''));
        $by = trim((string) ($data['performed_by'] ?? ''));
        $evidenceUrl = $data['evidence_url'] ?? null;

        try {
            $res = $this->complaintService->followupByUnit((int) $id, $actionType, $note, $by, $evidenceUrl, $user);
            return $this->respond($res);
        } catch (InvalidArgumentException $e) {
            return $this->respond(['status' => false, 'message' => $e->getMessage()], 400);
        } catch (Throwable $e) {
            log_message('error', 'Gagal tindak lanjut: ' . $e->getMessage());
            return $this->respond(['status' => false, 'message' => 'Gagal mencatat tindak lanjut teknis.'], 500);
        }
    }

    /**
     * POST /api/unit/complaints/{id}/answer
     * Unit menerbitkan jawaban resmi penyelesaian aduan (answered).
     */
    public function answer($id = null)
    {
        if ($id === null) {
            return $this->respond(['status' => false, 'message' => 'ID pengaduan wajib diisi.'], 400);
        }

        $user = $this->authenticatedUser();
        if (!$user) {
            return $this->respond(['status' => false, 'message' => 'Autentikasi diperlukan.'], 401);
        }

        $data = $this->getRequestData();
        $answer = trim((string) ($data['answer'] ?? ''));
        $by = trim((string) ($data['answered_by'] ?? ''));
        $attachments = isset($data['attachments']) && is_array($data['attachments']) ? $data['attachments'] : [];

        if ($answer === '') {
            return $this->respond(['status' => false, 'message' => 'Jawaban resmi tidak boleh kosong.'], 400);
        }

        try {
            $res = $this->complaintService->answerByUnit((int) $id, $answer, $by, $attachments, $user);
            return $this->respond($res);
        } catch (InvalidArgumentException $e) {
            return $this->respond(['status' => false, 'message' => $e->getMessage()], 400);
        } catch (Throwable $e) {
            log_message('error', 'Gagal jawaban resmi: ' . $e->getMessage());
            return $this->respond(['status' => false, 'message' => 'Gagal menerbitkan jawaban resmi unit.'], 500);
        }
    }

    /**
     * POST /api/complaints/{id}/feedback
     * Pengguna/Stakeholder memberikan evaluasi kepuasan & menyelesaikan aduan (resolved).
     */
    public function feedback($id = null)
    {
        if ($id === null) {
            return $this->respond(['status' => false, 'message' => 'ID pengaduan wajib diisi.'], 400);
        }

        $user = $this->authenticatedUser();
        if (!$user) {
            return $this->respond(['status' => false, 'message' => 'Autentikasi diperlukan.'], 401);
        }

        $data = $this->getRequestData();

        try {
            $res = $this->complaintService->submitFeedback((int) $id, $data, $user);
            return $this->respond($res);
        } catch (InvalidArgumentException $e) {
            return $this->respond(['status' => false, 'message' => $e->getMessage()], 400);
        } catch (Throwable $e) {
            log_message('error', 'Gagal feedback: ' . $e->getMessage());
            return $this->respond(['status' => false, 'message' => 'Gagal memproses feedback kepuasan.'], 500);
        }
    }

    /**
     * POST /api/complaints/{id}/reply
     * Menambahkan tanggapan/komentar umum pada pengaduan.
     */
    public function reply($id = null)
    {
        if ($id === null) {
            return $this->respond(['status' => false, 'message' => 'ID pengaduan wajib diisi.'], 400);
        }

        $user = $this->authenticatedUser();
        if (!$user) {
            return $this->respond(['status' => false, 'message' => 'Autentikasi diperlukan.'], 401);
        }

        $data = $this->getRequestData();
        $replyText = trim((string) ($data['reply'] ?? $data['message'] ?? ''));

        if ($replyText === '') {
            return $this->respond(['status' => false, 'message' => 'Isi tanggapan tidak boleh kosong.'], 400);
        }

        $complaintModel = new ComplaintModel();
        $complaint = $complaintModel->find($id);
        if (!$complaint) {
            return $this->respond(['status' => false, 'message' => 'Pengaduan tidak ditemukan.'], 404);
        }

        $replyModel = new ComplaintReplyModel();
        $replyId = $replyModel->insert([
            'complaint_id' => (int) $id,
            'user_id'      => (int) $user['id'],
            'reply'        => $replyText,
        ]);

        if (!$replyId) {
            return $this->respond([
                'status'  => false,
                'message' => 'Gagal menyimpan tanggapan.',
                'errors'  => $replyModel->errors(),
            ], 500);
        }

        return $this->respondCreated([
            'status'  => true,
            'message' => 'Tanggapan berhasil ditambahkan.',
            'data'    => [
                'id'           => $replyId,
                'complaint_id' => (int) $id,
                'user_id'      => (int) $user['id'],
                'reply'        => $replyText,
            ],
        ]);
    }

    /**
     * GET /api/complaints/{id}/replies
     * Mengambil daftar seluruh percakapan/tanggapan dari satu tiket pengaduan.
     */
    public function replies($id = null)
    {
        if ($id === null) {
            return $this->respond(['status' => false, 'message' => 'ID pengaduan wajib diisi.'], 400);
        }

        $complaintModel = new ComplaintModel();
        if (!$complaintModel->find($id)) {
            return $this->respond(['status' => false, 'message' => 'Pengaduan tidak ditemukan.'], 404);
        }

        $replyModel = new ComplaintReplyModel();
        $replies = $replyModel
            ->select('complaint_replies.id, complaint_replies.reply, complaint_replies.created_at, users.name AS by')
            ->join('users', 'users.id = complaint_replies.user_id', 'left')
            ->where('complaint_replies.complaint_id', (int) $id)
            ->orderBy('complaint_replies.created_at', 'ASC')
            ->findAll();

        return $this->respond([
            'status' => true,
            'count'  => count($replies),
            'data'   => $replies,
        ]);
    }

    /**
     * POST /api/complaints/{id}/analyze
     * Memicu analisis ulang pengaduan via ML Service.
     */
    public function analyze($id = null)
    {
        set_time_limit(180);

        if ($id === null) {
            return $this->respond(['status' => false, 'message' => 'ID pengaduan wajib diisi.'], 400);
        }

        $complaintModel = new ComplaintModel();
        $complaint = $complaintModel->find($id);
        if (!$complaint) {
            return $this->respond(['status' => false, 'message' => 'Pengaduan tidak ditemukan.'], 404);
        }

        $mlRes = $this->mlService->analyzeComplaint((int) $complaint['id'], (string) $complaint['description'], (string) $complaint['type']);
        if (!$mlRes['success'] || empty($mlRes['data'])) {
            return $this->respond([
                'status'  => false,
                'message' => 'ML Service tidak dapat menyelesaikan analisis: ' . ($mlRes['error'] ?? 'Unknown error'),
            ], 502);
        }

        $analysis = $mlRes['data'];
        $analysisModel = new ComplaintAnalysisModel();
        $existing = $analysisModel->where('complaint_id', $complaint['id'])->orderBy('id', 'DESC')->first();

        $analysisData = [
            'complaint_id'        => (int) $complaint['id'],
            'category'            => $analysis['category'] ?? null,
            'category_confidence' => $analysis['category_confidence'] ?? null,
            'urgency_label'       => $analysis['urgency_label'] ?? null,
            'urgency_score'       => $analysis['urgency_score'] ?? null,
            'urgency_reason'      => $analysis['urgency_reason'] ?? null,
            'sentiment'           => $analysis['sentiment'] ?? null,
            'sentiment_score'     => $analysis['sentiment_score'] ?? null,
            'sentiment_scores'    => isset($analysis['sentiment_scores']) ? json_encode($analysis['sentiment_scores']) : null,
            'submission_type'     => $analysis['submission_type'] ?? null,
            'requires_review'     => !empty($analysis['requires_review']),
            'model_version'       => 'qwen3.5:4b + indonesian-roberta',
            'inference_time_ms'   => $mlRes['inference_time_ms'],
        ];

        if ($existing) {
            $analysisId = $existing['id'];
            $analysisModel->update($analysisId, $analysisData);
        } else {
            $analysisId = $analysisModel->insert($analysisData);
        }

        $reviewModel = new ComplaintReviewModel();
        $review = $reviewModel->where('complaint_analysis_id', $analysisId)->first();
        $reviewId = $review['id'] ?? null;

        if (!empty($analysis['requires_review']) && !$review) {
            $reviewId = $reviewModel->insert([
                'complaint_analysis_id' => $analysisId,
                'review_status'         => 'pending',
            ]);
        }

        return $this->respond([
            'status'  => true,
            'message' => 'Pengaduan berhasil dianalisis ulang dan hasilnya diperbarui.',
            'data'    => [
                'analysis_id'         => (int) $analysisId,
                'review_id'           => $reviewId ? (int) $reviewId : null,
                'complaint_id'        => (int) $complaint['id'],
                'category'            => $analysis['category'] ?? null,
                'category_confidence' => $analysis['category_confidence'] ?? null,
                'urgency_label'       => $analysis['urgency_label'] ?? null,
                'urgency_score'       => $analysis['urgency_score'] ?? null,
                'urgency_reason'      => $analysis['urgency_reason'] ?? null,
                'sentiment'           => $analysis['sentiment'] ?? null,
                'sentiment_score'     => $analysis['sentiment_score'] ?? null,
                'submission_type'     => $analysis['submission_type'] ?? null,
                'requires_review'     => !empty($analysis['requires_review']),
                'inference_time_ms'   => $mlRes['inference_time_ms'],
            ],
        ]);
    }

    /**
     * Query dasar join complaints + latest analysis + users.
     */
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
                'ca.sentiment_scores',
                'ca.submission_type',
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

    /**
     * Mengambil profil pengguna yang terautentikasi melalui Bearer Token.
     */
    private function authenticatedUser(): ?array
    {
        return (new ApiTokenService())->userFromAuthorization(
            $this->request->getHeaderLine('Authorization')
        );
    }

    /**
     * Normalisasi kategori filter frontend.
     */
    private function normalizeCategory(string $category): string
    {
        return match (strtolower($category)) {
            'facility'              => 'Sarana Prasarana dan Layanan Umum',
            'academic'              => 'Akademik',
            'admin', 'administrasi' => 'SDM/Kepegawaian',
            'finance', 'keuangan'   => 'Keuangan',
            'other', 'lainnya'      => 'Lainnya/Lintas Unit',
            default                 => $category,
        };
    }

    /**
     * Membaca request payload baik dari JSON maupun FormData.
     */
    private function getRequestData(): array
    {
        try {
            $json = $this->request->getJSON(true);
            if (is_array($json)) {
                return $json;
            }
        } catch (Throwable) {
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
