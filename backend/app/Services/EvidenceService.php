<?php

namespace App\Services;

use CodeIgniter\HTTP\Files\UploadedFile;

class EvidenceService
{
    private const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'];
    private const MAX_FILE_SIZE_BYTES = 5242880; // 5 MB

    /**
     * Validasi satu file lampiran.
     */
    public function validateFile(UploadedFile $file): array
    {
        if (!$file->isValid()) {
            return [
                'valid' => false,
                'error' => $file->getErrorString() . ' (' . $file->getError() . ')',
            ];
        }

        if ($file->getSize() > self::MAX_FILE_SIZE_BYTES) {
            return [
                'valid' => false,
                'error' => 'Ukuran file melebihi batas maksimum 5MB.',
            ];
        }

        $extension = strtolower($file->getExtension());
        if (!in_array($extension, self::ALLOWED_EXTENSIONS, true)) {
            return [
                'valid' => false,
                'error' => 'Ekstensi file tidak diizinkan. Format yang didukung: ' . implode(', ', self::ALLOWED_EXTENSIONS),
            ];
        }

        return ['valid' => true, 'error' => null];
    }

    /**
     * Simpan file lampiran secara aman dan kembalikan metadata.
     */
    public function storeAttachment(UploadedFile $file, string $subfolder = 'complaints'): array
    {
        $validation = $this->validateFile($file);
        if (!$validation['valid']) {
            throw new \InvalidArgumentException($validation['error']);
        }

        $newName = $file->getRandomName();
        $targetDir = WRITEPATH . 'uploads' . DIRECTORY_SEPARATOR . $subfolder;
        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0755, true);
        }

        $file->move($targetDir, $newName);

        return [
            'original_name' => $file->getClientName(),
            'file_name'     => $newName,
            'file_path'     => 'uploads/' . $subfolder . '/' . $newName,
            'file_size'     => $file->getSize(),
            'file_type'     => $file->getClientMimeType(),
        ];
    }
}
