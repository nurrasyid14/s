<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateEmbeddings extends Migration
{
	public function up()
	{
		$this->forge->addField([
			'id' => ['type' => 'INT', 'auto_increment' => true],
			'complaint_id' => ['type' => 'INT'],
			'model_name' => ['type' => 'VARCHAR', 'constraint' => 160],
			'dimensions' => ['type' => 'INT'],
			'embedding_json' => ['type' => 'TEXT'],
			'created_at' => ['type' => 'TIMESTAMP', 'null' => true],
		]);
		$this->forge->addKey('id', true);
		$this->forge->addUniqueKey('complaint_id');
		$this->forge->addForeignKey('complaint_id', 'complaints', 'id', 'CASCADE', 'CASCADE');
		$this->forge->createTable('complaint_embeddings', true);
	}

	public function down()
	{
		$this->forge->dropTable('complaint_embeddings', true);
	}
}