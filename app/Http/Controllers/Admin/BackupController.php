<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class BackupController extends Controller
{
    /**
     * Display the backup management page.
     */
    public function index()
    {
        // Only allow admins
        if (!auth()->user()->isAdmin()) {
            abort(403, 'Unauthorized');
        }

        $backups = $this->getBackupFiles();

        return Inertia::render('admin/system/backup/index', [
            'backups' => $backups,
        ]);
    }

    /**
     * Create a new database backup.
     */
    public function create(Request $request)
    {
        if (!auth()->user()->isAdmin()) {
            abort(403, 'Unauthorized');
        }

        try {
            $database = config('database.connections.mysql.database');
            $username = config('database.connections.mysql.username');
            $password = config('database.connections.mysql.password');
            $host = config('database.connections.mysql.host');
            $port = config('database.connections.mysql.port', 3306);

            $filename = 'backup_' . date('Y-m-d_H-i-s') . '.sql';
            $backupPath = storage_path('app/backups');

            // Create backups directory if it doesn't exist
            if (!file_exists($backupPath)) {
                mkdir($backupPath, 0755, true);
            }

            $filePath = $backupPath . '/' . $filename;

            // Use mysqldump to create backup
            $command = sprintf(
                'mysqldump --host=%s --port=%s --user=%s --password=%s %s > %s 2>&1',
                escapeshellarg($host),
                escapeshellarg($port),
                escapeshellarg($username),
                escapeshellarg($password),
                escapeshellarg($database),
                escapeshellarg($filePath)
            );

            exec($command, $output, $returnVar);

            if ($returnVar !== 0) {
                // If mysqldump fails, try PHP-based backup
                $this->phpBackup($filePath, $database);
            }

            return redirect()->route('admin.system.backup.index')
                ->with('success', 'Database backup created successfully: ' . $filename);
        } catch (\Exception $e) {
            return redirect()->route('admin.system.backup.index')
                ->with('error', 'Failed to create backup: ' . $e->getMessage());
        }
    }

    /**
     * Download a backup file.
     */
    public function download(string $filename)
    {
        if (!auth()->user()->isAdmin()) {
            abort(403, 'Unauthorized');
        }

        $filePath = storage_path('app/backups/' . $filename);

        if (!file_exists($filePath)) {
            return redirect()->route('admin.system.backup.index')
                ->with('error', 'Backup file not found.');
        }

        return response()->download($filePath);
    }

    /**
     * Delete a backup file.
     */
    public function destroy(string $filename)
    {
        if (!auth()->user()->isAdmin()) {
            abort(403, 'Unauthorized');
        }

        $filePath = storage_path('app/backups/' . $filename);

        if (file_exists($filePath)) {
            unlink($filePath);
            return redirect()->route('admin.system.backup.index')
                ->with('success', 'Backup deleted successfully.');
        }

        return redirect()->route('admin.system.backup.index')
            ->with('error', 'Backup file not found.');
    }

    /**
     * Get list of backup files.
     */
    private function getBackupFiles(): array
    {
        $backupPath = storage_path('app/backups');
        $backups = [];

        if (file_exists($backupPath)) {
            $files = scandir($backupPath);
            foreach ($files as $file) {
                if ($file !== '.' && $file !== '..' && pathinfo($file, PATHINFO_EXTENSION) === 'sql') {
                    $filePath = $backupPath . '/' . $file;
                    $backups[] = [
                        'filename' => $file,
                        'size' => $this->formatFileSize(filesize($filePath)),
                        'size_bytes' => filesize($filePath),
                        'created_at' => date('Y-m-d H:i:s', filemtime($filePath)),
                    ];
                }
            }
        }

        // Sort by created date, newest first
        usort($backups, fn($a, $b) => strtotime($b['created_at']) - strtotime($a['created_at']));

        return $backups;
    }

    /**
     * Format file size for display.
     */
    private function formatFileSize(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= pow(1024, $pow);

        return round($bytes, 2) . ' ' . $units[$pow];
    }

    /**
     * PHP-based backup as fallback.
     */
    private function phpBackup(string $filePath, string $database): void
    {
        $tables = DB::select('SHOW TABLES');
        $tableKey = 'Tables_in_' . $database;

        $sql = "-- Database Backup\n";
        $sql .= "-- Generated: " . date('Y-m-d H:i:s') . "\n";
        $sql .= "-- Database: {$database}\n\n";
        $sql .= "SET FOREIGN_KEY_CHECKS=0;\n\n";

        foreach ($tables as $table) {
            $tableName = $table->$tableKey;

            // Get create table statement
            $createTable = DB::select("SHOW CREATE TABLE `{$tableName}`");
            $sql .= "DROP TABLE IF EXISTS `{$tableName}`;\n";
            $sql .= $createTable[0]->{'Create Table'} . ";\n\n";

            // Get table data
            $rows = DB::table($tableName)->get();
            if ($rows->count() > 0) {
                $columns = array_keys((array) $rows[0]);
                $columnList = '`' . implode('`, `', $columns) . '`';

                foreach ($rows as $row) {
                    $values = array_map(function ($value) {
                        if ($value === null) {
                            return 'NULL';
                        }
                        return "'" . addslashes($value) . "'";
                    }, (array) $row);

                    $sql .= "INSERT INTO `{$tableName}` ({$columnList}) VALUES (" . implode(', ', $values) . ");\n";
                }
                $sql .= "\n";
            }
        }

        $sql .= "SET FOREIGN_KEY_CHECKS=1;\n";

        file_put_contents($filePath, $sql);
    }
}
