@echo off
chcp 65001 >nul
setlocal
set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"

echo 🔧 正在启动开发环境（前后端各一进程）...
echo.
echo 后端: http://localhost:8000
echo 前端: http://localhost:5173 （请用浏览器访问此地址）
echo.
echo 关闭对应的命令行窗口即可停止该服务。
echo.

start "Backend - 简历 Agent" cmd /k "cd /d "%ROOT%\backend" && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
timeout /t 2 /nobreak >nul
start "Frontend - Vite" cmd /k "cd /d "%ROOT%\frontend" && npm run dev"

echo ✅ 已启动两个命令行窗口，请在浏览器打开 http://localhost:5173
pause
