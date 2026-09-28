<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;
use RuntimeException;

class UserSeeder extends Seeder
{
	public function run()
	{
		$adminRole = $this->findId('roles', 'slug', 'admin');
		$staffRole = $this->findId('roles', 'slug', 'staff');
		$userRole = $this->findId('roles', 'slug', 'user');
		$academicUnit = $this->findId('units', 'code', 'AKD');
		$facilityUnit = $this->findId('units', 'code', 'SARPRAS');

		if (!$adminRole || !$staffRole || !$userRole || !$academicUnit || !$facilityUnit) {
			throw new RuntimeException('Run RoleSeeder and UnitSeeder before UserSeeder.');
		}

		$passwordHash = password_hash('Demo1234!', PASSWORD_DEFAULT);
		$now = date('Y-m-d H:i:s');
		$users = [
			['name' => 'Demo Administrator', 'email' => 'admin@example.test', 'role_id' => $adminRole, 'unit_id' => null, 'stakeholder_type' => null],
			['name' => 'Demo Academic Staff', 'email' => 'staff.academic@example.test', 'role_id' => $staffRole, 'unit_id' => $academicUnit, 'stakeholder_type' => 'Dosen'],
			['name' => 'Demo Facilities Staff', 'email' => 'staff.facilities@example.test', 'role_id' => $staffRole, 'unit_id' => $facilityUnit, 'stakeholder_type' => 'Tenaga Admin'],
			['name' => 'Demo Student', 'email' => 'student@example.test', 'role_id' => $userRole, 'unit_id' => null, 'stakeholder_type' => 'Mahasiswa'],
			['name' => 'Demo Parent', 'email' => 'parent@example.test', 'role_id' => $userRole, 'unit_id' => null, 'stakeholder_type' => 'Orang Tua'],
		];

		foreach ($users as $user) {
			$exists = $this->db->table('users')->where('email', $user['email'])->get()->getRowArray();
			if ($exists) {
				continue;
			}

			$this->db->table('users')->insert($user + [
				'password_hash' => $passwordHash,
				'is_active' => true,
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