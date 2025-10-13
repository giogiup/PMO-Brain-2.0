@echo off
cd /d D:\PMO-Brain-2.0-Modular\Automation

echo Disconnecting ExpressVPN...
"C:\Program Files (x86)\ExpressVPN\services\ExpressVPN.CLI.exe" disconnect
timeout /t 5 /nobreak >nul

echo Running SmartPMO Pipeline...
node run-daily-pipeline.js

echo Reconnecting ExpressVPN...
"C:\Program Files (x86)\ExpressVPN\services\ExpressVPN.CLI.exe" connect

exit