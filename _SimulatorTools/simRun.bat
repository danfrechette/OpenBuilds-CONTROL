@echo off
REM Start the grblHAL simulator on port 5000
start "grblHAL Simulator" ".\grbHAL\grblHAL_sim.exe" -p 5000

REM Wait 1 second to let the server start first
timeout /t 1 /nobreak > nul

REM Start com2tcp to bridge COM5 to the simulator
start "com2tcp Bridge" ".\com2tcp\com2tcp" --ignore-dsr \.COM5 127.0.0.1 5000

exit
