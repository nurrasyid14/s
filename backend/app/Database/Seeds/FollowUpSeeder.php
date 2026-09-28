<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;
use RuntimeException;

class FollowUpSeeder extends Seeder
{
    public function run()
    {
        $followUps = [
            [
                'ticket_id' => 'ADS-2026-0002',
                'email' => 'staff.academic@example.test',
                'note' => 'Laporan diterima. Unit sedang memeriksa kemungkinan benturan jadwal.',
                'status' => 'process',
            ],
            [
                'ticket_id' => 'ADS-2026-0004',
                'email' => 'staff.academic@example.test',
                'note' => 'Saran diteruskan kepada koordinator mata kuliah untuk dibahas.',
                'status' => 'done',
            ],
        ];

        foreach ($followUps as $followUp) {
            $complaintId = $this->findId('complaints', 'ticket_id', $followUp['ticket_id']);
            $userId = $this->findId('users', 'email', $followUp['email']);
            if (!$complaintId || !$userId) {
                throw new RuntimeException('Run UserSeeder and ComplaintSeeder before FollowUpSeeder.');
            }

            $exists = $this->db->table('follow_ups')
                ->where('complaint_id', $complaintId)
                ->where('note', $followUp['note'])
                ->get()->getRowArray();
            if ($exists) {
                continue;
            }

            $this->db->table('follow_ups')->insert([
                'complaint_id' => $complaintId,
                'user_id' => $userId,
                'note' => $followUp['note'],
                'status' => $followUp['status'],
                'created_at' => date('Y-m-d H:i:s'),
            ]);
        }
    }

    private function findId(string $table, string $column, string $value): ?int
    {
        $row = $this->db->table($table)->select('id')->where($column, $value)->get()->getRowArray();
        return $row ? (int) $row['id'] : null;
    }
}