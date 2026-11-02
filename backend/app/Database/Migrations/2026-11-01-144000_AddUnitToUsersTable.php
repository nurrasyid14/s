<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddUnitToUsersTable extends Migration
{
    public function up()
    {
        $this->forge->addColumn('users', [
            'unit' => [
                'type'       => 'VARCHAR',
                'constraint' => 150,
                'null'       => true,
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('users', 'unit');
    }
}

