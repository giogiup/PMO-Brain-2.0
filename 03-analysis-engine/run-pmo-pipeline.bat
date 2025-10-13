@echo off
cd /d "D:\PMO-Brain-2.0-Modular\03-analysis-engine"
echo Starting PMO Brain Pipeline at %date% %time% (RSA Time)
node production-local-filter.js pipeline >> logs\scheduler.log 2>&1
echo Pipeline completed at %date% %time%