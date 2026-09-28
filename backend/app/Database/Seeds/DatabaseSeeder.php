<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run()
    {
        $this->call(RoleSeeder::class);
        $this->call(UnitSeeder::class);
        $this->call(UserSeeder::class);
        $this->call(ComplaintSeeder::class);
        $this->call(ComplaintLabelSeeder::class);
        $this->call(FollowUpSeeder::class);
        $this->call(SLAEventSeeder::class);
        $this->call(FeedbackSeeder::class);
    }
}