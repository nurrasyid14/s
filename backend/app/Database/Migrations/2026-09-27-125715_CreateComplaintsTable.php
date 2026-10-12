<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateComplaintsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type'           => 'INT',
                'constraint'     => 11,
                'unsigned'       => true,
                'auto_increment' => true,
            ],

            'ticket_id' => [
                'type'       => 'VARCHAR',
                'constraint' => 30,
                'unique'     => true,
            ],

            'user_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
            ],

            'type' => [
                'type'       => 'VARCHAR',
                'constraint' => 30,
            ],

            'description' => [
                'type' => 'TEXT',
            ],

            'is_anonymous' => [
                'type'       => 'BOOLEAN',
                'default'    => false,
            ],

            'status' => [
                'type'       => 'VARCHAR',
                'constraint' => 30,
                'default'    => 'submitted',
            ],

            'assigned_unit' => [
                'type'       => 'VARCHAR',
                'constraint' => 100,
                'null'       => true,
            ],

            'created_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],

            'updated_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);

        $this->forge->addKey('id', true);

        $this->forge->addForeignKey(
            'user_id',
            'users',
            'id',
            'CASCADE',
            'CASCADE'
        );

        $this->forge->createTable('complaints');
    }

    public function down()
    {
        $this->forge->dropTable('complaints');
    }
}