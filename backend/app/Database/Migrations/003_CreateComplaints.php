<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateComplaints extends Migration
{
	public function up()
	{
		$this->forge->addField([
			'id' => ['type' => 'INT', 'auto_increment' => true],
			'ticket_id' => ['type' => 'VARCHAR', 'constraint' => 40],
			'user_id' => ['type' => 'INT', 'null' => true],
			'unit_id' => ['type' => 'INT', 'null' => true],
			'assigned_to' => ['type' => 'INT', 'null' => true],
			'type' => ['type' => 'VARCHAR', 'constraint' => 30],
			'category' => ['type' => 'VARCHAR', 'constraint' => 60],
			'description' => ['type' => 'TEXT'],
			'is_anonymous' => ['type' => 'BOOLEAN', 'default' => false],
			'status' => ['type' => 'VARCHAR', 'constraint' => 30, 'default' => 'new'],
			'urgency_score' => ['type' => 'DECIMAL', 'constraint' => '4,1', 'null' => true],
			'nlp_category' => ['type' => 'VARCHAR', 'constraint' => 60, 'null' => true],
			'nlp_confidence' => ['type' => 'DECIMAL', 'constraint' => '4,3', 'null' => true],
			'sentiment' => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => true],
			'sla_deadline' => ['type' => 'TIMESTAMP', 'null' => true],
			'created_at' => ['type' => 'TIMESTAMP', 'null' => true],
			'updated_at' => ['type' => 'TIMESTAMP', 'null' => true],
		]);
		$this->forge->addKey('id', true);
		$this->forge->addUniqueKey('ticket_id');
		$this->forge->addKey('user_id');
		$this->forge->addKey('unit_id');
		$this->forge->addKey('assigned_to');
		$this->forge->addKey('status');
		$this->forge->addKey('created_at');
		$this->forge->addForeignKey('user_id', 'users', 'id', 'CASCADE', 'SET NULL');
		$this->forge->addForeignKey('unit_id', 'units', 'id', 'CASCADE', 'SET NULL');
		$this->forge->addForeignKey('assigned_to', 'users', 'id', 'CASCADE', 'SET NULL');
		$this->forge->createTable('complaints', true);
	}

	public function down()
	{
		$this->forge->dropTable('complaints', true);
	}
}