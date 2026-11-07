<?php

namespace App\Services;

use DateTimeImmutable;
use DateTimeInterface;
use DateTimeZone;

class SLAService
{
    public const TIMEZONE = 'Asia/Jakarta';

    public const UNIT_SLA_DAYS = [
        'Sarana Prasarana dan Layanan Umum' => 2,
        'TIK/Sistem Informasi'              => 2,
        'Akademik'                          => 3,
        'Kemahasiswaan'                     => 3,
        'Keuangan'                          => 3,
        'Perpustakaan'                      => 2,
        'Laboratorium/Jurusan'              => 2,
        'Ukarni dan Hubungan Alumni'        => 3,
        'Keamanan dan Ketertiban'           => 1,
        'SDM/Kepegawaian'                   => 3,
        'Kerjasama dan Hubungan Eksternal'  => 4,
        'Informasi Publik/PPID'             => 3,
        'Pimpinan/Manajemen'                => 5,
        'Lainnya/Lintas Unit'               => 3,
    ];

    public const DEFAULT_SLA_DAYS = 3;

    /**
     * Dapatkan target hari SLA untuk unit tertentu.
     */
    public function getTargetSlaDays(?string $unit): int
    {
        if ($unit === null || $unit === '') {
            return self::DEFAULT_SLA_DAYS;
        }

        foreach (self::UNIT_SLA_DAYS as $knownUnit => $days) {
            if (strcasecmp(trim($unit), $knownUnit) === 0) {
                return $days;
            }
        }

        return self::DEFAULT_SLA_DAYS;
    }

    /**
     * Hitung batas tenggat SLA (deadline).
     */
    public function calculateDeadline(DateTimeInterface $startDate, ?string $unit = null, ?int $customDays = null): DateTimeImmutable
    {
        $days = $customDays ?? $this->getTargetSlaDays($unit);
        $dt = DateTimeImmutable::createFromInterface($startDate)->setTimezone(new DateTimeZone(self::TIMEZONE));
        return $dt->modify("+{$days} days");
    }

    /**
     * Evaluasi kepatuhan SLA untuk tiket keluhan.
     */
    public function evaluateCompliance(
        DateTimeInterface $createdAt,
        ?DateTimeInterface $resolvedAt = null,
        ?string $unit = null,
        ?int $customDays = null
    ): array {
        $tz = new DateTimeZone(self::TIMEZONE);
        $created = DateTimeImmutable::createFromInterface($createdAt)->setTimezone($tz);
        $targetDays = $customDays ?? $this->getTargetSlaDays($unit);
        $deadline = $created->modify("+{$targetDays} days");

        $now = new DateTimeImmutable('now', $tz);
        $evalTime = $resolvedAt ? DateTimeImmutable::createFromInterface($resolvedAt)->setTimezone($tz) : $now;

        $isResolved = ($resolvedAt !== null);
        $isCompliant = ($evalTime <= $deadline);

        // Hitung selisih hari & jam
        $actualDays = round(($evalTime->getTimestamp() - $created->getTimestamp()) / 86400, 2);
        $remainingHours = round(($deadline->getTimestamp() - $now->getTimestamp()) / 3600, 1);

        return [
            'target_days'     => $targetDays,
            'deadline'        => $deadline->format(DATE_ATOM),
            'actual_days'     => $actualDays,
            'remaining_hours' => $remainingHours,
            'is_resolved'     => $isResolved,
            'is_compliant'    => $isCompliant,
            'status'          => $isCompliant ? ($isResolved ? 'resolved_on_time' : 'in_sla') : ($isResolved ? 'resolved_late' : 'breached'),
        ];
    }

    /**
     * Dapatkan daftar seluruh unit resmi PENS.
     */
    public function getValidUnits(): array
    {
        return array_keys(self::UNIT_SLA_DAYS);
    }

    /**
     * Cek apakah nama unit terdaftar secara resmi.
     */
    public function isValidUnit(string $unit): bool
    {
        $trimmed = trim($unit);
        foreach (self::UNIT_SLA_DAYS as $knownUnit => $days) {
            if (strcasecmp($trimmed, $knownUnit) === 0) {
                return true;
            }
        }
        return false;
    }
}
