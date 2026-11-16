<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddUnitConfidenceAndReasonToComplaintAnalysis extends Migration
{
    public function up()
    {
        $this->forge->addColumn('complaint_analysis', [
            'unit_confidence' => [
                'type'       => 'DECIMAL',
                'constraint' => '5,4',
                'null'       => true,
            ],
            'unit_reason' => [
                'type' => 'TEXT',
                'null' => true,
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('complaint_analysis', [
            'unit_confidence',
            'unit_reason',
        ]);
    }
}