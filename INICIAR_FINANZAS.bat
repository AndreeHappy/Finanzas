@echo off
title Gestor de Finanzas Personales
echo ====================================================================
echo        GESTOR DE FINANZAS PERSONALES (React + Supabase)
echo ====================================================================
echo.

cd /d "%~dp0"

:: Verificar si existe la carpeta node_modules
if not exist "node_modules\" (
    echo [INFO] Detectada primera ejecucion. Instalando dependencias necesarias...
    echo Esto puede tardar un momento. Por favor espera...
    echo.
    call npm install
    if errorlevel 1 (
        echo [ERROR] Ocurrio un problema al instalar dependencias. Verifica que Node.js este instalado.
        pause
        exit /b 1
    )
    echo.
    echo [OK] Dependencias instaladas correctamente.
    echo.
)

echo [INFO] Iniciando servidor de desarrollo...
echo Abriendo aplicacion en tu navegador: http://localhost:5173
start http://localhost:5173

call npm run dev
pause
