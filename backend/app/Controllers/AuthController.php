<?php

namespace App\Controllers;

use App\Models\UserModel;
use App\Libraries\ApiTokenService;
use CodeIgniter\RESTful\ResourceController;

class AuthController extends ResourceController
{
    protected $format = 'json';

    /**
     * Register User
     * POST /api/auth/register/user
     */
    public function registerUser()
    {
        $data = $this->request->getJSON(true);
        if (!is_array($data)) {
            return $this->respond([
                'status'  => false,
                'message' => 'Request body harus berupa JSON yang valid.',
            ], 400);
        }

        // Validasi input
        if (
            empty($data['name']) ||
            empty($data['email']) ||
            empty($data['password'])
        ) {
            return $this->respond([
                'status'  => false,
                'message' => 'Name, email, dan password wajib diisi.'
            ], 400);
        }

        $userModel = new UserModel();

        // Cek email sudah digunakan
        $existingUser = $userModel
            ->where('email', $data['email'])
            ->first();

        if ($existingUser) {
            return $this->respond([
                'status'  => false,
                'message' => 'Email sudah terdaftar.'
            ], 409);
        }

        // Simpan user
        $userId = $userModel->insert([
            'name'          => $data['name'],
            'email'         => $data['email'],
            'password_hash' => password_hash(
                $data['password'],
                PASSWORD_DEFAULT
            ),
            'nim_nip'       => $data['nim_nip'] ?? null,
            'phone'         => $data['phone'] ?? null,
            'user_role'     => $data['user_role'] ?? null,
            'institution'   => $data['institution'] ?? null,
            'role'          => 'user',
        ]);

        if (!$userId) {
            return $this->respond([
                'status'  => false,
                'message' => 'Gagal membuat akun.',
                'errors'  => $userModel->errors(),
            ], 500);
        }

        $safeUser = [
            'id'          => (int) $userId,
            'name'        => $data['name'],
            'email'       => $data['email'],
            'role'        => 'user',
            'user_role'   => $data['user_role'] ?? null,
            'institution' => $data['institution'] ?? null,
        ];

        return $this->respondCreated([
            'status'  => true,
            'message' => 'Registrasi berhasil.',
            'token'   => (new ApiTokenService())->issue((int) $userId),
            'user'    => $safeUser,
        ]);
    }

    /**
     * Login
     * POST /api/auth/login
     */
    public function login()
    {
        $data = $this->request->getJSON(true);
        if (!is_array($data)) {
            return $this->respond([
                'status'  => false,
                'message' => 'Request body harus berupa JSON yang valid.',
            ], 400);
        }

        if (
            empty($data['email']) ||
            empty($data['password'])
        ) {
            return $this->respond([
                'status'  => false,
                'message' => 'Email dan password wajib diisi.'
            ], 400);
        }

        $userModel = new UserModel();

        $user = $userModel
            ->where('email', $data['email'])
            ->first();

        if (!$user) {
            return $this->respond([
                'status'  => false,
                'message' => 'Email atau password salah.'
            ], 401);
        }

        // Verifikasi password
        if (!password_verify($data['password'], $user['password_hash'])) {
            return $this->respond([
                'status'  => false,
                'message' => 'Email atau password salah.'
            ], 401);
        }

        $safeUser = [
            'id'    => (int) $user['id'],
            'name'  => $user['name'],
            'email' => $user['email'],
            'role'  => $user['role'],
            'user_role' => $user['user_role'] ?? null,
            'institution' => $user['institution'] ?? null,
            'position' => $user['position'] ?? null,
        ];

        return $this->respond([
            'status'  => true,
            'message' => 'Login berhasil.',
            'token'   => (new ApiTokenService())->issue((int) $user['id']),
            'user'    => $safeUser,
        ]);
    }

    /**
     * Revoke the current bearer token.
     * POST /api/auth/logout
     */
    public function logout()
    {
        (new ApiTokenService())->revokeAuthorization(
            $this->request->getHeaderLine('Authorization')
        );

        return $this->respond([
            'status'  => true,
            'message' => 'Logout berhasil.',
        ]);
    }
}
