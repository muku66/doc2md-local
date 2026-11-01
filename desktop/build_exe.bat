@echo off
setlocal
cd /d "%~dp0"
rem Uses official PyPI. Mainland China users may optionally add their chosen mirror.
python -m pip install --index-url https://pypi.org/simple -r requirements-build.txt
if errorlevel 1 goto fail
python -m PyInstaller --clean --noconfirm --onefile --windowed --name doc2md-local --exclude-module pymupdf.layout pdf_ppt_to_md_gui.py
if errorlevel 1 goto fail
if not exist release mkdir release
copy /y dist\doc2md-local.exe release\doc2md-local.exe >nul
copy /y LICENSE release\LICENSE.txt >nul
copy /y THIRD_PARTY_NOTICES.md release\THIRD_PARTY_NOTICES.md >nul
python -m pip freeze > release\build-environment.txt
echo Built release\doc2md-local.exe. Complete docs\windows-build.md before distribution.
pause
exit /b 0
:fail
echo Build failed. Read the error above; do not distribute partial output.
pause
exit /b 1
