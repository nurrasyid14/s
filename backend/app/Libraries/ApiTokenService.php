<?php

namespace App\Libraries;

use App\Models\ApiTokenModel;
use App\Models\UserModel;

class ApiTokenService
{
    private const TOKEN_TTL_SECONDS = 60 * 60 * 12;

    /** Issue an opaque bearer token; only its SHA-256 hash is persisted. */
    public function issue(int $userId): string
    {
        $token = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');

        $saved = (new ApiTokenModel())->insert([
            'user_id'    => $userId,
            'token_hash' => hash('sha256', $token),
            'expires_at' => date('Y-m-d H:i:s', time() + self::TOKEN_TTL_SECONDS),
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        if (!$saved) {
            throw new \RuntimeException('Gagal membuat token autentikasi.');
        }

        return $token;
    }

    /** Return the active user for an Authorization: Bearer token, or null. */
    public function userFromAuthorization(?string $authorization): ?array
    {
        if (!$authorization || !preg_match('/^Bearer\s+([A-Za-z0-9_-]+)$/i', trim($authorization), $matches)) {
            return null;
        }

        $token = $matches[1];
        if (strlen($token) < 40 || strlen($token) > 100) {
            return null;
        }

        $record = (new ApiTokenModel())
            ->where('token_hash', hash('sha256', $token))
            ->where('expires_at >', date('Y-m-d H:i:s'))
            ->first();

        if (!$record) {
            return null;
        }

        $user = (new UserModel())->find($record['user_id']);
        if (!$user) {
            return null;
        }

        unset($user['password_hash']);
        return $user;
    }

    public function revokeAuthorization(?string $authorization): bool
    {
        if (!$authorization || !preg_match('/^Bearer\s+([A-Za-z0-9_-]+)$/i', trim($authorization), $matches)) {
            return false;
        }

        (new ApiTokenModel())->where('token_hash', hash('sha256', $matches[1]))->delete();
        return true;
    }
}
