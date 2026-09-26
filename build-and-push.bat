@echo off
setlocal
echo ==========================================================
echo   Manage-My-Gate: Build ^& Push Docker Images
echo ==========================================================

echo.
echo [1/4] Building Backend Image (atocash/manage-my-gate-server:latest)...
docker build -t atocash/manage-my-gate-server:latest ./backend
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Backend Docker build failed! Check if Docker Desktop is running.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/4] Building Frontend Image (atocash/manage-my-gate-client:latest)...
docker build -t atocash/manage-my-gate-client:latest --build-arg VITE_API_URL="/api" --build-arg VITE_SOCKET_URL="" --build-arg VITE_GOOGLE_CLIENT_ID="610778456829-edvpd6gcav2u31jo0p2aeligfopvqfbo.apps.googleusercontent.com" --build-arg VITE_MICROSOFT_CLIENT_ID="00000000-0000-0000-0000-000000000000" --build-arg VITE_MICROSOFT_TENANT_ID="common" ./frontend
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Frontend Docker build failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/4] Pushing Backend Image to Docker Hub...
docker push atocash/manage-my-gate-server:latest
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Pushing backend image failed! Make sure you are logged in (docker login).
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [4/4] Pushing Frontend Image to Docker Hub...
docker push atocash/manage-my-gate-client:latest
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Pushing frontend image failed! Make sure you are logged in (docker login).
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ==========================================================
echo   SUCCESS: Both Docker images built and pushed to Hub!
echo   - Backend:  atocash/manage-my-gate-server:latest
echo   - Frontend: atocash/manage-my-gate-client:latest
echo ==========================================================
pause
