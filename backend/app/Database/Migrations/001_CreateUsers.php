<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateUsers extends Migration
{
	public function up()
	{
		$this->forge->addField([
			'id' => ['type' => 'INT', 'auto_increment' => true],
			'name' => ['type' => 'VARCHAR', 'constraint' => 120],
			'slug' => ['type' => 'VARCHAR', 'constraint' => 60],
			'description' => ['type' => 'TEXT', 'null' => true],
			'created_at' => ['type' => 'TIMESTAMP', 'null' => true],
			'updated_at' => ['type' => 'TIMESTAMP', 'null' => true],
		]);
		$this->forge->addKey('id', true);
		$this->forge->addUniqueKey('slug');
		$this->forge->createTable('roles', true);

		$this->forge->addField([
			'id' => ['type' => 'INT', 'auto_increment' => true],
			'role_id' => ['type' => 'INT'],
			'unit_id' => ['type' => 'INT', 'null' => true],
			'name' => ['type' => 'VARCHAR', 'constraint' => 120],
			'email' => ['type' => 'VARCHAR', 'constraint' => 190],
			'password_hash' => ['type' => 'VARCHAR', 'constraint' => 255],
			'stakeholder_type' => ['type' => 'VARCHAR', 'constraint' => 40, 'null' => true],
			'is_active' => ['type' => 'BOOLEAN', 'default' => true],
			'created_at' => ['type' => 'TIMESTAMP', 'null' => true],
			'updated_at' => ['type' => 'TIMESTAMP', 'null' => true],
		]);
		$this->forge->addKey('id', true);
		$this->forge->addUniqueKey('email');
		$this->forge->addKey('role_id');
		$this->forge->addKey('unit_id');
		$this->forge->addForeignKey('role_id', 'roles', 'id', 'CASCADE', 'RESTRICT');
		$this->forge->createTable('users', true);
	}

	public function down()
	{
		$this->forge->dropTable('users', true);
		$this->forge->dropTable('roles', true);
	}
}