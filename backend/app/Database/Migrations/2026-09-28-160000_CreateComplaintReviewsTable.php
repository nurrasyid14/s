<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateComplaintReviewsTable extends Migration
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

            'complaint_analysis_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
            ],

            'review_status' => [
                'type'       => 'VARCHAR',
                'constraint' => 30,
                'default'    => 'pending',
            ],

            'reviewed_by' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => true,
            ],

            'reviewed_at' => [
                'type' => 'TIMESTAMP',
                'null' => true,
            ],

            'review_note' => [
                'type' => 'TEXT',
                'null' => true,
            ],

            'final_category' => [
                'type'       => 'VARCHAR',
                'constraint' => 100,
                'null'       => true,
            ],

            'final_urgency_label' => [
                'type'       => 'VARCHAR',
                'constraint' => 30,
                'null'       => true,
            ],

            'final_urgency_score' => [
                'type'       => 'DECIMAL',
                'constraint' => '5,4',
                'null'       => true,
            ],

            'created_at' => [
                'type' => 'TIMESTAMP',
                'null' => true,
            ],

            'updated_at' => [
                'type' => 'TIMESTAMP',
                'null' => true,
            ],
        ]);

        $this->forge->addKey('id', true);

        $this->forge->addKey('complaint_analysis_id');
        $this->forge->addKey('reviewed_by');

        $this->forge->addForeignKey(
            'complaint_analysis_id',
            'complaint_analysis',
            'id',
            'CASCADE',
            'CASCADE'
        );

        $this->forge->addForeignKey(
            'reviewed_by',
            'users',
            'id',
            'SET NULL',
            'CASCADE'
        );

        $this->forge->createTable('complaint_reviews');
    }

    public function down()
    {
        $this->forge->dropTable('complaint_reviews', true);
    }
}