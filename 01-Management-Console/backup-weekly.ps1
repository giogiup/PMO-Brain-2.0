# PMO-Brain 2.0 - Weekly Backup Script
# Folder size: ~198MB, keeps last 3 backups (~600MB total)

$sourceFolder = "D:\PMO-Brain-2.0-Modular"
$backupRoot = "D:\New folder\OneDrive\PMO-Brain-Backups"
$timestamp = Get-Date -Format "yyyy-MM-dd_HHmm"
$backupFolder = Join-Path $backupRoot $timestamp
$databasePath = "D:\PMO-Brain-2.0-Modular\02-discovery-engine\pmo_insights.db"
$keepLastN = 3

function Log-Operation {
    param($status, $message, $error = "")
    $batchId = [guid]::NewGuid().ToString()
    if ($error) {
        sqlite3 $databasePath "INSERT INTO operations_log (operation_type, component, status, message, error_message, batch_id) VALUES ('backup', 'system', '$status', '$message', '$error', '$batchId')"
    } else {
        sqlite3 $databasePath "INSERT INTO operations_log (operation_type, component, status, message, batch_id) VALUES ('backup', 'system', '$status', '$message', '$batchId')"
    }
}

Write-Host "=== PMO-Brain 2.0 Weekly Backup ===" -ForegroundColor Cyan
Write-Host "Timestamp: $timestamp" -ForegroundColor Gray
Write-Host "Destination: OneDrive (keeps last 3)" -ForegroundColor Gray
Write-Host ""

try {
    Log-Operation "started" "Weekly backup to OneDrive started"
    
    if (!(Test-Path $backupRoot)) {
        New-Item -ItemType Directory -Path $backupRoot | Out-Null
        Write-Host "Created backup directory: $backupRoot" -ForegroundColor Green
    }
    
    New-Item -ItemType Directory -Path $backupFolder | Out-Null
    Write-Host "Backup folder: $backupFolder" -ForegroundColor Green
    
    Write-Host "Copying files (~198MB)..." -ForegroundColor Yellow
    Copy-Item -Path $sourceFolder -Destination $backupFolder -Recurse -Force
    
    $backupSize = (Get-ChildItem -Path $backupFolder -Recurse | Measure-Object -Property Length -Sum).Sum
    $backupSizeMB = [math]::Round($backupSize / 1MB, 2)
    
    Write-Host "Backup completed: $backupSizeMB MB" -ForegroundColor Green
    
    Write-Host "Cleaning old backups (keeping last $keepLastN)..." -ForegroundColor Yellow
    $existingBackups = Get-ChildItem -Path $backupRoot -Directory | Sort-Object CreationTime -Descending
    
    if ($existingBackups.Count -gt $keepLastN) {
        $toDelete = $existingBackups | Select-Object -Skip $keepLastN
        foreach ($old in $toDelete) {
            Remove-Item $old.FullName -Recurse -Force
            Write-Host "Deleted old backup: $($old.Name)" -ForegroundColor Gray
        }
        Write-Host "Deleted $($toDelete.Count) old backup(s)" -ForegroundColor Yellow
    } else {
        Write-Host "No old backups to delete (total: $($existingBackups.Count))" -ForegroundColor Gray
    }
    
    $currentBackups = Get-ChildItem -Path $backupRoot -Directory | Sort-Object CreationTime -Descending
    Write-Host ""
    Write-Host "Current backups in OneDrive:" -ForegroundColor Cyan
    foreach ($backup in $currentBackups) {
        Write-Host "  - $($backup.Name)" -ForegroundColor Gray
    }
    
    Log-Operation "success" "Backup completed - $backupSizeMB MB backed up, $($currentBackups.Count) backups retained"
    
    Write-Host ""
    Write-Host "=== Backup Complete ===" -ForegroundColor Green
    Write-Host "Location: $backupFolder" -ForegroundColor Cyan
    Write-Host "Size: $backupSizeMB MB" -ForegroundColor Cyan
    Write-Host "Total backups: $($currentBackups.Count)" -ForegroundColor Cyan
    Write-Host "OneDrive will sync automatically" -ForegroundColor Yellow
    
} catch {
    $errorMsg = $_.Exception.Message
    Write-Host "ERROR: $errorMsg" -ForegroundColor Red
    Log-Operation "failed" "Backup failed" $errorMsg
    exit 1
}