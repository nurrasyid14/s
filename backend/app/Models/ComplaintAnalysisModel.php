<?php

namespace App\Models;

use CodeIgniter\Model;

class ComplaintAnalysisModel extends Model
{
    protected $table            = 'complaint_analysis';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;

    protected $returnType       = 'array';

    protected $allowedFields = [
        'complaint_id',
        'category',
        'category_confidence',
        'urgency_label',
        'urgency_score',
        'urgency_reason',
        'sentiment',
        'sentiment_score',
        'requires_review',
        'model_version',
        'inference_time_ms',
    ];

    protected $useTimestamps = true;

    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
}