<?php

namespace App\Services;

use Throwable;

class MLService
{
    private string $baseUrl;
    private int $analyzeTimeout;
    private int $summaryTimeout;

    public function __construct(?string $baseUrl = null, int $analyzeTimeout = 90, int $summaryTimeout = 45)
    {
        $url = $baseUrl ?? env('ML_SERVICE_URL', getenv('ML_SERVICE_URL') ?: 'http://127.0.0.1:8000');
        $this->baseUrl = rtrim((string) $url, '/');
        $this->analyzeTimeout = $analyzeTimeout;
        $this->summaryTimeout = $summaryTimeout;
    }

    /**
     * Dapatkan Base URL ML Service yang aktif.
     */
    public function getBaseUrl(): string
    {
        return $this->baseUrl;
    }

    /**
     * Panggil endpoint /analyze pada ML Service dengan retry terbatas.
     *
     * @return array [
     *   'success' => bool,
     *   'data'    => ?array,
     *   'error'   => ?string,
     *   'inference_time_ms' => int
     * ]
     */
    public function analyzeComplaint(int $complaintId, string $text, ?string $submissionType = 'complaint'): array
    {
        $payload = json_encode([
            'complaint_id'    => $complaintId,
            'text'            => $text,
            'submission_type' => $submissionType ?? 'complaint',
        ], JSON_UNESCAPED_UNICODE);

        $endpoint = $this->baseUrl . '/analyze';
        $maxAttempts = 2; // 1 initial + 1 retry jika gagal transien
        $lastError = null;
        $startTime = microtime(true);

        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            try {
                $client = \Config\Services::curlrequest();
                $response = $client->post($endpoint, [
                    'headers' => [
                        'Content-Type' => 'application/json',
                        'Accept'       => 'application/json',
                    ],
                    'body'    => $payload,
                    'timeout' => $this->analyzeTimeout,
                    'http_errors' => false,
                ]);

                $statusCode = $response->getStatusCode();
                $body = (string) $response->getBody();

                if ($statusCode >= 200 && $statusCode < 300) {
                    $json = json_decode($body, true);
                    if (is_array($json) && !empty($json['status']) && isset($json['data']) && is_array($json['data'])) {
                        $inferenceTime = (int) round((microtime(true) - $startTime) * 1000);
                        return [
                            'success'           => true,
                            'data'              => $json['data'],
                            'error'             => null,
                            'inference_time_ms' => $inferenceTime,
                        ];
                    }
                    $lastError = 'Format JSON respon dari ML Service tidak valid atau tidak memiliki data.';
                } else {
                    $lastError = "ML Service HTTP error status code {$statusCode}.";
                }
            } catch (Throwable $e) {
                // Catat pesan error teknis TANPA mencatat isi teks pengaduan (privasi data)
                $lastError = 'Koneksi ke ML Service gagal: ' . $e->getMessage();
                log_message('warning', sprintf(
                    'MLService attempt %d/%d gagal menghubungi %s: %s',
                    $attempt,
                    $maxAttempts,
                    $endpoint,
                    $e->getMessage()
                ));
            }

            // Jika percobaan pertama gagal, tunggu 300ms sebelum retry
            if ($attempt < $maxAttempts) {
                usleep(300000);
            }
        }

        $inferenceTime = (int) round((microtime(true) - $startTime) * 1000);
        return [
            'success'           => false,
            'data'              => null,
            'error'             => $lastError,
            'inference_time_ms' => $inferenceTime,
        ];
    }

    /**
     * Panggil endpoint /summary untuk ringkasan eksekutif berbasis angka.
     */
    public function generateExecutiveSummary(array $metrics, string $context = 'Laporan Eksekutif SuaraLens PENS'): ?array
    {
        $payload = json_encode([
            'metrics' => $metrics,
            'context' => $context,
        ], JSON_UNESCAPED_UNICODE);

        $endpoint = $this->baseUrl . '/summary';

        try {
            $client = \Config\Services::curlrequest();
            $response = $client->post($endpoint, [
                'headers' => [
                    'Content-Type' => 'application/json',
                    'Accept'       => 'application/json',
                ],
                'body'    => $payload,
                'timeout' => $this->summaryTimeout,
                'http_errors' => false,
            ]);

            if ($response->getStatusCode() === 200) {
                $json = json_decode($response->getBody(), true);
                if (is_array($json) && !empty($json['status']) && !empty($json['data'])) {
                    return $json['data'];
                }
            }
        } catch (Throwable $e) {
            log_message('warning', 'MLService summary request failed: ' . $e->getMessage());
        }

        return null;
    }

    /**
     * Cek kesiapan (health) ML Service.
     */
    public function checkHealth(): bool
    {
        try {
            $client = \Config\Services::curlrequest();
            $response = $client->get($this->baseUrl . '/health', [
                'timeout'     => 5,
                'http_errors' => false,
            ]);
            return $response->getStatusCode() === 200;
        } catch (Throwable) {
            return false;
        }
    }
}
