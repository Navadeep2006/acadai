@echo off
title AcadAI Server
cd /d "%~dp0"
echo Starting AcadAI...
echo.
C:\Users\USER\AppData\Local\Python\pythoncore-3.14-64\python.exe backend/app.py
pause