<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateComplaintRepliesTable extends Migration
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

            'complaint_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
            ],

            'user_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
            ],

            'reply' => [
                'type' => 'TEXT',
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

        // Relasi ke complaints
        $this->forge->addForeignKey(
            'complaint_id',
            'complaints',
            'id',
            'CASCADE',
            'CASCADE'
        );

        // Relasi ke users
        $this->forge->addForeignKey(
            'user_id',
            'users',
            'id',
            'CASCADE',
            'CASCADE'
        );

        $this->forge->createTable('complaint_replies');
    }

    public function down()
    {
        $this->forge->dropTable('complaint_replies');
    }
}