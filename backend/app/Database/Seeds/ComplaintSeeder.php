<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;
use RuntimeException;

class ComplaintSeeder extends Seeder
{
	public function run()
	{
		$studentId = $this->findId('users', 'email', 'student@example.test');
		$parentId = $this->findId('users', 'email', 'parent@example.test');
		$academicStaffId = $this->findId('users', 'email', 'staff.academic@example.test');
		$facilityStaffId = $this->findId('users', 'email', 'staff.facilities@example.test');
		$academicUnitId = $this->findId('units', 'code', 'AKD');
		$facilityUnitId = $this->findId('units', 'code', 'SARPRAS');
		$financeUnitId = $this->findId('units', 'code', 'KEUANGAN');

		if (!$studentId || !$parentId || !$academicStaffId || !$facilityStaffId || !$academicUnitId || !$facilityUnitId || !$financeUnitId) {
			throw new RuntimeException('Run UnitSeeder and UserSeeder before ComplaintSeeder.');
		}

		$now = date('Y-m-d H:i:s');
		$complaints = [
			[
				'ticket_id' => 'ADS-2026-0001', 'user_id' => null, 'unit_id' => $facilityUnitId,
				'assigned_to' => $facilityStaffId, 'type' => 'complaint', 'category' => 'facility',
				'description' => 'Lampu di ruang kelas beberapa kali padam saat perkuliahan berlangsung.',
				'is_anonymous' => true, 'status' => 'new', 'urgency_score' => 6.5,
				'nlp_category' => 'facility', 'nlp_confidence' => 0.91, 'sentiment' => 'negative',
				'sla_deadline' => date('Y-m-d H:i:s', strtotime('+2 days')),
			],
			[
				'ticket_id' => 'ADS-2026-0002', 'user_id' => $studentId, 'unit_id' => $academicUnitId,
				'assigned_to' => $academicStaffId, 'type' => 'complaint', 'category' => 'academic',
				'description' => 'Jadwal kuliah Basis Data berbenturan dengan mata kuliah lain pada semester ini.',
				'is_anonymous' => false, 'status' => 'process', 'urgency_score' => 5.0,
				'nlp_category' => 'academic', 'nlp_confidence' => 0.88, 'sentiment' => 'negative',
				'sla_deadline' => date('Y-m-d H:i:s', strtotime('+1 day')),
			],
			[
				'ticket_id' => 'ADS-2026-0003', 'user_id' => $parentId, 'unit_id' => $financeUnitId,
				'assigned_to' => null, 'type' => 'complaint', 'category' => 'finance',
				'description' => 'Pembayaran UKT sudah ditransfer tetapi status pada portal masih belum lunas.',
				'is_anonymous' => false, 'status' => 'escalate', 'urgency_score' => 8.5,
				'nlp_category' => 'finance', 'nlp_confidence' => 0.86, 'sentiment' => 'negative',
				'sla_deadline' => date('Y-m-d H:i:s', strtotime('-1 day')),
			],
			[
				'ticket_id' => 'ADS-2026-0004', 'user_id' => $studentId, 'unit_id' => $academicUnitId,
				'assigned_to' => $academicStaffId, 'type' => 'suggestion', 'category' => 'academic',
				'description' => 'Mohon materi praktikum dibagikan lebih awal agar mahasiswa dapat mempersiapkan diri.',
				'is_anonymous' => false, 'status' => 'done', 'urgency_score' => 2.0,
				'nlp_category' => 'academic', 'nlp_confidence' => 0.82, 'sentiment' => 'positive',
				'sla_deadline' => date('Y-m-d H:i:s', strtotime('-3 days')),
			],
		];

		foreach ($complaints as $complaint) {
			$exists = $this->db->table('complaints')->where('ticket_id', $complaint['ticket_id'])->get()->getRowArray();
			if ($exists) {
				continue;
			}

			$this->db->table('complaints')->insert($complaint + [
				'created_at' => $now,
				'updated_at' => $now,
			]);
		}
	}

	private function findId(string $table, string $column, string $value): ?int
	{
		$row = $this->db->table($table)->select('id')->where($column, $value)->get()->getRowArray();
		return $row ? (int) $row['id'] : null;
	}
}