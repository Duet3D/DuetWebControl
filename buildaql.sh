#!/bin/sh
# Script to compress and build additional spiffs file system for DWC
#
# This script requires the following tools:
# - mkspiffs from https://github.com/igrr/mkspiffs/releases
# - yui-compressor from https://yui.github.io/yuicompressor
# Make sure both tools are accessible via your PATH environment variable!

# Version with Aquilegia integrated - tested OK
# The css minification don't work on most files, so not all css are minified
# The build was done on Windows 10 bash shell, which is based upon Ubuntu 14.04.4 LTS
# yui-compressor version of ubuntu is quite old (2.4.7.1), this may be the problem
# An attemp to minify with sass failed. 
# To be loaded via apt-get on Windows bash: yui-compressor, zip (sudo apt-get install progname)
# mkspiffs executable will go in /usr/bin

# Get the current version
VERSION=$(grep -oP "Duet Web Control v\K(.*)" ./core/reprap.htm)

# Core directory must contain reprap.htm
if [ -f !"./core/reprap.htm" ] ; then
	echo "core directory doesn't contain reprap.htm"
	exit
fi

# Create an empty build directory
if [ -d "./build" ] ; then
	rm -r ./build
fi
mkdir ./build

echo "=> Building Duet Web Control for Duet WiFi"

# Compress favicon
echo "Compressing favicon"
gzip -c ./core/favicon.ico > ./build/favicon.ico.gz

# Copy HTML files and change CSS and JS rels
echo "Changing CSS and JS paths"
cp ./core/reprap.htm ./build/reprap.htm
cp ./core/html404.htm ./build/html404.htm
sed -i "/<link href/d" ./build/reprap.htm
sed -i "/<script src/d" ./build/reprap.htm
sed -i "/<!-- CSS/a	<link href=\"css/dwc.css\" rel=\"stylesheet\">" ./build/reprap.htm
sed -i "/<!-- Placed/a <script src=\"js/dwc.js\"></script>" ./build/reprap.htm

# Compress HTML files
#echo "Compressing HTML files"
#gzip -c ./build/reprap.htm > ./build/reprap.htm.gz
#gzip -c ./build/html404.htm > ./build/html404.htm.gz
#rm ./build/reprap.htm
#rm ./build/html404.htm

# Compress XML files
echo "Compressing XML files"
gzip -c ./core/language.xml > ./build/language.xml.gz

# Minify CSS files
echo "Minifying CSS files and changing font paths"
mkdir ./build/css
echo "- Minifying slate"
yui-compressor --nomunge -o ./build/css/slate.css ./core/css/slate.css
echo "- Minifying animate"
#yui-compressor --nomunge --disable-optimizations ./core/css/animate.css >> ./build/css/dwc.css 
cat ./core/css/animate.css >> ./build/css/dwc.css
#sass --watch ./core/css/animate.css:./build/css/test.css --style compressed --scss 
sed -i -e '$a\' ./build/css/dwc.css
#Yui compressor fails on many files, so they are just appended
echo "- Adding compressed files"
cat ./core/css/bootstrap.min.css >> ./build/css/dwc.css
sed -i -e '$a\' ./build/css/dwc.css #add newline at end of line 
cat ./core/css/bootstrap-theme.min.css >> ./build/css/dwc.css
sed -i -e '$a\' ./build/css/dwc.css
cat ./core/css/bootstrap-slider.min.css >> ./build/css/dwc.css
sed -i -e '$a\' ./build/css/dwc.css
echo "- Minifying defaults"
#yui-compressor -v --nomunge --disable-optimizations ./core/css/defaults.css >> ./build/css/dwc.css
cat ./core/css/defaults.css >> ./build/css/dwc.css
# Aquilegia 
echo "- Minifying aql & aqlperso"
#yui-compressor -v --nomunge --disable-optimizations ./core/aql/aql.css >> ./build/css/dwc.css
cat ./core/aql/aql.css >> ./build/css/dwc.css
#yui-compressor ./core/aql/aqlperso.css >> ./build/css/dwc.css
echo "Add sprite and bullet"
cp ./core/aql/aqlsprite.png ./build/css/aqlsprite.png
cp ./core/aql/aqlbullet.png ./build/css/aqlbullet.png

sed -i "s/-halflings-regular\./\./g" ./build/css/dwc.css

# Compress minified CSS files
echo "Compressing CSS files"
gzip -c ./build/css/dwc.css > ./build/css/dwc.css.gz
rm ./build/css/dwc.css

# Minify JS files
echo "Minifying JS files"
mkdir ./build/js
JS_FILES=$(grep -e "\.js" ./core/reprap.htm | cut -d '"' -f 2 | sed -e 's/^/core\//' | tr '\n' ' ')
for FILE in $JS_FILES; do
	echo "- Minifying $FILE..."
	yui-compressor $FILE >> ./build/js/dwc.js
done

# Aquilegia 
yui-compressor ./core/aql/aql.js >> ./build/js/dwc.js
yui-compressor ./core/aql/aqlapp.js >> ./build/js/dwc.js

# Compress minified JS file
echo "Compressing JS file"
gzip -c ./build/js/dwc.js > ./build/js/dwc.js.gz
rm ./build/js/dwc.js

# Compress font files
echo "Compressing fonts"
mkdir ./build/fonts
gzip -c ./core/fonts/glyphicons-halflings-regular.eot > ./build/fonts/glyphicons.eot.gz
gzip -c ./core/fonts/glyphicons-halflings-regular.svg > ./build/fonts/glyphicons.svg.gz
gzip -c ./core/fonts/glyphicons-halflings-regular.ttf > ./build/fonts/glyphicons.ttf.gz
gzip -c ./core/fonts/glyphicons-halflings-regular.woff > ./build/fonts/glyphicons.woff.gz
gzip -c ./core/fonts/glyphicons-halflings-regular.woff2 > ./build/fonts/glyphicons.woff2.gz
gzip -c ./core/fonts/Homenaje-Regular.ttf > ./build/fonts/Homenaje-Regular.ttf.gz

# Create SPIFFS image for DuetWiFi
echo "Creating SPIFFS image for Duet WiFi"
mkspiffs -c ./build -b 8192 -p 256 -s 3125248 ./DuetWebControl-$VERSION.bin

# exit #!!!!!!! temporary !!!!!!

# Now build DWC for first-gen Duets
echo "=> Building Duet Web Control for first-gen Duets"
rm -r ./build/*

# Copy target files
echo "Moving JavaScript files in place"
cp -r ./core/* ./build/
mv ./build/js/3rd-party/* ./build/js
rmdir ./build/js/3rd-party

#Aquilegia
rm ./build/aql/upload.js
rm ./build/aql/flat.js
rm ./build/a.htm

rename.ul .jpg .jpgd ./build/h/d/*.jpg
rename.ul .png .pngd ./build/h/d/*.png

rename.ul .jpg .jpgf ./build/h/f/*.jpg
rename.ul .png .pngf ./build/h/f/*.png

echo "Fixing JavaScript file paths"
sed -i "s/js\/3rd-party/js/" ./build/reprap.htm

# create final ZIP file for first-gen Duets
echo "Creating final DuetWebControl.zip"
# TODO: Pack build directory instead of core once compression support has been added to RRF-Duet
cd ./build
zip -r -o ../DuetWebControl-$VERSION.zip ./*
cd ..

# clean up again
rm -r -f ./build
echo "Done"
