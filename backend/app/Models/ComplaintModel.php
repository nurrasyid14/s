<?php

namespace App\Models;

use CodeIgniter\Model;

class ComplaintModel extends Model
{
    protected $table            = 'complaints';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';

    protected $allowedFields = [
        'ticket_id',
        'user_id',
        'type',
        'description',
        'is_anonymous',
        'status',
        'assigned_unit',
    ];

    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
}