@echo off
title The Chatters Hub - Share Online
cd /d "%~dp0"
echo ========================================================
echo       THE CHATTERS HUB - PUBLIC INTERNET TUNNEL
echo ========================================================
echo.
echo Creating a secure, public HTTPS link for your friends...
echo (Anyone in the world can open this link to chat with you!)
echo.
cloudflared.exe tunnel --url http://localhost:3000
pause
