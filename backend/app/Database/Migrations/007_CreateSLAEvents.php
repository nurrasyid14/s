<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateSLAEvents extends Migration
{
	public function up()
	{
		$this->forge->addField([
			'id' => ['type' => 'INT', 'auto_increment' => true],
			'complaint_id' => ['type' => 'INT'],
			'event_type' => ['type' => 'VARCHAR', 'constraint' => 40],
			'due_at' => ['type' => 'TIMESTAMP', 'null' => true],
			'occurred_at' => ['type' => 'TIMESTAMP', 'null' => true],
			'details' => ['type' => 'TEXT', 'null' => true],
			'created_at' => ['type' => 'TIMESTAMP', 'null' => true],
		]);
		$this->forge->addKey('id', true);
		$this->forge->addKey(['complaint_id', 'event_type']);
		$this->forge->addForeignKey('complaint_id', 'complaints', 'id', 'CASCADE', 'CASCADE');
		$this->forge->createTable('sla_events', true);
	}

	public function down()
	{
		$this->forge->dropTable('sla_events', true);
	}
}