<?php

namespace App\Commands;

use App\Services\WeeklyAnalyticsService;
use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;

class RefreshWeeklyAnalytics extends BaseCommand
{
    protected $group = 'Analytics';
    protected $name = 'analytics:refresh-weekly';
    protected $description = 'Refresh 7, 30, 90, and 180-day analytics aggregates in the data lake.';
    protected $usage = 'analytics:refresh-weekly';

    public function run(array $params)
    {
        $result = (new WeeklyAnalyticsService())->refreshRollingWindows();
        $snapshot = $result['snapshot'];

        foreach ($snapshot['aggregates'] as $days => $aggregate) {
            CLI::write(sprintf(
                '%s-day analytics refreshed (%d records).',
                $days,
                $aggregate['record_count']
            ), 'green');
        }
        CLI::write('Lake file: ' . $result['file']);
    }
}
