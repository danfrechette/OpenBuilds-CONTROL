# Start the grblHAL simulator in a new window
Start-Process -FilePath ".\grblHAL\grblHAL_sim.exe" -ArgumentList "-p 5000" -NoNewWindow:$false

# Start the COM to TCP bridge in a new window
Start-Process -FilePath ".\com2tcp\com2tcp" -ArgumentList "--ignore-dsr \\.\COM5 127.0.0.1 5000" -NoNewWindow:$false
