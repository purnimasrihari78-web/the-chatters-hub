@echo off
title Push The Chatters Hub to GitHub
cd /d "%~dp0"
set "PATH=C:\Users\THINKPAD\git\cmd;C:\Program Files\Git\cmd;%PATH%"

echo ======================================================
echo    PUSH THE CHATTERS HUB TO GITHUB
echo ======================================================
echo.

git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git is not found.
    pause
    exit /b 1
)

echo [1/3] Checking Git repository...
if not exist ".git" (
    git init
    git branch -M main
    git config user.name "purnimasrihari78-web"
    git config user.email "purnimasrihari78@users.noreply.github.com"
)

echo [2/3] Staging all files and committing...
git add .
git commit -m "The Chatters Hub - Real-time chat with WhatsApp & Instagram features + Firebase" 2>nul

echo [3/3] Setting remote to:
echo https://github.com/purnimasrihari78-web/the-chatters-hub.git
git remote remove origin 2>nul
git remote add origin https://github.com/purnimasrihari78-web/the-chatters-hub.git

echo.
echo ======================================================
echo Pushing code to GitHub...
echo (If prompted, sign in to your GitHub account)
echo ======================================================
echo.
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ======================================================
    echo    SUCCESS! Your code is now live on GitHub:
    echo    https://github.com/purnimasrihari78-web/the-chatters-hub
    echo ======================================================
) else (
    echo.
    echo ------------------------------------------------------
    echo Note: If GitHub asked for a password, GitHub requires a
    echo Personal Access Token (PAT).
    echo You can create one at: https://github.com/settings/tokens
    echo Or you can drag and drop your folder into GitHub in browser.
    echo ------------------------------------------------------
)
pause
