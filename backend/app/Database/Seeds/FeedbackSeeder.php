<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;
use RuntimeException;

class FeedbackSeeder extends Seeder
{
    public function run()
    {
        $complaint = $this->db->table('complaints')->where('ticket_id', 'ADS-2026-0004')->get()->getRowArray();
        $user = $this->db->table('users')->where('email', 'student@example.test')->get()->getRowArray();
        if (!$complaint || !$user) {
            throw new RuntimeException('Run UserSeeder and ComplaintSeeder before FeedbackSeeder.');
        }

        $exists = $this->db->table('feedback')->where('complaint_id', $complaint['id'])->get()->getRowArray();
        if ($exists) {
            return;
        }

        $this->db->table('feedback')->insert([
            'complaint_id' => $complaint['id'],
            'user_id' => $user['id'],
            'rating' => 4,
            'comment' => 'Terima kasih, saran sudah diteruskan kepada unit terkait.',
            'created_at' => date('Y-m-d H:i:s'),
        ]);
    }
}