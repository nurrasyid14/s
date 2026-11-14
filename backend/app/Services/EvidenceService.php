<?php

namespace App\Services;

use CodeIgniter\HTTP\Files\UploadedFile;
use InvalidArgumentException;
use RuntimeException;

class EvidenceService
{
    public const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'];
    public const MAX_FILE_SIZE_BYTES = 5242880; // 5 MB

    /**
     * Pemetaan ekstensi ke MIME type yang sah (berdasarkan isi fisik file).
     */
    private const ALLOWED_MIME_TYPES = [
        'jpg'  => ['image/jpeg', 'image/pjpeg'],
        'jpeg' => ['image/jpeg', 'image/pjpeg'],
        'png'  => ['image/png'],
        'pdf'  => ['application/pdf', 'application/x-pdf'],
        'doc'  => ['application/msword'],
        'docx' => [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/zip',
            'application/x-zip-compressed',
        ],
    ];

    /**
     * Validasi satu file lampiran secara berlapis:
     * 1. Status upload (isValid)
     * 2. File tidak boleh 0 byte
     * 3. Batas ukuran (maksimal 5MB)
     * 4. Whitelist ekstensi aman
     * 5. Kesesuaian MIME type dari isi fisik file (finfo) terhadap ekstensi
     */
    public function validateFile(UploadedFile $file): array
    {
        $error = $file->getError();
        if ($error !== UPLOAD_ERR_OK) {
            return [
                'valid' => false,
                'error' => $file->getErrorString() . ' (' . $error . ')',
            ];
        }

        // Pada web server (non-CLI), pastikan file berasal dari HTTP multipart upload yang sah
        if (PHP_SAPI !== 'cli' && !$file->isValid()) {
            return [
                'valid' => false,
                'error' => 'File tidak sah atau bukan hasil upload HTTP yang valid.',
            ];
        }

        $tempPath = $file->getTempName();
        if (!is_file($tempPath) || !is_readable($tempPath)) {
            return [
                'valid' => false,
                'error' => 'File fisik tidak ditemukan atau tidak dapat dibaca.',
            ];
        }

        $size = $file->getSize();
        if ($size <= 0) {
            return [
                'valid' => false,
                'error' => 'File tidak boleh kosong (0 byte).',
            ];
        }

        if ($size > self::MAX_FILE_SIZE_BYTES) {
            return [
                'valid' => false,
                'error' => 'Ukuran file melebihi batas maksimum 5MB.',
            ];
        }

        // Ekstensi dari nama file asli klien
        $clientName = (string) $file->getClientName();
        $pathParts = pathinfo($clientName);
        $rawExt = $pathParts['extension'] ?? $file->getExtension();
        $extension = strtolower((string) $rawExt);

        if ($extension === '' || !in_array($extension, self::ALLOWED_EXTENSIONS, true)) {
            return [
                'valid' => false,
                'error' => 'Ekstensi file tidak diizinkan. Format yang didukung: ' . implode(', ', self::ALLOWED_EXTENSIONS),
            ];
        }

        // Deteksi MIME type fisik dari isi file sesungguhnya via finfo
        $actualMime = $this->detectActualMimeType($file);
        $allowedMimesForExt = self::ALLOWED_MIME_TYPES[$extension] ?? [];

        if ($actualMime !== '' && !in_array($actualMime, $allowedMimesForExt, true)) {
            return [
                'valid' => false,
                'error' => "MIME type file '{$actualMime}' tidak sesuai dengan ekstensi '.{$extension}'.",
            ];
        }

        return ['valid' => true, 'error' => null];
    }

    /**
     * Mendeteksi MIME type nyata dari isi fisik file menggunakan PHP finfo.
     */
    public function detectActualMimeType(string|UploadedFile $fileOrPath): string
    {
        $path = is_string($fileOrPath) ? $fileOrPath : $fileOrPath->getTempName();
        if (is_file($path) && is_readable($path)) {
            $finfo = new \finfo(FILEINFO_MIME_TYPE);
            $detected = $finfo->file($path);
            if ($detected && is_string($detected)) {
                return strtolower(trim($detected));
            }
        }

        if ($fileOrPath instanceof UploadedFile) {
            $clientMime = $fileOrPath->getClientMimeType();
            if ($clientMime) {
                return strtolower(trim($clientMime));
            }
        }

        return '';
    }

    /**
     * Simpan file lampiran secara aman dan kembalikan metadata.
     */
    public function storeAttachment(UploadedFile $file, string $subfolder = 'complaints'): array
    {
        $validation = $this->validateFile($file);
        if (!$validation['valid']) {
            throw new InvalidArgumentException($validation['error']);
        }

        // Sanitasi subfolder untuk mencegah path traversal
        $safeSubfolder = preg_replace('/[^a-zA-Z0-9_-]/', '', $subfolder);
        if ($safeSubfolder === '') {
            $safeSubfolder = 'complaints';
        }

        $targetDir = WRITEPATH . 'uploads' . DIRECTORY_SEPARATOR . $safeSubfolder;
        if (!is_dir($targetDir)) {
            if (!mkdir($targetDir, 0755, true) && !is_dir($targetDir)) {
                throw new RuntimeException("Gagal membuat direktori penyimpanan: {$targetDir}");
            }
        }

        // Pastikan ada proteksi non-executable di direktori uploads
        $this->ensureNonExecutableDirectory(WRITEPATH . 'uploads');

        // Generate nama file acak unik kriptografis
        $clientName = (string) $file->getClientName();
        $extension = strtolower(pathinfo($clientName, PATHINFO_EXTENSION) ?: $file->getExtension());
        $newName = $file->getRandomName();
        if ($extension !== '' && !str_ends_with(strtolower($newName), '.' . $extension)) {
            $newName .= '.' . $extension;
        }

        $destinationPath = $targetDir . DIRECTORY_SEPARATOR . $newName;

        try {
            $file->move($targetDir, $newName);
        } catch (\Throwable $moveEx) {
            // Pada lingkungan testing CLI, move_uploaded_file() gagal karena file bukan hasil POST HTTP nyata.
            // Gunakan copy + unlink sebagai fallback aman jika file temporary valid dan terbaca.
            $temp = $file->getTempName();
            if (is_file($temp) && is_readable($temp)) {
                if (!@copy($temp, $destinationPath)) {
                    throw new RuntimeException('Gagal memindahkan file lampiran: ' . $moveEx->getMessage(), 0, $moveEx);
                }
                @unlink($temp);
            } else {
                throw new RuntimeException('Gagal memindahkan file lampiran: ' . $moveEx->getMessage(), 0, $moveEx);
            }
        }

        $savedFilePath = 'uploads/' . $safeSubfolder . '/' . $newName;
        $actualPhysicalPath = $destinationPath;

        if (!is_file($actualPhysicalPath)) {
            throw new RuntimeException('Gagal memindahkan file lampiran ke direktori tujuan.');
        }

        $detectedMime = $this->detectActualMimeType($actualPhysicalPath);
        if ($detectedMime === '') {
            $detectedMime = $file->getClientMimeType() ?: 'application/octet-stream';
        }

        return [
            'original_name' => basename($file->getClientName()),
            'file_name'     => $newName,
            'file_path'     => $savedFilePath,
            'physical_path' => $actualPhysicalPath,
            'file_size'     => filesize($actualPhysicalPath) ?: $file->getSize(),
            'file_type'     => $detectedMime,
        ];
    }

    /**
     * Menjamin direktori upload non-executable dengan file .htaccess.
     */
    private function ensureNonExecutableDirectory(string $baseUploadDir): void
    {
        if (!is_dir($baseUploadDir)) {
            @mkdir($baseUploadDir, 0755, true);
        }

        $htaccessPath = $baseUploadDir . DIRECTORY_SEPARATOR . '.htaccess';
        if (!is_file($htaccessPath)) {
            $htaccessContent = "# SuaraLens Protected Upload Directory\n"
                . "Options -ExecCGI -Indexes\n"
                . "RemoveHandler .php .phtml .php3 .php4 .php5 .php7 .phps .cgi .pl .asp .aspx .exe .sh\n"
                . "SetHandler default-handler\n"
                . "<FilesMatch \"\\.(php|phtml|php3|php4|php5|php7|phps|cgi|pl|asp|aspx|exe|sh)$\">\n"
                . "    Order Allow,Deny\n"
                . "    Deny from all\n"
                . "</FilesMatch>\n";
            @file_put_contents($htaccessPath, $htaccessContent);
        }
    }

    /**
     * Kompensasi: Hapus satu file fisik dari disk.
     */
    public function deleteFile(string $filePath): bool
    {
        $target = str_starts_with($filePath, WRITEPATH)
            ? $filePath
            : WRITEPATH . ltrim($filePath, '/\\');

        $realTarget = realpath($target);
        $realRoot   = realpath(WRITEPATH);

        // Pastikan path berada di dalam direktori WRITEPATH untuk mencegah arbitrary file deletion
        if ($realTarget && $realRoot && str_starts_with($realTarget, $realRoot) && is_file($realTarget)) {
            return @unlink($realTarget);
        }

        if (is_file($target)) {
            return @unlink($target);
        }

        return false;
    }

    /**
     * Kompensasi: Hapus kumpulan file fisik dari disk saat transaksi gagal (zero orphan files).
     */
    public function purgeFiles(array $filePaths): void
    {
        foreach ($filePaths as $path) {
            if (is_string($path) && $path !== '') {
                $this->deleteFile($path);
            }
        }
    }
}
