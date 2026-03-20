@echo off
title AcadAI
cd /d "%~dp0"
echo ============================================
echo   AcadAI - Student Performance Analytics
echo   http://127.0.0.1:5000
echo ============================================
echo.
python backend/app.py
pause