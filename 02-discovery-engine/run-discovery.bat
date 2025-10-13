@echo off
cd /d D:\PMO-Brain-2.0-Modular\02-discovery-engine
node run-discovery.js
echo.
echo Discovery complete! Now importing to database...
cd database
node import-discovery.js
echo.
echo Import complete! Now open Claude Desktop to score articles.
pause