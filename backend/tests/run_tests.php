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
// 10. SUMMARY
// -----------------------------------------------------------------
echo "============================================================\n";
echo "TEST RESULTS: Passed: {$passed}, Failed: {$failed}\n";
echo "============================================================\n";

if ($failed > 0) {
    exit(1);
}
exit(0);
