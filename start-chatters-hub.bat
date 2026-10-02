@echo off
title The Chatters Hub
cd /d "%~dp0"
echo ========================================================
echo         WELCOME TO THE CHATTERS HUB!
echo ========================================================
echo.
echo Starting server...
set "PATH=C:\Users\THINKPAD\nodejs;%PATH%"
node server.js
pause
