<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run()
    {
        $db = \Config\Database::connect();
        $builder = $db->table('users');

        $users = [
            [
                'name'          => 'Admin Sentral PENS',
                'email'         => 'admin@pens.ac.id',
                'password_hash' => password_hash('admin123', PASSWORD_DEFAULT),
                'role'          => 'admin',
                'position'      => 'Administrator Verifikator & Disposisi',
                'institution'   => 'PENS',
                'created_at'    => date('Y-m-d H:i:s'),
                'updated_at'    => date('Y-m-d H:i:s'),
            ],
            [
                'name'          => 'Dr. Sari Wulandari',
                'email'         => 'sari@pens.ac.id',
                'password_hash' => password_hash('password123', PASSWORD_DEFAULT),
                'role'          => 'stakeholder',
                'position'      => 'Kepala Bagian Kemahasiswaan',
                'institution'   => 'PENS',
                'created_at'    => date('Y-m-d H:i:s'),
                'updated_at'    => date('Y-m-d H:i:s'),
            ],
            [
                'name'          => 'Budi Santoso',
                'email'         => 'budi@student.pens.ac.id',
                'password_hash' => password_hash('password123', PASSWORD_DEFAULT),
                'role'          => 'user',
                'user_role'     => 'Mahasiswa',
                'nim_nip'       => '3324600001',
                'institution'   => 'PENS',
                'created_at'    => date('Y-m-d H:i:s'),
                'updated_at'    => date('Y-m-d H:i:s'),
            ],
        ];

        foreach ($users as $u) {
            $exists = $builder->where('email', $u['email'])->get()->getRowArray();
            if (!$exists) {
                $builder->insert($u);
            }
        }
    }
}