<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;
use RuntimeException;

class SLAEventSeeder extends Seeder
{
    public function run()
    {
        $events = [
            ['ticket_id' => 'ADS-2026-0001', 'event_type' => 'received', 'offset_days' => 0],
            ['ticket_id' => 'ADS-2026-0002', 'event_type' => 'received', 'offset_days' => -2],
            ['ticket_id' => 'ADS-2026-0003', 'event_type' => 'breached', 'offset_days' => -3],
            ['ticket_id' => 'ADS-2026-0004', 'event_type' => 'resolved', 'offset_days' => -4],
        ];

        foreach ($events as $event) {
            $complaint = $this->db->table('complaints')->where('ticket_id', $event['ticket_id'])->get()->getRowArray();
            if (!$complaint) {
                throw new RuntimeException('Run ComplaintSeeder before SLAEventSeeder.');
            }

            $exists = $this->db->table('sla_events')
                ->where('complaint_id', $complaint['id'])
                ->where('event_type', $event['event_type'])
                ->get()->getRowArray();
            if ($exists) {
                continue;
            }

            $this->db->table('sla_events')->insert([
                'complaint_id' => $complaint['id'],
                'event_type' => $event['event_type'],
                'due_at' => $complaint['sla_deadline'],
                'occurred_at' => date('Y-m-d H:i:s', strtotime($event['offset_days'] . ' days')),
                'details' => $event['event_type'] === 'breached' ? 'Batas waktu tindak lanjut terlewati pada data demo.' : null,
                'created_at' => date('Y-m-d H:i:s'),
            ]);
        }
    }
}