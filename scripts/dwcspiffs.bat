@echo off
rem Script to build spiffs file system from DWC 1.11
if not exist src\reprap.htm goto baddir
rem Create an empty build directory
if not exist build\*.* goto nobuilddir
rmdir /s /q build
:nobuilddir
mkdir build
rem Create an empty release directory
if not exist Release\*.* goto noreldir
rmdir /s /q Release
:noreldir
mkdir Release
rem Copy root files
copy src\*.htm build\
copy src\favicon.ico build\
copy src\language.xml build\
rem Copy font files
mkdir build\fonts
copy src\fonts\*.* build\fonts\
rem Copy and concatenate the css files, except for slate.css which is optional
mkdir build\css
copy /b src\css\animate.css+src\css\bootstrap.min.css+src\css\bootstrap-slider.min.css+src\css\bootstrap-theme.min.css+src\css\defaults.css build\css\all.css
copy src\css\slate.css build\css\
rem Copy and concatenate the .js files, in the correct order (don't need jquery.cookie.min any more)
mkdir build\js
copy /b src\js\jquery-2.2.1.min.js+src\js\jquery.textarea_autosize.min.js+src\js\jquery.flot.min.js+src\js\jquery.flot.resize.min.js+src\js\jquery.flot.navigate.min.js+src\js\bootstrap.min.js+src\js\bootstrap-notify.min.js+src\js\bootstrap-slider.min.js+src\js\jszip.min.js+src\js\model.js+src\js\viewmodel.js build\js\all.js
echo Zip up all the large files into gzip format
call :zip css\all.css
call :zip js\all.js
call :zip favicon.ico
call :zip language.xml
mkspiffs -c build -b 8192 -p 256 -s 3125248 Release\DuetWebControl.bin
echo Done
goto :eof
:baddir
echo Root directory doesn't contain reprap.htm
goto :eof
:zip
"C:\Program Files\7-Zip\7z.exe" -tgzip a build\%1.gz build\%1
del build\%1
goto :eof
