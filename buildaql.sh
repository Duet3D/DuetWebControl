#!/bin/sh
# Script to compress and build additional spiffs file system for DWC
#
# This script requires the following tools:
# - mkspiffs from https://github.com/igrr/mkspiffs/releases
# - yui-compressor from https://yui.github.io/yuicompressor
# Make sure both tools are accessible via your PATH environment variable!


# Get the current version
VERSION=$(grep -oP "Duet Web Control v\K(.*)" ./core/reprap.htm)


# Core directory must contain reprap.htm
if [ -f !"./core/reprap.htm" ] ; then
	echo "core directory doesn't contain rerap.htm"
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
yui-compressor -o ./build/css/slate.css ./core/css/slate.css
CSS_FILES=$(grep -e "\.css" ./core/reprap.htm | cut -d '"' -f 2 | sed -e 's/^/core\//')
for FILE in $CSS_FILES; do
	echo "- Minifying $FILE..."
	yui-compressor $FILE >> ./build/css/dwc.css
done

# Aquilegia 
mkdir ./build/aql
yui-compressor -o ./core/aql/aql.css ./build/aql/aql.css
cp ./core/aql/aqlsprite.png ./build/aql/aqlsprite.png
cp ./core/aql/aqlbullet.png ./build/aql/aqlbullet.png

sed -i "s/-halflings-regular\./\./g" ./build/css/dwc.css

# Compress minified CSS files
echo "Compressing CSS files"
gzip -c ./build/css/dwc.css > ./build/css/dwc.css.gz
rm ./build/css/dwc.css
gzip -c ./build/css/slate.css > ./build/css/slate.css.gz
rm ./build/css/slate.css

# Aquilegia 
gzip -c ./build/aql/aql.css > ./build/aql/aql.css.gz
rm ./build/aql/aql.css

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

cd ./build/h/d
rename .jpg .jpgd *.jpg
rename .png .pngd *.png

cd ./build/h/f
rename .jpg .jpgf *.jpg
rename .png .pngf *.png

echo "Fixing JavaScript file paths"
sed -i "s/js\/3rd-party/js/" ./build/reprap.htm

# create final ZIP file for first-gen Duets
echo "Creating final DuetWebControl.zip"
# TODO: Pack build directory instead of core once compression support has been added to RRF-Duet
cd ./build
zip -r -o ../DuetWebControl-$VERSION.zip ./*
cd ..

# clean up again
rm -r ./build
echo "Done"
