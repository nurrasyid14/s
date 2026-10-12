<?php

namespace App\Controllers;

use App\Libraries\ApiTokenService;
use App\Models\ComplaintReviewModel;
use App\Models\ComplaintAnalysisModel;
use App\Models\ComplaintModel;
use App\Models\UserModel;

class ReviewController extends BaseController
{
    protected ComplaintReviewModel $reviewModel;
    protected ComplaintAnalysisModel $analysisModel;
    protected ComplaintModel $complaintModel;
    protected UserModel $userModel;

    public function __construct()
    {
        $this->reviewModel   = new ComplaintReviewModel();
        $this->analysisModel = new ComplaintAnalysisModel();
        $this->complaintModel = new ComplaintModel();
        $this->userModel     = new UserModel();
    }

    /**
     * GET /api/reviews/pending
     *
     * Mengambil seluruh pengaduan yang membutuhkan
     * Human-in-the-Loop dan belum selesai direview.
     */
    public function pending()
    {
        $db = \Config\Database::connect();

        $builder = $db->table('complaint_analysis ca');

        $builder->select([
            'ca.id AS analysis_id',
            'ca.complaint_id',
            'ca.category',
            'ca.category_confidence',
            'ca.urgency_label',
            'ca.urgency_score',
            'ca.urgency_reason',
            'ca.sentiment',
            'ca.sentiment_score',
            'ca.requires_review',
            'ca.model_version',
            'ca.inference_time_ms',

            'c.ticket_id',
            'c.description',
            'c.status',
            'c.type',
            'c.is_anonymous',
            'c.assigned_unit',
            'c.created_at AS complaint_created_at',

            'cr.id AS review_id',
            'cr.review_status',
            'cr.reviewed_by',
            'cr.reviewed_at',
            'cr.review_note',
            'cr.final_category',
            'cr.final_urgency_label',
            'cr.final_urgency_score',
        ]);

        $builder->join(
            'complaints c',
            'c.id = ca.complaint_id',
            'inner'
        );

        $builder->join(
            'complaint_reviews cr',
            'cr.complaint_analysis_id = ca.id',
            'left'
        );

        $builder->where('ca.requires_review', true);

        $builder->groupStart();
        $builder->where('cr.review_status', 'pending');
        $builder->orWhere('cr.id IS NULL', null, false);
        $builder->groupEnd();

        $builder->orderBy('ca.urgency_score', 'DESC');
        $builder->orderBy('c.created_at', 'DESC');

        $results = $builder->get()->getResultArray();

        return $this->response->setJSON([
            'status'  => true,
            'message' => 'Review queue berhasil diambil.',
            'total'   => count($results),
            'data'    => $results,
        ]);
    }

    /**
     * GET /api/reviews/{id}
     *
     * Mengambil detail satu review beserta analisis AI, aduan, dan reviewer.
     */
    public function show($id = null)
    {
        if ($id === null || !ctype_digit((string) $id)) {
            return $this->response->setJSON([
                'status'  => false,
                'message' => 'ID review tidak valid.',
            ])->setStatusCode(400);
        }

        $review = $this->reviewModel->find((int) $id);

        if (!$review) {
            return $this->response->setJSON([
                'status'  => false,
                'message' => 'Review tidak ditemukan.',
            ])->setStatusCode(404);
        }

        $analysis = $this->analysisModel->find($review['complaint_analysis_id']);

        if (!$analysis) {
            return $this->response->setJSON([
                'status'  => false,
                'message' => 'Analisis terkait review tidak ditemukan.',
            ])->setStatusCode(404);
        }

        $complaint = $this->complaintModel->find($analysis['complaint_id']);

        if (!$complaint) {
            return $this->response->setJSON([
                'status'  => false,
                'message' => 'Aduan terkait review tidak ditemukan.',
            ])->setStatusCode(404);
        }

        $reviewer = null;
        if (!empty($review['reviewed_by'])) {
            $reviewer = $this->userModel
                ->select('id, name, email, role, user_role, institution, position')
                ->find($review['reviewed_by']);
        }

        if (!empty($complaint['is_anonymous'])) {
            unset($complaint['user_id']);
        }

        return $this->response->setJSON([
            'status'  => true,
            'message' => 'Detail review berhasil diambil.',
            'data'    => [
                'review'      => $review,
                'complaint'   => $complaint,
                'ai_analysis' => $analysis,
                'reviewer'    => $reviewer,
            ],
        ]);
    }

    /**
     * POST /api/reviews/{id}
     *
     * Menyimpan hasil review manusia.
     *
     * Body:
     * {
     *   "reviewed_by": 2,
     *   "final_category": "Fasilitas",
     *   "final_urgency_label": "high",
     *   "final_urgency_score": 0.85,
     *   "review_note": "Hasil AI sudah sesuai."
     * }
     */
    public function submit($id = null)
    {
        if ($id === null || !ctype_digit((string) $id)) {
            return $this->response->setJSON([
                'status'  => false,
                'message' => 'ID review tidak valid.'
            ])->setStatusCode(400);
        }

        /*
         * ============================================================
         * 1. AMBIL REVIEW
         * ============================================================
         */

        $review = $this->reviewModel->find($id);

        if (!$review) {
            return $this->response->setJSON([
                'status'  => false,
                'message' => 'Review tidak ditemukan.'
            ])->setStatusCode(404);
        }

        /*
         * ============================================================
         * 2. CEK STATUS REVIEW
         * ============================================================
         */

        if ($review['review_status'] === 'reviewed') {
            return $this->response->setJSON([
                'status'  => false,
                'message' => 'Review ini sudah diselesaikan.'
            ])->setStatusCode(409);
        }

        /*
         * ============================================================
         * 3. AMBIL BODY REQUEST
         * ============================================================
         */

        $data = $this->request->getJSON(true);

        if (!is_array($data)) {
            return $this->response->setJSON([
                'status'  => false,
                'message' => 'Request body harus berupa JSON yang valid.',
            ])->setStatusCode(400);
        }

        /*
         * ============================================================
         * 4. VALIDASI REVIEWER
         * ============================================================
         */

        $authenticatedReviewer = (new ApiTokenService())->userFromAuthorization(
            $this->request->getHeaderLine('Authorization')
        );

        if (!$authenticatedReviewer) {
            return $this->response->setJSON([
                'status'  => false,
                'message' => 'Autentikasi reviewer tidak valid.'
            ])->setStatusCode(401);
        }

        if (
            isset($data['reviewed_by'])
            && (int) $data['reviewed_by'] !== (int) $authenticatedReviewer['id']
        ) {
            return $this->response->setJSON([
                'status'  => false,
                'message' => 'reviewed_by harus sesuai dengan akun yang sedang login.'
            ])->setStatusCode(403);
        }

        /*
         * ============================================================
         * 5. VALIDASI FINAL CATEGORY
         * ============================================================
         */

        $allowedCategories = [
            'Akademik',
            'Keuangan',
            'Fasilitas',
            'Sarana IT',
            'Kemahasiswaan',
            'Beasiswa',
            'Perpustakaan',
            'Parkir & Keamanan',
            'Kebersihan & Lingkungan',
            'Kerjasama & Mitra',
            'Pelayanan Administrasi',
            'Lainnya',
        ];

        if (empty($data['final_category'])) {
            return $this->response->setJSON([
                'status'  => false,
                'message' => 'final_category wajib diisi.'
            ])->setStatusCode(400);
        }

        if (!in_array($data['final_category'], $allowedCategories)) {
            return $this->response->setJSON([
                'status'  => false,
                'message' => 'final_category tidak valid.',
                'allowed_categories' => $allowedCategories
            ])->setStatusCode(400);
        }

        /*
         * ============================================================
         * 6. VALIDASI FINAL URGENCY
         * ============================================================
         */

        $allowedUrgency = [
            'low',
            'medium',
            'high',
            'critical',
        ];

        if (empty($data['final_urgency_label'])) {
            return $this->response->setJSON([
                'status'  => false,
                'message' => 'final_urgency_label wajib diisi.'
            ])->setStatusCode(400);
        }

        if (!in_array($data['final_urgency_label'], $allowedUrgency)) {
            return $this->response->setJSON([
                'status'  => false,
                'message' => 'final_urgency_label tidak valid.',
                'allowed_urgency' => $allowedUrgency
            ])->setStatusCode(400);
        }

        /*
         * ============================================================
         * 7. VALIDASI URGENCY SCORE
         * ============================================================
         */

        if (
            !isset($data['final_urgency_score']) ||
            !is_numeric($data['final_urgency_score'])
        ) {
            return $this->response->setJSON([
                'status'  => false,
                'message' => 'final_urgency_score wajib berupa angka.'
            ])->setStatusCode(400);
        }

        $finalUrgencyScore = (float) $data['final_urgency_score'];

        if ($finalUrgencyScore < 0 || $finalUrgencyScore > 1) {
            return $this->response->setJSON([
                'status'  => false,
                'message' => 'final_urgency_score harus berada di antara 0 dan 1.'
            ])->setStatusCode(400);
        }

        /*
         * ============================================================
         * 8. AMBIL ANALYSIS
         * ============================================================
         */

        $analysis = $this->analysisModel->find(
            $review['complaint_analysis_id']
        );

        if (!$analysis) {
            return $this->response->setJSON([
                'status'  => false,
                'message' => 'Analysis terkait review tidak ditemukan.'
            ])->setStatusCode(404);
        }

        /*
         * ============================================================
         * 9. SIMPAN HASIL HUMAN REVIEW
         * ============================================================
         */

        $updated = $this->reviewModel->update($id, [
            'review_status'       => 'reviewed',
            'reviewed_by'         => (int) $authenticatedReviewer['id'],
            'reviewed_at'         => date('Y-m-d H:i:s'),
            'review_note'         => $data['review_note'] ?? null,
            'final_category'      => $data['final_category'],
            'final_urgency_label' => $data['final_urgency_label'],
            'final_urgency_score' => $finalUrgencyScore,
        ]);

        if (!$updated) {
            return $this->response->setJSON([
                'status'  => false,
                'message' => 'Gagal menyimpan hasil review.',
                'errors'  => $this->reviewModel->errors()
            ])->setStatusCode(500);
        }

        /*
         * ============================================================
         * 10. RESPONSE
         * ============================================================
         */

        $updatedReview = $this->reviewModel->find($id);

        return $this->response->setJSON([
            'status'  => true,
            'message' => 'Human review berhasil disimpan.',
            'data'    => [
                'review'  => $updatedReview,
                'analysis' => [
                    'id'                   => $analysis['id'],
                    'ai_category'          => $analysis['category'],
                    'ai_category_confidence' => $analysis['category_confidence'],
                    'ai_urgency_label'     => $analysis['urgency_label'],
                    'ai_urgency_score'     => $analysis['urgency_score'],
                    'ai_sentiment'         => $analysis['sentiment'],
                ],
            ]
        ]);
    }
}
