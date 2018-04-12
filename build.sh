#!/bin/sh
# Build script for Duet Web Control
#
# licensed under the terms of the GNU Public License v3,
# written by Christian Hammacher 2016-2017
#
# The following tools are required:
# - yui-compressor from https://yui.github.io/yuicompressor
# - UglifyJS from https://github.com/mishoo/UglifyJS
# - gzip utility
# Make sure all tools are accessible via your PATH environment variable!

# Optional paths to the required tools
YUI_COMPRESSOR=yui-compressor
UGLIFYJS=uglifyjs
GZIP=gzip

# Check for required tools
if [[ ! $(type $YUI_COMPRESSOR 2>/dev/null) ]]; then
	echo "yui-compressor not found in PATH!"
	exit
fi

if [[ ! $(type $UGLIFYJS 2>/dev/null) ]]; then
	echo "uglifyjs not found in PATH!"
	exit
fi

if [[ ! $(type $GZIP 2>/dev/null) ]]; then
	echo "gzip not found in PATH!"
	exit
fi

# Core directory must contain reprap.htm
if [ -f !"./core/reprap.htm" ] ; then
	echo "core directory doesn't contain rerap.htm"
	exit
fi

# Get the current version
VERSION=$(grep -oP "Duet Web Control v\K(.*)" ./core/reprap.htm)

# Create an empty build directory and clean up
if [ -d "./build" ] ; then
	rm -r ./build
fi
mkdir ./build
rm -f ./DuetWebControl-*.zip

echo "=> Building compressed Duet Web Control v$VERSION bundle"

# Compress favicon
echo "Compressing favicon"
$GZIP -c ./core/favicon.ico > ./build/favicon.ico.gz

# Copy HTML files and change CSS and JS rels
echo "Changing CSS and JS paths"
cp ./core/reprap.htm ./build/reprap.htm
cp ./core/html404.htm ./build/html404.htm
sed -i "/<link href/d" ./build/reprap.htm
sed -i "/<script src/d" ./build/reprap.htm
sed -i "/<!-- CSS/a	<link href=\"css/dwc.css\" rel=\"stylesheet\">" ./build/reprap.htm
sed -i "/<!-- Placed/a <script src=\"js/dwc.js\"></script>" ./build/reprap.htm

# Compress HTML files
echo "Compressing HTML file"
$GZIP -c ./build/reprap.htm > ./build/reprap.htm.gz
rm ./build/reprap.htm

# Compress XML files
echo "Compressing XML files"
$GZIP -c ./core/language.xml > ./build/language.xml.gz

# Minify and compress CSS files
echo "Minifying and compressing CSS files"
mkdir ./build/css
$YUI_COMPRESSOR -o ./build/css/slate.css ./core/css/slate.css
$YUI_COMPRESSOR -o ./build/css/bootstrap-theme.css ./core/css/bootstrap-theme.css
CSS_FILES=$(grep -e "\.css" ./core/reprap.htm | cut -d '"' -f 2 | sed -e 's/^/core\//')
for FILE in $CSS_FILES; do
	echo "- Minifying $FILE..."
	$YUI_COMPRESSOR $FILE >> ./build/css/dwc.css
done

echo "- Changing font paths and compressing minified file"
sed -i "s/-halflings-regular\./\./g" ./build/css/dwc.css
$GZIP -c ./build/css/dwc.css > ./build/css/dwc.css.gz
rm ./build/css/dwc.css
echo "- Compressing bootstrap-theme.css"
$GZIP -c ./build/css/bootstrap-theme.css > ./build/css/bootstrap-theme.css.gz
rm ./build/css/bootstrap-theme.css
echo "- Compressing slate.css"
$GZIP -c ./build/css/slate.css > ./build/css/slate.css.gz
rm ./build/css/slate.css

# Concatenate JS files. They could be minified as well, but that would make debugging rather tricky
echo "Minifying and concatenating JS files"
mkdir ./build/js
echo "var dwcVersion = \"$VERSION\";" > ./build/js/dwc.js

JS_FILES=$(grep -e "\.js" ./core/reprap.htm | cut -d '"' -f 2 | sed -e 's/^/core\//' | tr '\n' ' ')
for FILE in $JS_FILES; do
	if [[ $FILE == "core/js/3rd-party/"* ]]; then
		echo "- Minifying $FILE..."
		cat $FILE | $UGLIFYJS -c -m --keep-fnames >> ./build/js/dwc.js
	else
		echo "- Appending $FILE..."
		cat $FILE >> ./build/js/dwc.js
	fi
done

# Compress minified JS file
echo "Compressing JS file"
$GZIP -c ./build/js/dwc.js > ./build/js/dwc.js.gz
rm ./build/js/dwc.js

# Compress font files
echo "Compressing fonts"
mkdir ./build/fonts
$GZIP -c ./core/fonts/glyphicons-halflings-regular.eot > ./build/fonts/glyphicons.eot.gz
$GZIP -c ./core/fonts/glyphicons-halflings-regular.svg > ./build/fonts/glyphicons.svg.gz
$GZIP -c ./core/fonts/glyphicons-halflings-regular.ttf > ./build/fonts/glyphicons.ttf.gz
$GZIP -c ./core/fonts/glyphicons-halflings-regular.woff > ./build/fonts/glyphicons.woff.gz
$GZIP -c ./core/fonts/glyphicons-halflings-regular.woff2 > ./build/fonts/glyphicons.woff2.gz
$GZIP -c ./core/fonts/Homenaje-Regular.ttf > ./build/fonts/Homenaje-Regular.ttf.gz

# Add image files (optional)
#echo "Adding images"
#mkdir ./build/img
#cp ./core/img/* ./build/img/

# Now build DWC for wired Duets
echo "=> Building final Duet Web Control package"
cd ./build
zip -r -o ../DuetWebControl-$VERSION.zip ./*
cd ..

# Clean up again
rm -r ./build
echo "Done"
