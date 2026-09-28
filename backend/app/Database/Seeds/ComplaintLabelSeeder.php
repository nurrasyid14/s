<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;
use RuntimeException;

class ComplaintLabelSeeder extends Seeder
{
    public function run()
    {
        $labels = [
            ['ticket_id' => 'ADS-2026-0001', 'label_type' => 'category', 'label_value' => 'facility', 'confidence' => 0.91],
            ['ticket_id' => 'ADS-2026-0001', 'label_type' => 'sentiment', 'label_value' => 'negative', 'confidence' => 0.89],
            ['ticket_id' => 'ADS-2026-0002', 'label_type' => 'category', 'label_value' => 'academic', 'confidence' => 0.88],
            ['ticket_id' => 'ADS-2026-0002', 'label_type' => 'sentiment', 'label_value' => 'negative', 'confidence' => 0.84],
            ['ticket_id' => 'ADS-2026-0003', 'label_type' => 'category', 'label_value' => 'finance', 'confidence' => 0.86],
            ['ticket_id' => 'ADS-2026-0004', 'label_type' => 'category', 'label_value' => 'academic', 'confidence' => 0.82],
            ['ticket_id' => 'ADS-2026-0004', 'label_type' => 'sentiment', 'label_value' => 'positive', 'confidence' => 0.78],
        ];

        foreach ($labels as $label) {
            $complaintId = $this->findComplaintId($label['ticket_id']);
            if (!$complaintId) {
                throw new RuntimeException('Run ComplaintSeeder before ComplaintLabelSeeder.');
            }

            $exists = $this->db->table('complaint_labels')
                ->where('complaint_id', $complaintId)
                ->where('label_type', $label['label_type'])
                ->where('label_value', $label['label_value'])
                ->get()->getRowArray();
            if ($exists) {
                continue;
            }

            $this->db->table('complaint_labels')->insert([
                'complaint_id' => $complaintId,
                'label_type' => $label['label_type'],
                'label_value' => $label['label_value'],
                'source' => 'demo_seed',
                'confidence' => $label['confidence'],
                'created_at' => date('Y-m-d H:i:s'),
            ]);
        }
    }

    private function findComplaintId(string $ticketId): ?int
    {
        $row = $this->db->table('complaints')->select('id')->where('ticket_id', $ticketId)->get()->getRowArray();
        return $row ? (int) $row['id'] : null;
    }
}