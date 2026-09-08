$pth
Write-Host (Get-Location).Path
# Start the grblHAL simulator in a new window
Start-Process -FilePath (Join-Path (Get-Location).Path "_SimulatorTools\grblHAL\grblHAL_sim.exe") -ArgumentList "-p 5000" -NoNewWindow:$false

# Start the COM to TCP bridge in a new window
Start-Process -FilePath (Join-Path (Get-Location).Path "_SimulatorTools\com2tcp\com2tcp") -ArgumentList "--ignore-dsr \\.\COM5 127.0.0.1 5000" -NoNewWindow:$false



grblHAL_sim.exe -p 5000

cd C:\OpenBuilds\OpenBuilds-CONTROL-drf\_SimulatorTools\com2tcp\
.\com2tcp.exe --ignore-dsr \\.\COM5 127.0.0.1 5000
