<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateUnits extends Migration
{
	public function up()
	{
		$this->forge->addField([
			'id' => ['type' => 'INT', 'auto_increment' => true],
			'code' => ['type' => 'VARCHAR', 'constraint' => 30],
			'name' => ['type' => 'VARCHAR', 'constraint' => 120],
			'description' => ['type' => 'TEXT', 'null' => true],
			'is_active' => ['type' => 'BOOLEAN', 'default' => true],
			'created_at' => ['type' => 'TIMESTAMP', 'null' => true],
			'updated_at' => ['type' => 'TIMESTAMP', 'null' => true],
		]);
		$this->forge->addKey('id', true);
		$this->forge->addUniqueKey('code');
		$this->forge->addUniqueKey('name');
		$this->forge->createTable('units', true);
	}

	public function down()
	{
		$this->forge->dropTable('units', true);
	}
}