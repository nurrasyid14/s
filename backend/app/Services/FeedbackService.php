<?php

namespace App\Services;

class FeedbackService
{
    /**
     * Validasi payload masukan kepuasan pengguna.
     */
    public function validateFeedback(array $data): array
    {
        $rating = isset($data['rating']) ? (int) $data['rating'] : 0;
        if ($rating < 1 || $rating > 5) {
            return [
                'valid' => false,
                'error' => 'Rating wajib diisi dengan nilai antara 1 hingga 5.',
            ];
        }

        $speed = isset($data['aspect_speed']) ? (int) $data['aspect_speed'] : 5;
        $clarity = isset($data['aspect_clarity']) ? (int) $data['aspect_clarity'] : 5;
        $solution = isset($data['aspect_solution']) ? (int) $data['aspect_solution'] : 5;

        foreach (['Kecepatan' => $speed, 'Kejelasan' => $clarity, 'Solusi' => $solution] as $aspect => $val) {
            if ($val < 1 || $val > 5) {
                return [
                    'valid' => false,
                    'error' => "Aspek {$aspect} harus bernilai antara 1 hingga 5.",
                ];
            }
        }

        $comment = trim((string) ($data['comment'] ?? ''));

        return [
            'valid' => true,
            'data'  => [
                'rating'          => $rating,
                'aspect_speed'    => $speed,
                'aspect_clarity'  => $clarity,
                'aspect_solution' => $solution,
                'comment'         => $comment !== '' ? $comment : 'Penyelesaian aduan telah diterima oleh pelapor.',
            ],
        ];
    }

    /**
     * Format teks reply standar untuk pencatatan jejak feedback di complaint_replies.
     */
    public function formatFeedbackReply(array $feedbackData): string
    {
        $comment = $feedbackData['comment'] ?? 'Terima kasih atas tindak lanjutnya.';
        return sprintf(
            '[Feedback Stakeholder] Rating: %d/5. Kecepatan: %d/5, Kejelasan: %d/5, Solusi: %d/5. Catatan: %s',
            $feedbackData['rating'],
            $feedbackData['aspect_speed'],
            $feedbackData['aspect_clarity'],
            $feedbackData['aspect_solution'],
            $comment
        );
    }
}
