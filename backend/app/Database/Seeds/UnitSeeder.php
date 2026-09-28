<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class UnitSeeder extends Seeder
{
	public function run()
	{
		$now = date('Y-m-d H:i:s');
		$units = [
			['code' => 'AKD', 'name' => 'Bagian Akademik'],
			['code' => 'SARPRAS', 'name' => 'Sarana & Prasarana'],
			['code' => 'KEMAHASISWAAN', 'name' => 'Kemahasiswaan'],
			['code' => 'KEUANGAN', 'name' => 'Keuangan'],
			['code' => 'IT', 'name' => 'IT Center'],
			['code' => 'PERPUS', 'name' => 'Perpustakaan'],
			['code' => 'LAINNYA', 'name' => 'Lainnya'],
		];

		foreach ($units as $unit) {
			$exists = $this->db->table('units')->where('code', $unit['code'])->get()->getRowArray();
			if ($exists) {
				continue;
			}

			$this->db->table('units')->insert($unit + [
				'is_active' => true,
				'created_at' => $now,
				'updated_at' => $now,
			]);
		}
	}
}