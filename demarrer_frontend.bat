@echo off
echo ===================================================
echo   CSELEC assistant - Lancement du Frontend
echo ===================================================
cd /d "%~dp0frontend"

echo [1/3] Vérification de Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js/npm n'est pas installé ou n'est pas dans le PATH.
    pause
    exit /b
)

echo [2/3] Installation des dépendances (npm)...
call npm install
if %errorlevel% neq 0 (
    echo [ERREUR] Impossible d'installer les dépendances npm.
    pause
    exit /b
)

echo [3/3] Démarrage du serveur Vite de développement...
echo L'interface web sera accessible sur http://localhost:5173
call npm run dev
pause
