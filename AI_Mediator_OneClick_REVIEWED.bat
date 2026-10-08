@echo off
setlocal EnableExtensions

rem ===== Paths =====
set "GATEWAY=C:\Users\krimo25\Downloads\token-free-gateway-main\token-free-gateway-main"
set "GUI=%~dp0"

if not exist "%GATEWAY%" (
  echo.
  echo ERROR: Gateway folder not found:
  echo %GATEWAY%
  pause
  exit /b 1
)

if not exist "%GUI%AI_Mediator_GUI_server.js" (
  echo.
  echo ERROR: AI_Mediator_GUI_server.js not found beside this BAT file.
  echo Folder: %GUI%
  pause
  exit /b 1
)

where bun >nul 2>&1
if errorlevel 1 (
  echo.
  echo ERROR: Bun was not found in PATH.
  pause
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo ERROR: Node.js was not found in PATH.
  pause
  exit /b 1
)

rem ===== Start Gateway in its real working directory =====
start "AI Gateway" /D "%GATEWAY%" cmd.exe /k "bun run start"

rem ===== Wait until port 3456 is really listening =====
echo Waiting for Gateway on 127.0.0.1:3456 ...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ok=$false; for($i=0;$i-lt60;$i++){ try { $c=Test-NetConnection 127.0.0.1 -Port 3456 -WarningAction SilentlyContinue; if($c.TcpTestSucceeded){$ok=$true;break} } catch {}; Start-Sleep -Seconds 1 }; if(-not $ok){exit 1}"
if errorlevel 1 (
  echo.
  echo ERROR: Gateway did not start on port 3456.
  echo Check the Gateway window for the actual error.
  pause
  exit /b 1
)

echo.
echo Gateway is ready on 127.0.0.1:3456.

rem ===== Start GUI server beside this BAT file =====
start "AI Mediator GUI" /D "%GUI%" cmd.exe /k "node AI_Mediator_GUI_server.js"

timeout /t 2 /nobreak >nul
start "" firefox "http://127.0.0.1:3000/"

exit /b 0
