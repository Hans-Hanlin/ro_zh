@echo off
cd /d "%~dp0"
start wt -d "%cd%" --title "RO-zh - Claude Code" cmd /k claude --dangerously-skip-permissions
