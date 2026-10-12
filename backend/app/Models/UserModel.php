<?php

namespace App\Models;

use CodeIgniter\Model;

class UserModel extends Model
{
    protected $table            = 'users';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;

    protected $returnType       = 'array';

    protected $allowedFields = [
        'name',
        'email',
        'nim_nip',
        'phone',
        'user_role',
        'institution',
        'position',
        'password_hash',
        'role',
    ];

    protected $useTimestamps = true;

    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
}
