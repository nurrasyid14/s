<?php

namespace App\Services;

use App\Models\ComplaintModel;
use App\Models\ComplaintAnalysisModel;
use App\Models\ComplaintReviewModel;
use App\Models\ComplaintReplyModel;
use DateTimeImmutable;
use RuntimeException;
use InvalidArgumentException;
use Throwable;

class ComplaintService
{
    private ComplaintModel $complaintModel;
    private ComplaintAnalysisModel $analysisModel;
    private ComplaintReviewModel $reviewModel;
    private ComplaintReplyModel $replyModel;
    private MLService $mlService;
    private PriorityService $priorityService;
    private SLAService $slaService;
    private FeedbackService $feedbackService;
    private EvidenceService $evidenceService;

    public function __construct(
        ?ComplaintModel $complaintModel = null,
        ?ComplaintAnalysisModel $analysisModel = null,
        ?ComplaintReviewModel $reviewModel = null,
        ?ComplaintReplyModel $replyModel = null,
        ?MLService $mlService = null,
        ?PriorityService $priorityService = null,
        ?SLAService $slaService = null,
        ?FeedbackService $feedbackService = null,
        ?EvidenceService $evidenceService = null
    ) {
        $this->complaintModel = $complaintModel ?? new ComplaintModel();
        $this->analysisModel  = $analysisModel ?? new ComplaintAnalysisModel();
        $this->reviewModel    = $reviewModel ?? new ComplaintReviewModel();
        $this->replyModel     = $replyModel ?? new ComplaintReplyModel();
        $this->mlService      = $mlService ?? new MLService();
        $this->priorityService = $priorityService ?? new PriorityService();
        $this->slaService     = $slaService ?? new SLAService();
        $this->feedbackService = $feedbackService ?? new FeedbackService();
        $this->evidenceService = $evidenceService ?? new EvidenceService();
    }

    /**
     * Buat pengaduan baru dengan alur:
     * 1. Inferensi ML Service (dengan fallback heuristik aman).
     * 2. Sanitasi teks (hanya teks ter-redact PII yang disimpan).
     * 3. Transaksi atomik database untuk complaints + analysis + review + attachments.
     */
    public function createComplaint(array $data, array $authenticatedUser, array $files = []): array
    {
        $type = trim((string) ($data['type'] ?? 'complaint'));
        $description = trim((string) ($data['description'] ?? ''));
        $userPreferredCategory = $data['category'] ?? $data['unit'] ?? null;
        $isAnonymous = !empty($data['is_anonymous']);

        if ($type === '' || $description === '') {
            throw new InvalidArgumentException('Tipe pengajuan dan deskripsi wajib diisi.');
        }

        // 1. Hubungi ML Service (FastAPI)
        $mlResult = $this->mlService->analyzeComplaint(0, $description, $type);

        $analysis = null;
        $inferenceTime = $mlResult['inference_time_ms'];
        $isFallback = false;

        if ($mlResult['success'] && !empty($mlResult['data']['redacted_text'])) {
            $analysis = $mlResult['data'];
        } else {
            // Heuristic Fallback
            $isFallback = true;
            $analysis = $this->priorityService->generateFallbackAnalysis($description, $type, $userPreferredCategory);
            $inferenceTime = max(10, $inferenceTime);
        }

        // Teks yang disimpan ke database WAJIB yang sudah di-redact PII
        $storedDescription = $analysis['redacted_text'] ?? $this->priorityService->redactPIIFallback($description);

        // Ticket ID generator yang unik
        $ticketId = 'SL-' . date('YmdHis') . strtoupper(substr(bin2hex(random_bytes(3)), 0, 4));

        // Transaksi database multi-tabel (Atomik)
        $db = \Config\Database::connect();
        $db->transBegin();

        try {
            // 2. Simpan tiket pengaduan
            $complaintId = $this->complaintModel->insert([
                'ticket_id'     => $ticketId,
                'user_id'       => (int) $authenticatedUser['id'],
                'type'          => $type,
                'description'   => $storedDescription,
                'is_anonymous'  => $isAnonymous,
                'status'        => 'received',
                'assigned_unit' => $analysis['target_unit'] ?? null,
            ]);

            if (!$complaintId) {
                throw new RuntimeException('Gagal menyimpan data pengaduan: ' . json_encode($this->complaintModel->errors()));
            }

            // Simpan lampiran fisik jika ada
            if (!empty($files['attachments'])) {
                $rawList = is_array($files['attachments']) ? $files['attachments'] : [$files['attachments']];
                foreach ($rawList as $f) {
                    if ($f instanceof \CodeIgniter\HTTP\Files\UploadedFile && $f->isValid() && !$f->hasMoved()) {
                        try {
                            $stored = $this->evidenceService->storeAttachment($f, 'complaints');
                            $this->replyModel->insert([
                                'complaint_id' => $complaintId,
                                'user_id'      => (int) $authenticatedUser['id'],
                                'reply'        => sprintf(
                                    '[Lampiran Bukti] Nama: %s | Path: %s | Size: %d | Type: %s',
                                    $stored['original_name'],
                                    $stored['file_path'],
                                    $stored['file_size'],
                                    $stored['file_type']
                                ),
                            ]);
                        } catch (Throwable $attErr) {
                            log_message('warning', 'Gagal menyimpan lampiran pengaduan: ' . $attErr->getMessage());
                        }
                    }
                }
            }

            // 3. Simpan hasil analisis AI / Heuristik
            $analysisData = [
                'complaint_id'        => (int) $complaintId,
                'category'            => $analysis['category'] ?? null,
                'category_confidence' => $isFallback ? null : ($analysis['category_confidence'] ?? null),
                'urgency_label'       => $analysis['urgency_label'] ?? null,
                'urgency_score'       => $analysis['urgency_score'] ?? null,
                'urgency_reason'      => $analysis['urgency_reason'] ?? null,
                'sentiment'           => $analysis['sentiment'] ?? null,
                'sentiment_score'     => $isFallback ? null : ($analysis['sentiment_score'] ?? null),
                'sentiment_scores'    => isset($analysis['sentiment_scores']) && is_array($analysis['sentiment_scores'])
                    ? json_encode($analysis['sentiment_scores'])
                    : null,
                'submission_type'     => $analysis['submission_type'] ?? null,
                'requires_review'     => !empty($analysis['requires_review']),
                'model_version'       => $analysis['model_version'] ?? ($isFallback ? 'heuristic-fallback-v1.2' : 'qwen3.5:4b + indonesian-roberta'),
                'inference_time_ms'   => $inferenceTime,
            ];

            $analysisId = $this->analysisModel->insert($analysisData);
            if (!$analysisId) {
                throw new RuntimeException('Gagal menyimpan hasil analisis pengaduan: ' . json_encode($this->analysisModel->errors()));
            }

            // 4. Buat antrean peninjauan Human-in-the-Loop jika disyaratkan
            $reviewId = null;
            if (!empty($analysis['requires_review'])) {
                $reviewId = $this->reviewModel->insert([
                    'complaint_analysis_id' => $analysisId,
                    'review_status'         => 'pending',
                ]);
                if (!$reviewId) {
                    throw new RuntimeException('Gagal membuat antrean review pengaduan: ' . json_encode($this->reviewModel->errors()));
                }
            }

            $db->transCommit();
        } catch (Throwable $e) {
            $db->transRollback();
            log_message('error', 'Transaksi createComplaint gagal: ' . $e->getMessage());
            throw $e;
        }

        return [
            'status'     => true,
            'message'    => 'Pengaduan berhasil dibuat dan dianalisis.',
            'id'         => (int) $complaintId,
            'ticket_id'  => $ticketId,
            'data'       => [
                'complaint_id'        => (int) $complaintId,
                'analysis_id'         => (int) $analysisId,
                'review_id'           => $reviewId ? (int) $reviewId : null,
                'ticket_id'           => $ticketId,
                'status'              => 'received',
                'category'            => $analysis['category'] ?? null,
                'category_confidence' => $isFallback ? null : ($analysis['category_confidence'] ?? null),
                'urgency_label'       => $analysis['urgency_label'] ?? null,
                'urgency_score'       => $analysis['urgency_score'] ?? null,
                'urgency_reason'      => $analysis['urgency_reason'] ?? null,
                'sentiment'           => $analysis['sentiment'] ?? null,
                'sentiment_score'     => $isFallback ? null : ($analysis['sentiment_score'] ?? null),
                'sentiment_scores'    => $analysis['sentiment_scores'] ?? null,
                'submission_type'     => $analysis['submission_type'] ?? null,
                'requires_review'     => !empty($analysis['requires_review']),
                'is_fallback'         => $isFallback,
                'inference_time_ms'   => $inferenceTime,
            ],
        ];
    }

    /**
     * Dapatkan detail tiket beserta struktur alur workflow lengkap.
     */
    public function getComplaintDetail(int $id, array $authenticatedUser): ?array
    {
        $db = \Config\Database::connect();
        $latest = '(SELECT complaint_id, MAX(id) AS latest_id FROM complaint_analysis GROUP BY complaint_id) latest_analysis';

        $row = $db->table('complaints c')
            ->select([
                'c.*',
                'ca.category',
                'ca.category_confidence',
                'ca.urgency_label',
                'ca.urgency_score',
                'ca.urgency_reason',
                'ca.sentiment',
                'ca.sentiment_score',
                'ca.model_version',
                'u.name AS sender_name',
                'u.user_role AS sender_role',
            ])
            ->join($latest, 'latest_analysis.complaint_id = c.id', 'left', false)
            ->join('complaint_analysis ca', 'ca.id = latest_analysis.latest_id', 'left')
            ->join('users u', 'u.id = c.user_id', 'left')
            ->where('c.id', $id)
            ->get()->getRowArray();

        if (!$row) {
            return null;
        }

        // Otorisasi: Pengguna biasa hanya boleh melihat aduan miliknya
        if ($authenticatedUser['role'] === 'user' && (int) $row['user_id'] !== (int) $authenticatedUser['id']) {
            return null; // Disembunyikan sebagai 404
        }

        // Ambil riwayat percakapan / jejak audit
        $replies = $this->replyModel
            ->select('complaint_replies.id, complaint_replies.reply, complaint_replies.created_at, users.name AS by')
            ->join('users', 'users.id = complaint_replies.user_id', 'left')
            ->where('complaint_replies.complaint_id', $id)
            ->orderBy('complaint_replies.created_at', 'ASC')
            ->findAll();

        return $this->presentComplaint($row, $replies);
    }

    /**
     * Verifikasi aduan oleh Admin Sentral.
     */
    public function verifyComplaint(int $id, bool $verified, string $note, array $user): array
    {
        $complaint = $this->complaintModel->find($id);
        if (!$complaint) {
            throw new InvalidArgumentException('Pengaduan tidak ditemukan.');
        }

        $newStatus = $verified ? 'verified' : 'rejected';
        $db = \Config\Database::connect();
        $db->transBegin();

        try {
            $this->complaintModel->update($id, ['status' => $newStatus]);

            $replyMsg = ($verified ? '[Verifikasi Disetujui] ' : '[Verifikasi Ditolak] ') . ($note !== '' ? $note : 'Verifikasi oleh Admin Sentral PENS.');
            $this->replyModel->insert([
                'complaint_id' => $id,
                'user_id'      => (int) $user['id'],
                'reply'        => $replyMsg,
            ]);

            $db->transCommit();
        } catch (Throwable $e) {
            $db->transRollback();
            throw $e;
        }

        return [
            'status'    => true,
            'message'   => $verified ? 'Aduan berhasil diverifikasi.' : 'Aduan ditolak.',
            'complaint' => [
                'id'           => $id,
                'status'       => $newStatus,
                'verification' => [
                    'verified_by' => $user['name'] ?? 'Admin Sentral PENS',
                    'verified_at' => date('c'),
                    'note'        => $note,
                    'approved'    => $verified,
                ],
            ],
        ];
    }

    /**
     * Disposisi aduan ke unit kerja terkait oleh Admin Sentral.
     */
    public function dispatchComplaint(int $id, string $targetUnit, string $pic, string $note, ?string $targetSlaDate, array $user): array
    {
        $complaint = $this->complaintModel->find($id);
        if (!$complaint) {
            throw new InvalidArgumentException('Pengaduan tidak ditemukan.');
        }

        if (!$this->slaService->isValidUnit($targetUnit)) {
            throw new InvalidArgumentException("Unit tujuan '{$targetUnit}' bukan salah satu dari 14 unit resmi PENS.");
        }

        $db = \Config\Database::connect();
        $db->transBegin();

        try {
            $this->complaintModel->update($id, [
                'status'        => 'dispatched',
                'assigned_unit' => $targetUnit,
            ]);

            $replyMsg = "[Disposisi ke {$targetUnit}] " . ($pic !== '' ? "PIC: {$pic}. " : '') . ($note !== '' ? $note : 'Disposisi penanganan oleh Admin Sentral.');
            $this->replyModel->insert([
                'complaint_id' => $id,
                'user_id'      => (int) $user['id'],
                'reply'        => $replyMsg,
            ]);

            $db->transCommit();
        } catch (Throwable $e) {
            $db->transRollback();
            throw $e;
        }

        return [
            'status'    => true,
            'message'   => 'Aduan berhasil didisposisikan ke unit.',
            'complaint' => [
                'id'          => $id,
                'status'      => 'dispatched',
                'target_unit' => $targetUnit,
                'unit'        => $targetUnit,
                'disposition' => [
                    'target_unit'      => $targetUnit,
                    'assigned_pic'     => $pic,
                    'disposition_note' => $note,
                    'disposition_by'   => $user['name'] ?? 'Admin Sentral PENS',
                    'disposition_at'   => date('c'),
                    'target_sla_date'  => $targetSlaDate ?? $this->slaService->calculateDeadline(new DateTimeImmutable(), $targetUnit)->format(DATE_ATOM),
                ],
            ],
        ];
    }

    /**
     * Unit mengakui dan memulai proses penanganan aduan (in_progress).
     */
    public function acceptByUnit(int $id, string $picName, string $note, array $user): array
    {
        $complaint = $this->complaintModel->find($id);
        if (!$complaint) {
            throw new InvalidArgumentException('Pengaduan tidak ditemukan.');
        }

        $this->assertUnitPermission($complaint, $user);

        $db = \Config\Database::connect();
        $db->transBegin();

        try {
            $this->complaintModel->update($id, ['status' => 'in_progress']);

            $replyMsg = '[Penerimaan Tugas Unit] ' . ($picName !== '' ? "PIC: {$picName}. " : '') . ($note !== '' ? $note : 'Disposisi diterima oleh unit. Penanganan sedang berlangsung.');
            $this->replyModel->insert([
                'complaint_id' => $id,
                'user_id'      => (int) $user['id'],
                'reply'        => $replyMsg,
            ]);

            $db->transCommit();
        } catch (Throwable $e) {
            $db->transRollback();
            throw $e;
        }

        return [
            'status'  => true,
            'message' => 'Disposisi berhasil diterima dan status diperbarui ke Diproses.',
            'data'    => ['id' => $id, 'status' => 'in_progress'],
        ];
    }

    /**
     * Unit mencatat tindak lanjut teknis di lapangan (action_taken).
     */
    public function followupByUnit(int $id, string $actionType, string $note, string $performedBy, ?string $evidenceUrl, array $user): array
    {
        $complaint = $this->complaintModel->find($id);
        if (!$complaint) {
            throw new InvalidArgumentException('Pengaduan tidak ditemukan.');
        }

        $this->assertUnitPermission($complaint, $user);

        $db = \Config\Database::connect();
        $db->transBegin();

        try {
            $this->complaintModel->update($id, ['status' => 'action_taken']);

            $by = $performedBy !== '' ? $performedBy : ($user['name'] ?? 'Tim Teknis Unit');
            $replyMsg = "[Tindak Lanjut Teknis - {$actionType}] Oleh: {$by}. {$note}";
            $this->replyModel->insert([
                'complaint_id' => $id,
                'user_id'      => (int) $user['id'],
                'reply'        => $replyMsg,
            ]);

            $db->transCommit();
        } catch (Throwable $e) {
            $db->transRollback();
            throw $e;
        }

        return [
            'status'  => true,
            'message' => 'Tindak lanjut berhasil dicatat dan status diperbarui ke Ditindaklanjuti.',
            'data'    => ['id' => $id, 'status' => 'action_taken'],
        ];
    }

    /**
     * Unit menerbitkan jawaban resmi (answered).
     */
    public function answerByUnit(int $id, string $answer, string $answeredBy, array $attachments, array $user): array
    {
        $complaint = $this->complaintModel->find($id);
        if (!$complaint) {
            throw new InvalidArgumentException('Pengaduan tidak ditemukan.');
        }

        $this->assertUnitPermission($complaint, $user);

        $db = \Config\Database::connect();
        $db->transBegin();

        try {
            $this->complaintModel->update($id, ['status' => 'answered']);

            $by = $answeredBy !== '' ? $answeredBy : ($user['name'] ?? 'Kepala / Staf Unit');
            $replyMsg = "[Jawaban Resmi Unit] Oleh: {$by}. {$answer}";
            $this->replyModel->insert([
                'complaint_id' => $id,
                'user_id'      => (int) $user['id'],
                'reply'        => $replyMsg,
            ]);

            $db->transCommit();
        } catch (Throwable $e) {
            $db->transRollback();
            throw $e;
        }

        return [
            'status'  => true,
            'message' => 'Jawaban resmi unit berhasil diterbitkan.',
            'data'    => ['id' => $id, 'status' => 'answered'],
        ];
    }

    /**
     * Pengguna memberikan feedback kepuasan atas jawaban unit (answered -> resolved).
     */
    public function submitFeedback(int $id, array $feedbackInput, array $user): array
    {
        $complaint = $this->complaintModel->find($id);
        if (!$complaint) {
            throw new InvalidArgumentException('Pengaduan tidak ditemukan.');
        }

        // Hanya pelapor atau admin yang boleh mengisi feedback
        if ($user['role'] === 'user' && (int) $complaint['user_id'] !== (int) $user['id']) {
            throw new InvalidArgumentException('Anda tidak memiliki otoritas memberikan feedback untuk tiket ini.');
        }

        $normalizedStatus = $this->normalizeStatus((string) $complaint['status']);
        if ($normalizedStatus !== 'answered' && $normalizedStatus !== 'resolved') {
            throw new InvalidArgumentException('Tiket hanya dapat diberi feedback jika sudah berstatus Dijawab oleh unit.');
        }

        $validation = $this->feedbackService->validateFeedback($feedbackInput);
        if (!$validation['valid']) {
            throw new InvalidArgumentException($validation['error']);
        }

        $feedbackData = $validation['data'];
        $replyText = $this->feedbackService->formatFeedbackReply($feedbackData);

        $db = \Config\Database::connect();
        $db->transBegin();

        try {
            $this->complaintModel->update($id, ['status' => 'resolved']);

            $this->replyModel->insert([
                'complaint_id' => $id,
                'user_id'      => (int) $user['id'],
                'reply'        => $replyText,
            ]);

            $db->transCommit();
        } catch (Throwable $e) {
            $db->transRollback();
            throw $e;
        }

        return [
            'status'    => true,
            'message'   => 'Feedback kepuasan berhasil disimpan dan tiket selesai.',
            'complaint' => [
                'id'       => $id,
                'status'   => 'resolved',
                'feedback' => array_merge($feedbackData, ['submitted_at' => date('c')]),
            ],
        ];
    }

    /**
     * Pembaruan status umum dengan validasi peran.
     */
    public function updateStatus(int $id, string $rawStatus, ?string $note, ?string $assignedUnit, array $user): array
    {
        $complaint = $this->complaintModel->find($id);
        if (!$complaint) {
            throw new InvalidArgumentException('Pengaduan tidak ditemukan.');
        }

        $normalizedStatus = $this->normalizeStatus($rawStatus);
        $allowedStatuses = [
            'received', 'verified', 'dispatched', 'in_progress', 'action_taken', 'answered', 'resolved', 'rejected'
        ];

        if (!in_array($normalizedStatus, $allowedStatuses, true)) {
            throw new InvalidArgumentException("Status '{$rawStatus}' tidak valid.");
        }

        $updateFields = ['status' => $normalizedStatus];
        if ($assignedUnit !== null && $assignedUnit !== '') {
            if ($user['role'] !== 'admin') {
                throw new InvalidArgumentException('Hanya Admin yang berwenang menetapkan unit penugasan.');
            }
            if (!$this->slaService->isValidUnit($assignedUnit)) {
                throw new InvalidArgumentException("Unit '{$assignedUnit}' tidak terdaftar.");
            }
            $updateFields['assigned_unit'] = $assignedUnit;
        }

        $this->complaintModel->update($id, $updateFields);

        if ($note !== null && $note !== '') {
            $this->replyModel->insert([
                'complaint_id' => $id,
                'user_id'      => (int) $user['id'],
                'reply'        => "[Perubahan Status ke {$normalizedStatus}] " . $note,
            ]);
        }

        return [
            'status'  => true,
            'message' => 'Status pengaduan berhasil diperbarui.',
            'data'    => ['id' => $id, 'status' => $normalizedStatus],
        ];
    }

    /**
     * Pemeriksaan otoritas unit kerja untuk stakeholder.
     */
    private function assertUnitPermission(array $complaint, array $user): void
    {
        if ($user['role'] === 'admin') {
            return;
        }

        if ($user['role'] === 'stakeholder') {
            $userUnit = trim((string) ($user['unit'] ?? ''));
            $assignedUnit = trim((string) ($complaint['assigned_unit'] ?? ''));

            if ($userUnit === '' || strcasecmp($userUnit, $assignedUnit) !== 0) {
                throw new InvalidArgumentException('Anda hanya berwenang menindaklanjuti pengaduan yang ditugaskan ke divisi Anda.');
            }
            return;
        }

        throw new InvalidArgumentException('Peran Anda tidak diizinkan melakukan tindakan penanganan unit.');
    }

    /**
     * Normalisasi status database ke standar alur 7 tahap SuaraLens.
     */
    public function normalizeStatus(string $status): string
    {
        $s = strtolower(trim($status));
        return match ($s) {
            'submitted', 'new'       => 'received',
            'process'                => 'in_progress',
            'done'                   => 'resolved',
            'escalate', 'disposition'=> 'dispatched',
            default                  => $s ?: 'received',
        };
    }

    /**
     * Bentuk struktur data pengaduan yang 100% cocok dengan frontend React.
     */
    public function presentComplaint(array $row, array $replies = []): array
    {
        $id = (int) $row['id'];
        $statusKey = $this->normalizeStatus((string) ($row['status'] ?? 'received'));
        $targetUnit = $row['assigned_unit'] ?? $row['category'] ?? 'Sarana Prasarana dan Layanan Umum';
        $createdAt = $row['created_at'] ?? date('c');

        $verification = null;
        $disposition = null;
        $unitAnswer = null;
        $feedback = null;
        $followups = [];
        $attachments = [];

        // Parse jejak audit dari replies
        foreach ($replies as $r) {
            $text = (string) ($r['reply'] ?? '');
            $byName = $r['by'] ?? 'Petugas';
            $rCreatedAt = $r['created_at'];

            if (str_starts_with($text, '[Lampiran Bukti]')) {
                preg_match('/Nama:\s*([^|]+)\s*\|\s*Path:\s*([^|]+)\s*\|\s*Size:\s*([0-9]+)\s*\|\s*Type:\s*(.*)$/s', $text, $m);
                $attachments[] = [
                    'name' => !empty($m[1]) ? trim($m[1]) : 'Lampiran',
                    'url'  => !empty($m[2]) ? base_url(trim($m[2])) : '#',
                    'size' => !empty($m[3]) ? (int) $m[3] : 0,
                    'type' => !empty($m[4]) ? trim($m[4]) : 'application/octet-stream',
                ];
                continue;
            }

            if (str_starts_with($text, '[Verifikasi ')) {
                $isApproved = str_starts_with($text, '[Verifikasi Disetujui]');
                $note = trim(preg_replace('/^\[Verifikasi [^\]]+\]\s*/', '', $text));
                $verification = [
                    'verified_by' => $byName ?: 'Admin Sentral PENS',
                    'verified_at' => $rCreatedAt,
                    'note'        => $note,
                    'approved'    => $isApproved,
                ];
            } elseif (str_starts_with($text, '[Disposisi ke ')) {
                preg_match('/^\[Disposisi ke ([^\]]+)\](?:\s*PIC:\s*([^.]+)\.)?\s*(.*)$/s', $text, $m);
                $u = !empty($m[1]) ? trim($m[1]) : $targetUnit;
                $pic = !empty($m[2]) ? trim($m[2]) : "Koordinator {$u}";
                $note = !empty($m[3]) ? trim($m[3]) : 'Mohon segera ditindaklanjuti sesuai SOP unit.';
                $disposition = [
                    'target_unit'      => $u,
                    'assigned_pic'     => $pic,
                    'disposition_note' => $note,
                    'disposition_by'   => $byName ?: 'Admin Sentral PENS',
                    'disposition_at'   => $rCreatedAt,
                    'target_sla_date'  => date('c', strtotime($rCreatedAt . ' + 3 days')),
                ];
            } elseif (str_starts_with($text, '[Jawaban Resmi Unit]')) {
                preg_match('/^\[Jawaban Resmi Unit\](?:\s*Oleh:\s*([^.]+)\.)?\s*(.*)$/s', $text, $m);
                $answeredBy = !empty($m[1]) ? trim($m[1]) : $byName;
                $ans = !empty($m[2]) ? trim($m[2]) : $text;
                $unitAnswer = [
                    'answer'      => $ans,
                    'answered_by' => $answeredBy,
                    'answered_at' => $rCreatedAt,
                    'attachments' => [],
                ];
            } elseif (str_starts_with($text, '[Feedback Stakeholder]')) {
                preg_match('/Rating:\s*([0-9]+)\/5\.(?:\s*Kecepatan:\s*([0-9]+)\/5,\s*Kejelasan:\s*([0-9]+)\/5,\s*Solusi:\s*([0-9]+)\/5\.)?(?:\s*Catatan:\s*(.*))?$/s', $text, $m);
                $feedback = [
                    'rating'          => !empty($m[1]) ? (int) $m[1] : 5,
                    'aspect_speed'    => !empty($m[2]) ? (int) $m[2] : 5,
                    'aspect_clarity'  => !empty($m[3]) ? (int) $m[3] : 5,
                    'aspect_solution' => !empty($m[4]) ? (int) $m[4] : 5,
                    'comment'         => !empty($m[5]) ? trim($m[5]) : 'Penyelesaian aduan memuaskan.',
                    'submitted_at'    => $rCreatedAt,
                ];
            }

            $followups[] = [
                'id'         => (int) $r['id'],
                'by'         => $byName,
                'note'       => $text,
                'status'     => 'process',
                'created_at' => $rCreatedAt,
            ];
        }

        // Fallbacks berbasis status jika tiket sudah lanjut namun jejak belum lengkap
        if (!$disposition && in_array($statusKey, ['dispatched', 'in_progress', 'action_taken', 'answered', 'resolved'], true)) {
            $disposition = [
                'target_unit'      => $targetUnit,
                'assigned_pic'     => "Koordinator {$targetUnit}",
                'disposition_note' => 'Disposisi penanganan unit oleh Admin Sentral.',
                'disposition_by'   => 'Admin Sentral PENS',
                'disposition_at'   => $row['updated_at'] ?? $createdAt,
                'target_sla_date'  => date('c', strtotime($createdAt . ' + 3 days')),
            ];
        }

        if (!$verification && in_array($statusKey, ['verified', 'dispatched', 'in_progress', 'action_taken', 'answered', 'resolved'], true)) {
            $verification = [
                'verified_by' => 'Admin Sentral PENS',
                'verified_at' => $row['updated_at'] ?? $createdAt,
                'note'        => 'Aduan telah diverifikasi validitas substansinya oleh Admin Sentral.',
                'approved'    => true,
            ];
        }

        $isAnonymous = !empty($row['is_anonymous']);

        return [
            'id'             => $id,
            'ticket_id'      => $row['ticket_id'] ?? "SL-{$id}",
            'type'           => $row['type'] ?? 'complaint',
            'category'       => $row['category'] ?? $targetUnit,
            'description'    => $row['description'] ?? '',
            'unit'           => $targetUnit,
            'target_unit'    => $targetUnit,
            'is_anonymous'   => $isAnonymous,
            'sender_name'    => $isAnonymous ? null : ($row['sender_name'] ?? null),
            'sender_role'    => $row['sender_role'] ?? 'Mahasiswa',
            'status'         => $statusKey,
            'urgency_score'  => isset($row['urgency_score']) ? round((float) $row['urgency_score'] * 10, 1) : 5.0,
            'nlp_category'   => $row['category'] ?? $targetUnit,
            'nlp_confidence' => isset($row['category_confidence']) ? round((float) $row['category_confidence'], 2) : null,
            'sentiment'      => $row['sentiment'] ?? 'neutral',
            'sla_deadline'   => $this->slaService->calculateDeadline(new DateTimeImmutable($createdAt), $targetUnit)->format(DATE_ATOM),
            'attachments'    => $attachments,
            'verification'   => $verification,
            'disposition'    => $disposition,
            'unit_answer'    => $unitAnswer,
            'feedback'       => $feedback,
            'followups'      => $followups,
            'created_at'     => $createdAt,
            'updated_at'     => $row['updated_at'] ?? $createdAt,
        ];
    }
}
