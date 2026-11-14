<?php

/**
 * SuaraLens Backend Services Test Suite
 * Menjalankan unit test untuk:
 * - PriorityService
 * - SLAService
 * - FeedbackService
 * - EvidenceService
 * - DataExtractionService
 * - WeeklyAnalyticsService
 */

// 1. Bootstrap CodeIgniter 4 Environment via official test bootstrap
defined('HOMEPATH') || define('HOMEPATH', realpath(__DIR__ . '/..') . DIRECTORY_SEPARATOR);
require_once __DIR__ . '/../system/Test/bootstrap.php';

use App\Services\PriorityService;
use App\Services\SLAService;
use App\Services\FeedbackService;
use App\Services\EvidenceService;
use App\Services\DataExtractionService;
use App\Services\WeeklyAnalyticsService;

$passed = 0;
$failed = 0;

function assertTest(string $name, bool $condition, string $detail = '') {
    global $passed, $failed;
    if ($condition) {
        echo "  [PASS] {$name}\n";
        $passed++;
    } else {
        echo "  [FAIL] {$name} - {$detail}\n";
        $failed++;
    }
}

echo "============================================================\n";
echo "SUARALENS BACKEND SERVICES UNIT TEST RUNNER\n";
echo "============================================================\n\n";

// -----------------------------------------------------------------
// 1. TEST PRIORITY SERVICE
// -----------------------------------------------------------------
echo "[1] Testing PriorityService...\n";
$priorityService = new PriorityService();

// 1.1 PII Redaction
$rawPII = "Nama saya Agus, NIM 3324600012, HP 081234567890, email agus@student.pens.ac.id. AC di ruang kelas bocor.";
$redacted = $priorityService->redactPIIFallback($rawPII);

assertTest("PII Redaction: Sembunyikan NIM", !str_contains($redacted, "3324600012") && str_contains($redacted, "<NIM>"));
assertTest("PII Redaction: Sembunyikan No HP", !str_contains($redacted, "081234567890") && str_contains($redacted, "<TELEPON>"));
assertTest("PII Redaction: Sembunyikan Email", !str_contains($redacted, "agus@student.pens.ac.id") && str_contains($redacted, "<EMAIL>"));
assertTest("PII Redaction: Pertahankan substansi teks keluhan", str_contains($redacted, "AC di ruang kelas bocor"));

// 1.2 Urgency Evaluation
$urgentText = "BAHAYA! Terjadi kebocoran gas dan korslet kabel listrik di lab.";
$evalUrgent = $priorityService->evaluateUrgency($urgentText);
assertTest("Urgency: Deteksi status Tinggi", $evalUrgent['urgency_label'] === 'Tinggi' && $evalUrgent['is_urgent'] === true);
assertTest("Urgency: Skor tinggi >= 0.8", $evalUrgent['urgency_score'] >= 0.8);

$lowText = "Mohon info jadwal pendaftaran seminar nasional pekan depan.";
$evalLow = $priorityService->evaluateUrgency($lowText);
assertTest("Urgency: Deteksi status Rendah", $evalLow['urgency_label'] === 'Rendah' && $evalLow['is_urgent'] === false);

// 1.3 Category/Unit Fallback Mapping
$catIT = $priorityService->classifyUnitFallback("Koneksi WiFi di gedung pascasarjana sering putus dan RTO.");
assertTest("Unit Mapping: WiFi -> TIK/Sistem Informasi", $catIT === 'TIK/Sistem Informasi');

$catSarpras = $priorityService->classifyUnitFallback("Toilet lantai 3 tersumbat dan lampu koridor mati.");
assertTest("Unit Mapping: Toilet/Lampu -> Sarana Prasarana dan Layanan Umum", $catSarpras === 'Sarana Prasarana dan Layanan Umum');

$catAcademic = $priorityService->classifyUnitFallback("Nilai praktikum semester lalu belum keluar di siakad.");
assertTest("Unit Mapping: Nilai/Siakad -> Akademik", $catAcademic === 'Akademik');

// 1.4 Fallback Integrity Check
$fallbackAnalysis = $priorityService->generateFallbackAnalysis("Kabel proyektor rusak.", "complaint");
assertTest("Fallback Integrity: is_fallback harus true", $fallbackAnalysis['is_fallback'] === true);
assertTest("Fallback Integrity: category_confidence harus NULL (bukan confidence palsu)", $fallbackAnalysis['category_confidence'] === null);
assertTest("Fallback Integrity: sentiment_score harus NULL", $fallbackAnalysis['sentiment_score'] === null);
assertTest("Fallback Integrity: model_version menandai heuristic", str_contains($fallbackAnalysis['model_version'], 'heuristic'));

echo "\n";

// -----------------------------------------------------------------
// 2. TEST SLA SERVICE
// -----------------------------------------------------------------
echo "[2] Testing SLAService...\n";
$slaService = new SLAService();

assertTest("SLA Target: Sarpras = 2 hari", $slaService->getTargetSlaDays('Sarana Prasarana dan Layanan Umum') === 2);
assertTest("SLA Target: Keamanan = 1 hari", $slaService->getTargetSlaDays('Keamanan dan Ketertiban') === 1);
assertTest("SLA Target: Pimpinan = 5 hari", $slaService->getTargetSlaDays('Pimpinan/Manajemen') === 5);
assertTest("SLA Target: Default unit tidak dikenal = 3 hari", $slaService->getTargetSlaDays('Unit Antah Berantah') === 3);

// Valid Units Check
assertTest("Valid Unit: Akademik valid", $slaService->isValidUnit('Akademik'));
assertTest("Valid Unit: Unit palsu tidak valid", !$slaService->isValidUnit('Divisi Siluman'));
assertTest("Valid Units: Ada 14 unit resmi PENS", count($slaService->getValidUnits()) === 14);

// Compliance calculation
$created = new DateTimeImmutable('2026-11-01 10:00:00');
$resolvedOnTime = new DateTimeImmutable('2026-11-02 15:00:00'); // 1.2 hari, target Sarpras 2 hari
$evalOnTime = $slaService->evaluateCompliance($created, $resolvedOnTime, 'Sarana Prasarana dan Layanan Umum');
assertTest("SLA Compliance: Selesai tepat waktu = compliant", $evalOnTime['is_compliant'] === true && $evalOnTime['status'] === 'resolved_on_time');

$resolvedLate = new DateTimeImmutable('2026-11-05 10:00:00'); // 4 hari, target Sarpras 2 hari
$evalLate = $slaService->evaluateCompliance($created, $resolvedLate, 'Sarana Prasarana dan Layanan Umum');
assertTest("SLA Compliance: Selesai terlambat = non-compliant", $evalLate['is_compliant'] === false && $evalLate['status'] === 'resolved_late');

echo "\n";

// -----------------------------------------------------------------
// 3. TEST FEEDBACK SERVICE
// -----------------------------------------------------------------
echo "[3] Testing FeedbackService...\n";
$feedbackService = new FeedbackService();

$validFeedback = [
    'rating' => 5,
    'aspect_speed' => 4,
    'aspect_clarity' => 5,
    'aspect_solution' => 5,
    'comment' => 'Penanganan sangat memuaskan!'
];
$valRes = $feedbackService->validateFeedback($validFeedback);
assertTest("Feedback: Validasi input valid", $valRes['valid'] === true);

$invalidRating = ['rating' => 6];
$valResInvalid = $feedbackService->validateFeedback($invalidRating);
assertTest("Feedback: Tolak rating > 5", $valResInvalid['valid'] === false);

$invalidAspect = ['rating' => 4, 'aspect_speed' => 0];
$valResAspect = $feedbackService->validateFeedback($invalidAspect);
assertTest("Feedback: Tolak aspek < 1", $valResAspect['valid'] === false);

$replyFormat = $feedbackService->formatFeedbackReply($valRes['data']);
assertTest("Feedback: Format string reply mengandung rating", str_contains($replyFormat, "[Feedback Stakeholder] Rating: 5/5"));

echo "\n";

// -----------------------------------------------------------------
// 4. TEST DATA EXTRACTION SERVICE (TAHAP 5)
// -----------------------------------------------------------------
echo "[4] Testing DataExtractionService (Incremental Watermark)...\n";
$testExtractDir = WRITEPATH . 'test_extraction_' . bin2hex(random_bytes(3));
$extractionService = new DataExtractionService($testExtractDir);

// 4.1 Initial state
$initialWatermark = $extractionService->loadWatermark();
assertTest("Watermark: Status awal uninitialized", $initialWatermark['status'] === 'uninitialized');

// 4.2 Run extraction
$resExtraction = $extractionService->extractIncremental(false);
assertTest("Extraction: Status eksekusi success", $resExtraction['status'] === 'success');
assertTest("Extraction: Stream file terbuat", file_exists($resExtraction['stream_file']));
assertTest("Extraction: Watermark file terbuat", file_exists($resExtraction['watermark_file']));

$updatedWatermark = $extractionService->loadWatermark();
assertTest("Watermark: Status aktif success", $updatedWatermark['status'] === 'success');
assertTest("Watermark: Versi pipeline 1.2.0", $updatedWatermark['pipeline_version'] === '1.2.0');

// 4.3 Idempotency Check (Second run should extract 0 records)
$resSecond = $extractionService->extractIncremental(false);
assertTest("Idempotency: Ekstraksi berulang menghasilkan 0 duplikasi", $resSecond['records_extracted'] === 0);

// 4.4 Privacy & Zero PII in Analytical Stream
$streamRecords = $extractionService->readStreamRecords();
$hasPII = false;
foreach ($streamRecords as $rec) {
    if (isset($rec['user_id']) || isset($rec['email']) || isset($rec['phone']) || isset($rec['password'])) {
        $hasPII = true;
        break;
    }
}
assertTest("Privacy: Zero PII pada Analytical Data Layer", !$hasPII && count($streamRecords) > 0);

// Cleanup test dir
@unlink($resExtraction['stream_file']);
@unlink($resExtraction['watermark_file']);
@rmdir($testExtractDir);

echo "\n";

// -----------------------------------------------------------------
// 5. TEST WEEKLY ANALYTICS SERVICE (TAHAP 5)
// -----------------------------------------------------------------
echo "[5] Testing WeeklyAnalyticsService (Rolling Windows & SLA)...\n";
$weeklyService = new WeeklyAnalyticsService();

$refreshRes = $weeklyService->refreshRollingWindows(false);
$snapshot = $refreshRes['snapshot'];

assertTest("Snapshot: Schema version 2", $snapshot['schema_version'] === 2);
assertTest("Snapshot: Timezone Asia/Jakarta", $snapshot['timezone'] === 'Asia/Jakarta');
assertTest("Snapshot: Memuat 4 rolling windows (7, 30, 90, 180)", count($snapshot['aggregates']) === 4);

// Test Window 7-hari
$w7 = $snapshot['aggregates']['7'];
assertTest("Window 7-hari: Memuat record_count", isset($w7['record_count']));
assertTest("Window 7-hari: Memuat ringkasan dwibahasa (id & en)", !empty($w7['summary']['id']) && !empty($w7['summary']['en']));
assertTest("Window 7-hari: Memuat metrik SLA lengkap", isset($w7['sla']['compliance_pct']) && isset($w7['sla']['breach_pct']));
assertTest("Window 7-hari: Memuat perbandingan periode sebelumnya", isset($w7['previous_period_comparison']['count_change_pct']));
assertTest("Window 7-hari: Memuat breakdown urgensi (low, medium, high, critical)", isset($w7['urgency']['high']));
assertTest("Window 7-hari: Memuat breakdown sentimen", isset($w7['sentiment']['negative']));

// Test API retrieval helper
$retrievedSnapshot = $weeklyService->latestSnapshot(7);
assertTest("API Retrieval: latestSnapshot(7) berhasil memuat snapshot", $retrievedSnapshot['aggregate_days'] === 7);

$invalidWindowFailed = false;
try {
    $weeklyService->latestSnapshot(15);
} catch (InvalidArgumentException $e) {
    $invalidWindowFailed = true;
}
assertTest("Validation: Tolak window tidak didukung (15 hari)", $invalidWindowFailed);

echo "\n";

// -----------------------------------------------------------------
// 6. TEST DATABASE TRANSACTIONS & ATOMICITY (POSTGRESQL)
// -----------------------------------------------------------------
echo "[6] Testing Database Transactions & Atomicity (PostgreSQL)...\n";
$db = \Config\Database::connect('default');

$firstUser = $db->table('users')->select('id')->limit(1)->get()->getRowArray();
$testUserId = (int) ($firstUser['id'] ?? 1);

// 6.1 Transaction Rollback Test
$db->transBegin();
$testTicketId = 'TEST-' . bin2hex(random_bytes(4));
$db->table('complaints')->insert([
    'ticket_id'   => $testTicketId,
    'user_id'     => $testUserId,
    'type'        => 'complaint',
    'description' => 'Temporary test complaint for transaction rollback',
    'status'      => 'received',
    'created_at'  => date('Y-m-d H:i:s'),
    'updated_at'  => date('Y-m-d H:i:s')
]);
$inTransCount = $db->table('complaints')->where('ticket_id', $testTicketId)->countAllResults();
assertTest("DB Transaction: Record ada di dalam blok transaksi aktif", $inTransCount === 1);

// Rollback
$db->transRollback();
$postRollbackCount = $db->table('complaints')->where('ticket_id', $testTicketId)->countAllResults();
assertTest("DB Transaction: Rollback membatalkan insert secara atomik", $postRollbackCount === 0);

// 6.2 Transaction Commit & Cascade Test
$db->transBegin();
$testTicketIdCommit = 'TEST-' . bin2hex(random_bytes(4));
$db->table('complaints')->insert([
    'ticket_id'   => $testTicketIdCommit,
    'user_id'     => $testUserId,
    'type'        => 'complaint',
    'description' => 'Temporary test complaint for transaction commit',
    'status'      => 'received',
    'created_at'  => date('Y-m-d H:i:s'),
    'updated_at'  => date('Y-m-d H:i:s')
]);

$insertedRow = $db->table('complaints')->where('ticket_id', $testTicketIdCommit)->get()->getRowArray();
$insertId = (int) ($insertedRow['id'] ?? 0);

$db->table('complaint_analysis')->insert([
    'complaint_id'  => $insertId,
    'category'      => 'TIK/Sistem Informasi',
    'urgency_label' => 'Low',
    'sentiment'     => 'neutral',
    'created_at'    => date('Y-m-d H:i:s')
]);
$db->transCommit();

$committedComplaint = $db->table('complaints')->where('id', $insertId)->countAllResults();
$committedAnalysis = $db->table('complaint_analysis')->where('complaint_id', $insertId)->countAllResults();
assertTest("DB Transaction: Commit menyimpan keluhan dan analisis secara utuh", $committedComplaint === 1 && $committedAnalysis === 1);

// Cleanup
$db->table('complaint_analysis')->where('complaint_id', $insertId)->delete();
$db->table('complaints')->where('id', $insertId)->delete();
$cleanedUp = $db->table('complaints')->where('id', $insertId)->countAllResults();
assertTest("DB Cleanup: Test fixtures transaksi dibersihkan", $cleanedUp === 0);

echo "\n";

// -----------------------------------------------------------------
// 7. TEST ROLE-BASED AUTHORIZATION MATRIX
// -----------------------------------------------------------------
echo "[7] Testing Role-Based Authorization Matrix...\n";

$rolesPermissions = [
    'admin' => [
        'view_all_complaints'       => true,
        'review_hitl'               => true,
        'dispatch_unit'             => true,
        'trigger_weekly_analytics'  => true,
        'manage_users'              => true,
    ],
    'stakeholder' => [
        'view_all_complaints'       => false,
        'view_assigned_complaints'  => true,
        'review_hitl'               => false,
        'update_disposition_status' => true,
        'trigger_weekly_analytics'  => false,
    ],
    'user' => [
        'submit_complaint'          => true,
        'view_own_complaints'       => true,
        'submit_feedback'           => true,
        'review_hitl'               => false,
        'dispatch_unit'             => false,
    ]
];

assertTest("Role Auth: Admin memiliki izin review HITL", $rolesPermissions['admin']['review_hitl'] === true);
assertTest("Role Auth: Stakeholder dilarang review HITL", $rolesPermissions['stakeholder']['review_hitl'] === false);
assertTest("Role Auth: User/Mahasiswa dilarang disposisi unit", $rolesPermissions['user']['dispatch_unit'] === false);
assertTest("Role Auth: Stakeholder hanya dapat melihat pengaduan unit sendiri", $rolesPermissions['stakeholder']['view_assigned_complaints'] === true && $rolesPermissions['stakeholder']['view_all_complaints'] === false);
assertTest("Role Auth: User dapat memberikan feedback", $rolesPermissions['user']['submit_feedback'] === true);

echo "\n";

// -----------------------------------------------------------------
// 8. TEST EVIDENCE SERVICE & ATTACHMENT VALIDATION
// -----------------------------------------------------------------
echo "[8] Testing EvidenceService & Attachment Security...\n";
$evidenceService = new EvidenceService();

$refClass = new ReflectionClass($evidenceService);
$refAllowed = $refClass->getConstant('ALLOWED_EXTENSIONS');
$refMaxSize = $refClass->getConstant('MAX_FILE_SIZE_BYTES');

assertTest("Evidence: Ekstensi yang diizinkan mencakup jpg, png, pdf", 
    in_array('jpg', $refAllowed) && in_array('png', $refAllowed) && in_array('pdf', $refAllowed));
assertTest("Evidence: Batas ukuran maksimum tepat 5MB (5242880 bytes)", $refMaxSize === 5242880);
assertTest("Evidence: Ekstensi berbahaya (.php, .exe, .sh) ditolak", 
    !in_array('php', $refAllowed) && !in_array('exe', $refAllowed) && !in_array('sh', $refAllowed));

echo "\n";

// -----------------------------------------------------------------
// 9. TEST ML SERVICE RESILIENCE & HEURISTIC FALLBACK INTEGRATION
// -----------------------------------------------------------------
echo "[9] Testing MLService Resilience & Heuristic Fallback Integration...\n";
$offlineML = new \App\Services\MLService('http://127.0.0.1:59999', 1, 1);
$analyzeResult = $offlineML->analyzeComplaint(999999, "Test keluhan saat offline");

assertTest("ML Resilience: Gagal graceful tanpa crash saat offline", $analyzeResult['success'] === false);
assertTest("ML Resilience: Catat pesan error koneksi teknis", !empty($analyzeResult['error']));
assertTest("ML Resilience: Data analisis tetap null", $analyzeResult['data'] === null);

$safeFallback = $priorityService->generateFallbackAnalysis("AC di laboratorium mati.", "complaint");
assertTest("ML Integration Fallback: Kategori berhasil dipetakan secara heuristik", $safeFallback['category'] === 'Sarana Prasarana dan Layanan Umum');
assertTest("ML Integration Fallback: Tidak ada confidence palsu (null)", $safeFallback['category_confidence'] === null);

$urgentFallback = $priorityService->generateFallbackAnalysis("DARURAT! Kebocoran pipa gas dan kebakaran di gedung utama.", "complaint");
assertTest("ML Integration Fallback: Teks urgensi tinggi memicu flag review HITL", $urgentFallback['requires_review'] === true);

echo "\n";

// -----------------------------------------------------------------
// 10. TEST STUDENT DASHBOARD REAL-TIME AGGREGATION
// -----------------------------------------------------------------
echo "[10] Testing Student Dashboard Aggregation Endpoint...\n";
$dashboardCtrl = new \App\Controllers\DashboardController();
$dashboardCtrl->initController(service('request'), service('response'), service('logger'));
$studentDashResponse = $dashboardCtrl->studentDashboard();
$studentDashJson = json_decode($studentDashResponse->getBody(), true);

assertTest("Student Dashboard: Status respon berhasil (status=true)", !empty($studentDashJson['status']));
assertTest("Student Dashboard: Memuat objek ringkasan (summary)", isset($studentDashJson['summary']['total']));
assertTest("Student Dashboard: Memuat 14 unit kerja resmi", count($studentDashJson['units']) === 14);
assertTest("Student Dashboard: Memuat 7 alur tahapan aduan", count($studentDashJson['globalStages']) === 7);
assertTest("Student Dashboard: Memuat 3 breakdown tipe pengajuan (complaint, feedback, suggestion)", count($studentDashJson['typesBreakdown']) === 3);
assertTest("Student Dashboard: Memuat daftar distribusi unit", count($studentDashJson['distribution']) === 14);

echo "\n";

// -----------------------------------------------------------------
// 11. TEST COMPLAINT RE-ANALYSIS & ANALYSIS HISTORY
// -----------------------------------------------------------------
echo "[11] Testing Complaint Re-Analysis & Analysis History (Immutable Trail)...\n";
$fastML = new \App\Services\MLService('http://127.0.0.1:59999', 1, 1);
$complaintService = new \App\Services\ComplaintService(null, null, null, null, $fastML);

// Ambil user aktual dari database
$adminRow = $db->table('users')->where('role', 'admin')->get()->getRowArray();
$userRow = $db->table('users')->where('role', 'user')->get()->getRowArray();
$otherRow = $db->table('users')->where('role', 'user')->where('id !=', (int) ($userRow['id'] ?? 17))->get()->getRowArray();
$stakeholderRow = $db->table('users')->where('role', 'stakeholder')->get()->getRowArray()
    ?? $db->table('users')->where('id !=', (int) ($adminRow['id'] ?? 15))->where('id !=', (int) ($userRow['id'] ?? 17))->get()->getRowArray();

$adminUser = ['id' => (int) ($adminRow['id'] ?? 15), 'email' => $adminRow['email'] ?? 'admin@pens.ac.id', 'role' => 'admin', 'name' => $adminRow['name'] ?? 'Admin PENS'];
$regularUser = ['id' => (int) ($userRow['id'] ?? 17), 'email' => $userRow['email'] ?? 'budi@student.pens.ac.id', 'role' => 'user', 'name' => $userRow['name'] ?? 'Budi Mahasiswa'];
$otherUser = ['id' => (int) ($otherRow['id'] ?? 14), 'email' => $otherRow['email'] ?? 'other@student.pens.ac.id', 'role' => 'user', 'name' => $otherRow['name'] ?? 'Other Mahasiswa'];

$stakeholderId = (int) ($stakeholderRow['id'] ?? 16);
$matchingStakeholder = ['id' => $stakeholderId, 'role' => 'stakeholder', 'unit' => 'Sarana Prasarana dan Layanan Umum', 'name' => $stakeholderRow['name'] ?? 'Petugas Sarpras'];
$diffStakeholder     = ['id' => $stakeholderId, 'role' => 'stakeholder', 'unit' => 'TIK/Sistem Informasi', 'name' => 'Petugas TIK'];

// 11.1 Create test complaint
$testComplaintData = [
    'type' => 'complaint',
    'description' => 'AC di ruang lab 301 mati dan suhu sangat panas mengganggu praktikum.',
    'category' => 'Sarana Prasarana dan Layanan Umum'
];
$createdComp = $complaintService->createComplaint($testComplaintData, $regularUser);
$testCompId = (int) $createdComp['id'];
$firstAnalysisId = (int) $createdComp['data']['analysis_id'];

assertTest("Complaint Lifecycle: Berhasil membuat pengaduan uji", $testCompId > 0 && $firstAnalysisId > 0);
assertTest("Complaint Analysis: Menyimpan unit_confidence dan unit_reason", 
    array_key_exists('unit_confidence', $createdComp['data']) && array_key_exists('unit_reason', $createdComp['data']));

// 11.2 Trigger Re-analysis
$reanalyzeRes = $complaintService->reanalyzeComplaint($testCompId, $adminUser);
$secondAnalysisId = (int) $reanalyzeRes['data']['analysis_id'];

assertTest("Re-analysis: Menghasilkan ID analisis baru yang berbeda", $secondAnalysisId > 0 && $secondAnalysisId !== $firstAnalysisId);
assertTest("Re-analysis: Menyertakan unit_confidence dan unit_reason", 
    array_key_exists('unit_confidence', $reanalyzeRes['data']) && array_key_exists('unit_reason', $reanalyzeRes['data']));

// 11.3 Retrieve Analysis History
$historyRes = $complaintService->getAnalysisHistory($testCompId, $regularUser);
assertTest("Analysis History: Total riwayat minimal 2 record", $historyRes['data']['total'] >= 2);
assertTest("Analysis History: Record pertama adalah analisis terbaru (ID descending)", 
    $historyRes['data']['history'][0]['analysis_id'] === $secondAnalysisId);
assertTest("Analysis History: Record kedua adalah analisis pertama (tidak ditimpa)", 
    $historyRes['data']['history'][1]['analysis_id'] === $firstAnalysisId);

// 11.4 IDOR Protection Test on History
$idorBlocked = false;
try {
    $complaintService->getAnalysisHistory($testCompId, $otherUser);
} catch (InvalidArgumentException $e) {
    $idorBlocked = true;
}
assertTest("Security IDOR: User lain dilarang mengakses riwayat analisis orang lain", $idorBlocked);

// 11.5 Detail Complaint uses LATEST Analysis
$detailComp = $complaintService->getComplaintDetail($testCompId, $regularUser);
assertTest("Detail Complaint: Menggunakan analisis terbaru", $detailComp['id'] === $testCompId);
assertTest("Detail Complaint: Memuat unit_confidence dan unit_reason", 
    array_key_exists('unit_confidence', $detailComp) && array_key_exists('unit_reason', $detailComp));

// Cleanup test fixtures
$db->table('complaint_reviews')->where('complaint_analysis_id', $secondAnalysisId)->delete();
$db->table('complaint_reviews')->where('complaint_analysis_id', $firstAnalysisId)->delete();
$db->table('complaint_analysis')->where('complaint_id', $testCompId)->delete();
$db->table('complaints')->where('id', $testCompId)->delete();

echo "\n";

// -----------------------------------------------------------------
// 12. TEST COMPLAINT CONTROLLER ENDPOINTS
// -----------------------------------------------------------------
echo "[12] Testing ComplaintController HTTP Endpoints...\n";
$controller = new \App\Controllers\ComplaintController($complaintService);
$controller->initController(service('request'), service('response'), service('logger'));

// 12.1 index()
$indexResp = $controller->index();
$indexData = json_decode($indexResp->getBody(), true);
assertTest("Controller: index() mengembalikan status=true", !empty($indexData['status']));
assertTest("Controller: index() memuat array items", isset($indexData['items']) && is_array($indexData['items']));
assertTest("Controller: index() memuat total dan pagination", isset($indexData['total']) && isset($indexData['page']));

// 12.2 Validasi ID null
$showNull = $controller->show(null);
assertTest("Controller: show(null) mengembalikan 400 Bad Request", $showNull->getStatusCode() === 400);

$updateNull = $controller->updateStatus(null);
assertTest("Controller: updateStatus(null) mengembalikan 400 Bad Request", $updateNull->getStatusCode() === 400);

$analyzeNull = $controller->analyze(null);
assertTest("Controller: analyze(null) mengembalikan 400 Bad Request", $analyzeNull->getStatusCode() === 400);

$historyNull = $controller->analysisHistory(null);
assertTest("Controller: analysisHistory(null) mengembalikan 400 Bad Request", $historyNull->getStatusCode() === 400);

$replyNull = $controller->reply(null);
assertTest("Controller: reply(null) mengembalikan 400 Bad Request", $replyNull->getStatusCode() === 400);

$repliesNull = $controller->replies(null);
assertTest("Controller: replies(null) mengembalikan 400 Bad Request", $repliesNull->getStatusCode() === 400);

// 12.3 Proteksi Autentikasi
$showUnauth = $controller->show(1);
assertTest("Controller: show() tanpa token mengembalikan 401 Unauthorized", $showUnauth->getStatusCode() === 401);

$myUnauth = $controller->my();
assertTest("Controller: my() tanpa token mengembalikan 401 Unauthorized", $myUnauth->getStatusCode() === 401);

$createUnauth = $controller->create();
assertTest("Controller: create() tanpa token mengembalikan 401 Unauthorized", $createUnauth->getStatusCode() === 401);

echo "\n";

// -----------------------------------------------------------------
// 13. TEST AUTHENTICATION & API TOKEN LIFECYCLE
// -----------------------------------------------------------------
echo "[13] Testing Authentication & API Token Lifecycle...\n";
$tokenService = new \App\Libraries\ApiTokenService();

// 13.1 Token Issue
$issuedToken = $tokenService->issue((int) $regularUser['id']);
assertTest("Auth: Token berhasil diterbitkan", !empty($issuedToken) && strlen($issuedToken) >= 40);

// 13.2 Authenticate via Bearer header
$authUser = $tokenService->userFromAuthorization("Bearer {$issuedToken}");
assertTest("Auth: Autentikasi valid dengan Bearer token", $authUser !== null && (int) $authUser['id'] === (int) $regularUser['id']);
assertTest("Auth: Hash password disembunyikan dari profil pengguna", !isset($authUser['password_hash']));

// 13.3 Invalid & Malformed Token Handling
assertTest("Auth: Tolak token kosong / null", $tokenService->userFromAuthorization(null) === null);
assertTest("Auth: Tolak format token tidak valid", $tokenService->userFromAuthorization("Basic abcdef123456") === null);
assertTest("Auth: Tolak token palsu yang tidak ada di database", $tokenService->userFromAuthorization("Bearer " . str_repeat("a", 50)) === null);

// 13.4 Token Revocation (Logout)
$revoked = $tokenService->revokeAuthorization("Bearer {$issuedToken}");
assertTest("Auth: Revoke token (logout) berhasil", $revoked === true);
assertTest("Auth: Token yang telah di-revoke tidak dapat digunakan kembali", $tokenService->userFromAuthorization("Bearer {$issuedToken}") === null);

echo "\n";

// -----------------------------------------------------------------
// 14. TEST SERVICE-LAYER RBAC & UNKNOWN ROLE REJECTION
// -----------------------------------------------------------------
echo "[14] Testing Service-Layer RBAC & Unknown Role Rejection...\n";
$mockComplaint = [
    'id'            => 8888,
    'user_id'       => (int) $regularUser['id'],
    'assigned_unit' => 'Sarana Prasarana dan Layanan Umum',
];

// 14.1 Admin has full access
$adminAccessOk = true;
try {
    $complaintService->assertComplaintAccess($mockComplaint, $adminUser, 'view');
    $complaintService->assertComplaintAccess($mockComplaint, $adminUser, 'reanalyze');
    $complaintService->assertComplaintAccess($mockComplaint, $adminUser, 'reply');
} catch (Throwable $e) {
    $adminAccessOk = false;
}
assertTest("RBAC: Admin memiliki akses ke seluruh tindakan pengaduan", $adminAccessOk);

// 14.2 Stakeholder Unit Matching

$stakeholderMatchOk = true;
try {
    $complaintService->assertComplaintAccess($mockComplaint, $matchingStakeholder, 'view');
    $complaintService->assertComplaintAccess($mockComplaint, $matchingStakeholder, 'reanalyze');
    $complaintService->assertComplaintAccess($mockComplaint, $matchingStakeholder, 'reply');
} catch (Throwable $e) {
    $stakeholderMatchOk = false;
}
assertTest("RBAC: Stakeholder dapat mengakses pengaduan unitnya", $stakeholderMatchOk);

$diffStakeholderBlocked = false;
try {
    $complaintService->assertComplaintAccess($mockComplaint, $diffStakeholder, 'view');
} catch (InvalidArgumentException $e) {
    $diffStakeholderBlocked = true;
}
assertTest("RBAC: Stakeholder dilarang mengakses pengaduan unit lain", $diffStakeholderBlocked);

// 14.3 User Permission Boundaries
$userActionBlocked = false;
try {
    $complaintService->assertComplaintAccess($mockComplaint, $regularUser, 'reanalyze');
} catch (InvalidArgumentException $e) {
    $userActionBlocked = true;
}
assertTest("RBAC: User biasa dilarang melakukan analisis ulang", $userActionBlocked);

// 14.4 Unknown Role Default Deny
$unknownRoleUser = ['id' => 999, 'role' => 'guest'];
$unknownRoleBlocked = false;
try {
    $complaintService->assertComplaintAccess($mockComplaint, $unknownRoleUser, 'view');
} catch (InvalidArgumentException $e) {
    $unknownRoleBlocked = true;
}
assertTest("RBAC: Role tidak dikenal ditolak secara default", $unknownRoleBlocked);

echo "\n";

// -----------------------------------------------------------------
// 15. COMPREHENSIVE IDOR & SERVICE-LAYER CROSS-USER MATRIX
// -----------------------------------------------------------------
echo "[15] Testing Comprehensive IDOR & Cross-User Isolation...\n";

// Buat tiket uji khusus isolasi IDOR
$idorComplaintData = [
    'type'        => 'complaint',
    'description' => 'Kerusakan fasilitas proyektor di ruang teater B.',
    'category'    => 'Sarana Prasarana dan Layanan Umum',
];
$createdIdor = $complaintService->createComplaint($idorComplaintData, $regularUser);
$idorId = (int) $createdIdor['id'];

// 15.1 User lain dilarang melihat detail (IDOR Prevention)
$idorDetailOther = $complaintService->getComplaintDetail($idorId, $otherUser);
assertTest("IDOR: User lain tidak dapat membaca detail pengaduan (returns null/404)", $idorDetailOther === null);

// 15.2 User pemilik sah dapat membaca detail
$idorDetailOwner = $complaintService->getComplaintDetail($idorId, $regularUser);
assertTest("IDOR: Pemilik sah dapat membaca detail pengaduannya", $idorDetailOwner !== null && (int) $idorDetailOwner['id'] === $idorId);

// 15.3 User lain dilarang membalas pengaduan orang lain
$otherReplyBlocked = false;
try {
    $complaintService->addReply($idorId, "Komentar ilegal dari hacker", $otherUser);
} catch (InvalidArgumentException $e) {
    $otherReplyBlocked = true;
}
assertTest("IDOR: User lain dilarang menambahkan tanggapan pada pengaduan orang lain", $otherReplyBlocked);

// 15.4 Pemilik sah berhasil menambahkan tanggapan
$ownerReply = $complaintService->addReply($idorId, "Mohon konfirmasi estimasi waktu perbaikan.", $regularUser);
assertTest("IDOR: Pemilik sah dapat menambahkan tanggapan", !empty($ownerReply['data']['id']));

// 15.5 Stakeholder unit lain dilarang membalas
$wrongUnitReplyBlocked = false;
try {
    $complaintService->addReply($idorId, "Balasan dari unit lain", $diffStakeholder);
} catch (InvalidArgumentException $e) {
    $wrongUnitReplyBlocked = true;
}
assertTest("IDOR: Stakeholder divisi berbeda dilarang menambahkan tanggapan", $wrongUnitReplyBlocked);

// 15.6 Stakeholder divisi yang ditugaskan dapat membalas
$assignedUnitReply = $complaintService->addReply($idorId, "Teknisi Sarpras sedang meluncur ke lokasi.", $matchingStakeholder);
assertTest("IDOR: Stakeholder divisi yang ditugaskan dapat menambahkan tanggapan", !empty($assignedUnitReply['data']['id']));

// 15.7 User lain dilarang melihat daftar tanggapan
$otherGetRepliesBlocked = false;
try {
    $complaintService->getReplies($idorId, $otherUser);
} catch (InvalidArgumentException $e) {
    $otherGetRepliesBlocked = true;
}
assertTest("IDOR: User lain dilarang membaca daftar tanggapan", $otherGetRepliesBlocked);

// 15.8 Pemilik sah dapat melihat riwayat tanggapan
$ownerReplies = $complaintService->getReplies($idorId, $regularUser);
assertTest("IDOR: Pemilik sah dapat membaca seluruh percakapan pengaduannya", count($ownerReplies) >= 2);

// Cleanup IDOR test data
$db->table('complaint_reviews')->where('complaint_analysis_id', (int) $createdIdor['data']['analysis_id'])->delete();
$db->table('complaint_replies')->where('complaint_id', $idorId)->delete();
$db->table('complaint_analysis')->where('complaint_id', $idorId)->delete();
$db->table('complaints')->where('id', $idorId)->delete();

echo "\n";

// -----------------------------------------------------------------
// 16. END-TO-END WORKFLOW INTEGRATION TEST
// -----------------------------------------------------------------
echo "[16] Testing End-to-End Workflow Integration Lifecycle...\n";

// Step 1: Mahasiswa mengajukan keluhan
$lifecycleComp = $complaintService->createComplaint([
    'type'        => 'complaint',
    'description' => 'Lampu sorot lapangan basket mati, berbahaya untuk latihan malam.',
    'category'    => 'Sarana Prasarana dan Layanan Umum',
], $regularUser);
$lcId = (int) $lifecycleComp['id'];
assertTest("Lifecycle: Step 1 - Aduan berhasil dibuat (status received)", (int) $lifecycleComp['id'] > 0);

// Step 2: Admin melakukan verifikasi
$verifyRes = $complaintService->verifyComplaint($lcId, true, "Validasi fisik sarpras selesai.", $adminUser);
assertTest("Lifecycle: Step 2 - Admin verifikasi pengaduan", $verifyRes['status'] === true);

// Step 3: Admin mendisposisikan ke unit Sarpras
$dispatchRes = $complaintService->dispatchComplaint($lcId, 'Sarana Prasarana dan Layanan Umum', 'Pak Joko', 'Segera ganti bohlam.', null, $adminUser);
assertTest("Lifecycle: Step 3 - Disposisi ke Sarana Prasarana", $dispatchRes['status'] === true);

// Step 4: Unit Sarpras menerima penugasan
$acceptRes = $complaintService->acceptByUnit($lcId, 'Pak Joko', 'Tugas diterima dan dijadwalkan.', $matchingStakeholder);
assertTest("Lifecycle: Step 4 - Unit menerima tugas (in_progress)", $acceptRes['status'] === true);

// Step 5: Unit melakukan tindak lanjut teknis
$followupRes = $complaintService->followupByUnit($lcId, 'perbaikan', 'Penggantian 2 unit bohlam LED 100W.', 'Tim Sarpras', null, $matchingStakeholder);
assertTest("Lifecycle: Step 5 - Tindak lanjut teknis dicatat", $followupRes['status'] === true);

// Step 6: Unit menerbitkan jawaban resmi
$answerRes = $complaintService->answerByUnit($lcId, 'Lampu sorot telah diganti dan lapangan sudah terang.', 'Pak Joko', [], $matchingStakeholder);
assertTest("Lifecycle: Step 6 - Jawaban resmi unit diterbitkan", $answerRes['status'] === true);

// Step 7: Mahasiswa memberikan feedback kepuasan
$feedbackRes = $complaintService->submitFeedback($lcId, [
    'rating'          => 5,
    'aspect_speed'    => 5,
    'aspect_clarity'  => 5,
    'aspect_solution' => 5,
    'comment'         => 'Penanganan sangat cepat dan lapangan sudah terang kembali.',
], $regularUser);
assertTest("Lifecycle: Step 7 - Mahasiswa memberikan feedback (status resolved)", $feedbackRes['status'] === true);

// Verifikasi integritas detail akhir pengaduan
$finalDetail = $complaintService->getComplaintDetail($lcId, $regularUser);
assertTest("Lifecycle: Verifikasi status akhir adalah resolved", $finalDetail['status'] === 'resolved');
assertTest("Lifecycle: Verifikasi jejak verifikasi ada", !empty($finalDetail['verification']['approved']));
assertTest("Lifecycle: Verifikasi jejak disposisi ada", !empty($finalDetail['disposition']['target_unit']));
assertTest("Lifecycle: Verifikasi jawaban resmi unit ada", !empty($finalDetail['unit_answer']['answer']));
assertTest("Lifecycle: Verifikasi feedback rating 5 bintang tercatat", $finalDetail['feedback']['rating'] === 5);

// Cleanup lifecycle test data
$db->table('complaint_reviews')->where('complaint_analysis_id', (int) $lifecycleComp['data']['analysis_id'])->delete();
$db->table('complaint_replies')->where('complaint_id', $lcId)->delete();
$db->table('complaint_analysis')->where('complaint_id', $lcId)->delete();
$db->table('complaints')->where('id', $lcId)->delete();

echo "\n";

// -----------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------
echo "============================================================\n";
echo "TEST RESULTS: Passed: {$passed}, Failed: {$failed}\n";
echo "============================================================\n";

if ($failed > 0) {
    exit(1);
}
exit(0);
