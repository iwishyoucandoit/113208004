@echo off
cd /d "%~dp0"
set "PYTHON="
where py >nul 2>nul && set "PYTHON=py -3"
if not defined PYTHON where python >nul 2>nul && set "PYTHON=python"
if not defined PYTHON if exist "%LocalAppData%\Programs\Python\Python313\python.exe" set "PYTHON=%LocalAppData%\Programs\Python\Python313\python.exe"
if not defined PYTHON (
  echo Python 3 was not found. Install Python, then run this file again.
  pause
  exit /b 1
)
echo Open http://localhost:8765/ in your browser.
start "" http://localhost:8765/
%PYTHON% -m http.server 8765 --bind 127.0.0.1
pause
