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
        try {
            $data = $this->getRequestData();
            if (empty($data)) {
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
        } catch (\Throwable $e) {
            log_message('error', 'Gagal registrasi user: ' . $e->getMessage());
            return $this->respond([
                'status'  => false,
                'message' => 'Terjadi kesalahan pada server saat registrasi.',
            ], 500);
        }
    }

    /**
     * Register Stakeholder
     * POST /api/auth/register/stakeholder
     */
    public function registerStakeholder()
    {
        try {
            $data = $this->getRequestData();
            if (empty($data)) {
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

            // Simpan stakeholder
            $userId = $userModel->insert([
                'name'          => $data['name'],
                'email'         => $data['email'],
                'password_hash' => password_hash(
                    $data['password'],
                    PASSWORD_DEFAULT
                ),
                'position'      => $data['position'] ?? null,
                'unit'          => !empty($data['unit']) ? trim((string) $data['unit']) : null,
                'institution'   => $data['institution'] ?? null,
                'role'          => 'stakeholder',
            ]);

            if (!$userId) {
                return $this->respond([
                    'status'  => false,
                    'message' => 'Gagal membuat akun stakeholder.',
                    'errors'  => $userModel->errors(),
                ], 500);
            }

            $safeUser = [
                'id'          => (int) $userId,
                'name'        => $data['name'],
                'email'       => $data['email'],
                'role'        => 'stakeholder',
                'position'    => $data['position'] ?? null,
                'unit'        => !empty($data['unit']) ? trim((string) $data['unit']) : null,
                'institution' => $data['institution'] ?? null,
            ];

            return $this->respondCreated([
                'status'  => true,
                'message' => 'Registrasi stakeholder berhasil.',
                'token'   => (new ApiTokenService())->issue((int) $userId),
                'user'    => $safeUser,
            ]);
        } catch (\Throwable $e) {
            log_message('error', 'Gagal registrasi user: ' . $e->getMessage());
            return $this->respond([
                'status'  => false,
                'message' => 'Terjadi kesalahan pada server saat registrasi.',
            ], 500);
        }
    }

    /**
     * Login
     * POST /api/auth/login
     */
    public function login()
    {
        try {
            $data = $this->getRequestData();
            if (empty($data)) {
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
                'unit'     => $user['unit'] ?? null,
            ];

            return $this->respond([
                'status'  => true,
                'message' => 'Login berhasil.',
                'token'   => (new ApiTokenService())->issue((int) $user['id']),
                'user'    => $safeUser,
            ]);
        } catch (\Throwable $e) {
            log_message('error', 'Gagal login: ' . $e->getMessage());
            return $this->respond([
                'status'  => false,
                'message' => 'Terjadi kesalahan pada server saat login.',
            ], 500);
        }
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

    /**
     * Profil pengguna yang sedang login.
     * GET /api/auth/profile
     */
    public function profile()
    {
        $auth = (new ApiTokenService())->userFromAuthorization(
            $this->request->getHeaderLine('Authorization')
        );
        $user = $auth ? (new UserModel())->find((int) $auth['id']) : null;
        if (!$user) {
            return $this->respond(['status' => false, 'message' => 'Autentikasi diperlukan.'], 401);
        }

        return $this->respond(['status' => true, 'user' => $this->safeUser($user)]);
    }

    /**
     * Simpan perubahan profil (nama, jabatan, telepon). Email dan role tidak dapat diubah.
     * PATCH /api/auth/profile
     */
    public function updateProfile()
    {
        $auth = (new ApiTokenService())->userFromAuthorization(
            $this->request->getHeaderLine('Authorization')
        );
        if (!$auth) {
            return $this->respond(['status' => false, 'message' => 'Autentikasi diperlukan.'], 401);
        }

        $data    = $this->getRequestData();
        $updates = [];

        if (array_key_exists('name', $data)) {
            $name = trim((string) $data['name']);
            if ($name === '' || mb_strlen($name) > 100) {
                return $this->respond(['status' => false, 'message' => 'Nama wajib diisi (maksimal 100 karakter).'], 422);
            }
            $updates['name'] = $name;
        }

        foreach (['position' => 150, 'phone' => 30] as $field => $max) {
            if (array_key_exists($field, $data)) {
                $value = trim((string) $data[$field]);
                if (mb_strlen($value) > $max) {
                    return $this->respond(['status' => false, 'message' => "Kolom {$field} maksimal {$max} karakter."], 422);
                }
                $updates[$field] = $value === '' ? null : $value;
            }
        }

        if ($updates === []) {
            return $this->respond(['status' => false, 'message' => 'Tidak ada data profil yang diubah.'], 400);
        }

        try {
            $model = new UserModel();
            $model->update((int) $auth['id'], $updates);
            $user = $model->find((int) $auth['id']);

            return $this->respond([
                'status'  => true,
                'message' => 'Profil berhasil diperbarui.',
                'user'    => $this->safeUser($user),
            ]);
        } catch (\Throwable $e) {
            log_message('error', 'Gagal memperbarui profil: ' . $e->getMessage());
            return $this->respond(['status' => false, 'message' => 'Gagal memperbarui profil.'], 500);
        }
    }

    private function safeUser(array $user): array
    {
        return [
            'id'          => (int) $user['id'],
            'name'        => $user['name'],
            'email'       => $user['email'],
            'role'        => $user['role'],
            'user_role'   => $user['user_role'] ?? null,
            'institution' => $user['institution'] ?? null,
            'position'    => $user['position'] ?? null,
            'phone'       => $user['phone'] ?? null,
            'unit'        => $user['unit'] ?? null,
        ];
    }

    private function getRequestData(): array
    {
        try {
            $json = $this->request->getJSON(true);
            if (is_array($json)) {
                return $json;
            }
        } catch (\Throwable $e) {
        }
        $post = $this->request->getPost();
        if (is_array($post) && !empty($post)) {
            return $post;
        }
        $raw = $this->request->getBody();
        if (!empty($raw)) {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }
        return [];
    }
}
