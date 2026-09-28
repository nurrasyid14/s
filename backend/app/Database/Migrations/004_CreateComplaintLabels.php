<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateComplaintLabels extends Migration
{
	public function up()
	{
		$this->forge->addField([
			'id' => ['type' => 'INT', 'auto_increment' => true],
			'complaint_id' => ['type' => 'INT'],
			'label_type' => ['type' => 'VARCHAR', 'constraint' => 40],
			'label_value' => ['type' => 'VARCHAR', 'constraint' => 100],
			'source' => ['type' => 'VARCHAR', 'constraint' => 30, 'default' => 'system'],
			'confidence' => ['type' => 'DECIMAL', 'constraint' => '4,3', 'null' => true],
			'created_at' => ['type' => 'TIMESTAMP', 'null' => true],
		]);
		$this->forge->addKey('id', true);
		$this->forge->addKey(['complaint_id', 'label_type']);
		$this->forge->addForeignKey('complaint_id', 'complaints', 'id', 'CASCADE', 'CASCADE');
		$this->forge->createTable('complaint_labels', true);
	}

	public function down()
	{
		$this->forge->dropTable('complaint_labels', true);
	}
}