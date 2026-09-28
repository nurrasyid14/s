<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateAuditLogs extends Migration
{
	public function up()
	{
		$this->forge->addField([
			'id' => ['type' => 'INT', 'auto_increment' => true],
			'user_id' => ['type' => 'INT', 'null' => true],
			'action' => ['type' => 'VARCHAR', 'constraint' => 80],
			'entity_type' => ['type' => 'VARCHAR', 'constraint' => 60],
			'entity_id' => ['type' => 'VARCHAR', 'constraint' => 60, 'null' => true],
			'metadata' => ['type' => 'TEXT', 'null' => true],
			'ip_address' => ['type' => 'VARCHAR', 'constraint' => 45, 'null' => true],
			'created_at' => ['type' => 'TIMESTAMP', 'null' => true],
		]);
		$this->forge->addKey('id', true);
		$this->forge->addKey(['entity_type', 'entity_id']);
		$this->forge->addForeignKey('user_id', 'users', 'id', 'CASCADE', 'SET NULL');
		$this->forge->createTable('audit_logs', true);
	}

	public function down()
	{
		$this->forge->dropTable('audit_logs', true);
	}
}