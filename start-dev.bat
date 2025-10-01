@echo off
echo 🚀 Starting Pool Safe Portal Development Environment
echo.

echo 📁 Current Directory: %CD%
echo.

echo 🔧 Starting Backend Server (Port 4000)...
start "Backend Server" cmd /k "cd backend && echo Starting backend... && npm start"

echo ⏳ Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak >nul

echo 💻 Starting Frontend Server (Port 5173)...
start "Frontend Server" cmd /k "cd frontend && echo Starting frontend... && npm run dev"

echo ⏳ Waiting 3 seconds for frontend to start...
timeout /t 3 /nobreak >nul

echo.
echo ✅ Both servers should now be starting!
echo 📊 Backend API: http://localhost:4000
echo 🌐 Frontend App: http://localhost:5173  
echo 🔧 Debug Tool: http://localhost:5173/debug-login.html
echo.

echo 🚪 Opening debug tool in browser...
start http://localhost:5173/debug-login.html

echo.
echo Press any key to exit this script (servers will continue running)...
pause >nul