<?php

namespace App\Models;

use CodeIgniter\Model;

class ComplaintReplyModel extends Model
{
    protected $table            = 'complaint_replies';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';

    protected $allowedFields = [
        'complaint_id',
        'user_id',
        'reply',
    ];

    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
}