<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddPerformanceIndexesToComplaintsAndAnalysis extends Migration
{
    public function up()
    {
        // Indeks untuk tabel complaints (pencarian, penyaringan dashboard, agregasi rentang waktu)
        $this->db->query('CREATE INDEX IF NOT EXISTS idx_complaints_user_id ON complaints (user_id)');
        $this->db->query('CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints (status)');
        $this->db->query('CREATE INDEX IF NOT EXISTS idx_complaints_assigned_unit ON complaints (assigned_unit)');
        $this->db->query('CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints (created_at DESC)');
        $this->db->query('CREATE INDEX IF NOT EXISTS idx_complaints_type ON complaints (type)');

        // Indeks untuk tabel complaint_analysis (relasi FK, analitik sentimen, kategori isu, urgensi)
        $this->db->query('CREATE INDEX IF NOT EXISTS idx_complaint_analysis_complaint_id ON complaint_analysis (complaint_id)');
        $this->db->query('CREATE INDEX IF NOT EXISTS idx_complaint_analysis_category ON complaint_analysis (category)');
        $this->db->query('CREATE INDEX IF NOT EXISTS idx_complaint_analysis_sentiment ON complaint_analysis (sentiment)');
        $this->db->query('CREATE INDEX IF NOT EXISTS idx_complaint_analysis_urgency ON complaint_analysis (urgency_score DESC)');

        // Indeks untuk tabel complaint_replies (foreign key ke complaints)
        $this->db->query('CREATE INDEX IF NOT EXISTS idx_complaint_replies_complaint_id ON complaint_replies (complaint_id)');
    }

    public function down()
    {
        $this->db->query('DROP INDEX IF EXISTS idx_complaint_replies_complaint_id');
        $this->db->query('DROP INDEX IF EXISTS idx_complaint_analysis_urgency');
        $this->db->query('DROP INDEX IF EXISTS idx_complaint_analysis_sentiment');
        $this->db->query('DROP INDEX IF EXISTS idx_complaint_analysis_category');
        $this->db->query('DROP INDEX IF EXISTS idx_complaint_analysis_complaint_id');
        $this->db->query('DROP INDEX IF EXISTS idx_complaints_type');
        $this->db->query('DROP INDEX IF EXISTS idx_complaints_created_at');
        $this->db->query('DROP INDEX IF EXISTS idx_complaints_assigned_unit');
        $this->db->query('DROP INDEX IF EXISTS idx_complaints_status');
        $this->db->query('DROP INDEX IF EXISTS idx_complaints_user_id');
    }
}

