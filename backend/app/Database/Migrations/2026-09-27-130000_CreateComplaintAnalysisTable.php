<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateComplaintAnalysisTable extends Migration
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

            'category' => [
                'type'       => 'VARCHAR',
                'constraint' => 100,
                'null'       => true,
            ],

            'category_confidence' => [
                'type'       => 'DECIMAL',
                'constraint' => '5,4',
                'null'       => true,
            ],

            'urgency_label' => [
                'type'       => 'VARCHAR',
                'constraint' => 30,
                'null'       => true,
            ],

            'urgency_score' => [
                'type'       => 'DECIMAL',
                'constraint' => '5,4',
                'null'       => true,
            ],

            'urgency_reason' => [
                'type' => 'TEXT',
                'null' => true,
            ],

            'sentiment' => [
                'type'       => 'VARCHAR',
                'constraint' => 30,
                'null'       => true,
            ],

            'sentiment_score' => [
                'type'       => 'DECIMAL',
                'constraint' => '5,4',
                'null'       => true,
            ],

            'requires_review' => [
                'type'    => 'BOOLEAN',
                'default' => false,
            ],

            'model_version' => [
                'type'       => 'VARCHAR',
                'constraint' => 100,
                'null'       => true,
            ],

            'inference_time_ms' => [
                'type'       => 'INT',
                'constraint' => 11,
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
            'complaint_id',
            'complaints',
            'id',
            'CASCADE',
            'CASCADE'
        );

        $this->forge->createTable('complaint_analysis');
    }

    public function down()
    {
        $this->forge->dropTable('complaint_analysis');
    }
}