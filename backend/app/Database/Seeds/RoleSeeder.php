<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run()
    {
        $now = date('Y-m-d H:i:s');
        $roles = [
            ['name' => 'Administrator', 'slug' => 'admin', 'description' => 'Mengelola konfigurasi dan seluruh data aplikasi.'],
            ['name' => 'Staff', 'slug' => 'staff', 'description' => 'Menangani aduan yang ditugaskan kepada unitnya.'],
            ['name' => 'Pengguna', 'slug' => 'user', 'description' => 'Mengirim aduan dan melihat tindak lanjut miliknya.'],
        ];

        foreach ($roles as $role) {
            $exists = $this->db->table('roles')->where('slug', $role['slug'])->get()->getRowArray();
            if ($exists) {
                continue;
            }

            $this->db->table('roles')->insert($role + [
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }
}