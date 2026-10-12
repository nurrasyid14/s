<?php

namespace App\Filters;

use App\Libraries\ApiTokenService;
use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class AuthRoleFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $authorization = $request->getHeaderLine('Authorization');
        $user = (new ApiTokenService())->userFromAuthorization($authorization);

        if (!$user) {
            return service('response')->setJSON([
                'status'  => false,
                'message' => 'Autentikasi diperlukan atau token sudah tidak berlaku.',
            ])->setStatusCode(401);
        }

        $allowedRoles = $arguments ?? [];
        if ($allowedRoles !== [] && !in_array($user['role'], $allowedRoles, true)) {
            return service('response')->setJSON([
                'status'  => false,
                'message' => 'Role Anda tidak diizinkan mengakses fitur ini.',
            ])->setStatusCode(403);
        }

        return null;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
    }
}
