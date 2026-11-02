<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddSentimentProbabilitiesToComplaintAnalysis extends Migration
{
    public function up()
    {
        $this->forge->addColumn('complaint_analysis', [
            'sentiment_scores' => [
                'type' => 'TEXT',
                'null' => true,
                'after' => 'sentiment_score',
            ],
            'submission_type' => [
                'type'       => 'VARCHAR',
                'constraint' => 20,
                'null'       => true,
                'after'      => 'sentiment_scores',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('complaint_analysis', 'submission_type');
        $this->forge->dropColumn('complaint_analysis', 'sentiment_scores');
    }
}
