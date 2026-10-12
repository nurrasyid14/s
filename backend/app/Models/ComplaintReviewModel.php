<?php

namespace App\Models;

use CodeIgniter\Model;

class ComplaintReviewModel extends Model
{
    protected $table            = 'complaint_reviews';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';

    protected $allowedFields = [
        'complaint_analysis_id',
        'review_status',
        'reviewed_by',
        'reviewed_at',
        'review_note',
        'final_category',
        'final_urgency_label',
        'final_urgency_score',
    ];

    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
}