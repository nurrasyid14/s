<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateFeedback extends Migration
{
	public function up()
	{
		$this->forge->addField([
			'id' => ['type' => 'INT', 'auto_increment' => true],
			'complaint_id' => ['type' => 'INT'],
			'user_id' => ['type' => 'INT', 'null' => true],
			'rating' => ['type' => 'SMALLINT'],
			'comment' => ['type' => 'TEXT', 'null' => true],
			'created_at' => ['type' => 'TIMESTAMP', 'null' => true],
		]);
		$this->forge->addKey('id', true);
		$this->forge->addUniqueKey('complaint_id');
		$this->forge->addForeignKey('complaint_id', 'complaints', 'id', 'CASCADE', 'CASCADE');
		$this->forge->addForeignKey('user_id', 'users', 'id', 'CASCADE', 'SET NULL');
		$this->forge->createTable('feedback', true);
	}

	public function down()
	{
		$this->forge->dropTable('feedback', true);
	}
}