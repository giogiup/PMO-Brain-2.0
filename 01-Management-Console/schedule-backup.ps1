# Schedule PMO-Brain Weekly Backup in Windows Task Scheduler
# Run this script as Administrator ONCE to setup weekly backups

$taskName = "PMO-Brain Weekly Backup"
$scriptPath = "D:\PMO-Brain-2.0-Modular\01-Management-Console\backup-weekly.ps1"
$dayOfWeek = "Sunday"  # Change to your preferred day: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
$triggerTime = "02:00AM"  # Change to your preferred backup time

# Create scheduled task
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $dayOfWeek -At $triggerTime
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable:$false

# Register task
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Weekly backup of PMO-Brain 2.0 system to OneDrive" -Force

Write-Host "✅ Weekly backup scheduled!" -ForegroundColor Green
Write-Host "Task Name: $taskName" -ForegroundColor Cyan
Write-Host "Runs Weekly: Every $dayOfWeek at $triggerTime" -ForegroundColor Cyan
Write-Host "Destination: OneDrive (keeps last 3 backups)" -ForegroundColor Cyan
Write-Host "Script: $scriptPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "To test now, run: Start-ScheduledTask -TaskName '$taskName'" -ForegroundColor Yellow
Write-Host "Or manually run: .\backup-weekly.ps1" -ForegroundColor Yellow