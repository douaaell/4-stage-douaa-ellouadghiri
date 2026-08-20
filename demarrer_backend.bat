@echo off
echo ===================================================
echo   CSELEC assistant - Lancement du Backend
echo ===================================================
cd /d "%~dp0backend"

echo [1/3] Vérification de Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Python n'est pas installé ou n'est pas dans le PATH.
    pause
    exit /b
)

echo [2/3] Installation des dépendances (pip)...
python -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERREUR] Impossible d'installer les dépendances.
    pause
    exit /b
)

echo [3/3] Démarrage du serveur FastAPI...
echo L'API sera accessible sur http://localhost:8000
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
pause
