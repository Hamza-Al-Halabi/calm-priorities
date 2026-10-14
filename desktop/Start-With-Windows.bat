@echo off
rem Makes Calm Priorities start (minimized, no browser popup) every time you log in to Windows.
powershell -NoProfile -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Startup')+'\Calm Priorities.lnk'); $s.TargetPath='%~dp0CalmPriorities.exe'; $s.Arguments='--background'; $s.WorkingDirectory='%~dp0'; $s.WindowStyle=7; $s.Save()"
echo Done. Calm Priorities will now start automatically when you log in.
pause
