@echo off
cd /d "%~dp0"
echo [1/3] merge translations...
node tools/merge_zh.js || goto :err
echo [2/3] build ro_zh.js...
node tools/build.js || goto :err
echo [3/3] syntax check...
node --check ro_zh.js || goto :err
node --check ro_mod.js || goto :err
echo.
echo OK. Push ro_zh.js / ro_mod.js to GitHub Pages.
pause
exit /b 0
:err
echo FAILED - see errors above.
pause
exit /b 1
