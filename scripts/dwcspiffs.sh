#!/bin/sh
# script to build spiffs file sysem for DWC
echo "Building DWC"
if [ -f !"./src/reprap.htm" ] ; then 
	echo "Root directory doesn't contain rerap.htm"
	exit
fi
# Create an empty build directory
if [ -d "./build" ] ; then
	rm -r ./build
#	rmdir ./build
fi
mkdir ./build

# Create an empty release directory	
if [ -d "./Release" ] ; then
	rm -r ./Release
#	rmdir ./Release
fi
mkdir ./Release

# Copy root files
cp ./src/*.htm ./build/
cp ./src/favicon.ico ./build/
cp ./src/language.xml ./build/

# Copy font files
mkdir build/fonts
cp ./src/fonts/*.* ./build/fonts/

# Copy and concatenate the .css files, except for slate.css which is optional
mkdir build/css
cat ./src/css/*.css >> ./build/css/tmp
mv ./build/css/tmp ./build/css/all.css
cp ./src/css/slate.css ./build/css

# Copy and concatenate the .js files, in the correct orer (don't need jquery.cookiermin any more)
mkdir build/js
cat ./src/js/jquery-2.2.1.min.js >> ./build/js/tmp
cat ./src/js/jquery.textarea_autosize.min.js >> ./build/js/tmp
cat ./src/js/jquery.flot.min.js >> ./build/js/tmp
cat ./src/js/jquery.flot.resize.min.js >> ./build/js/tmp
cat ./src/js/jquery.flot.navigate.min.js >> ./build/js/tmp
cat ./src/js/bootstrap.min.js >> ./build/js/tmp
cat ./src/js/bootstrap-notify.min.js >> ./build/js/tmp
cat ./src/js/bootstrap-slider.min.js >> ./build/js/tmp
cat ./src/js/jszip.min.js >> ./build/js/tmp
cat ./src/js/model.js >> ./build/js/tmp
cat ./src/js/viewmodel.js >> ./build/js/tmp
mv ./build/js/tmp ./build/js/all.js

echo "Zip up all the large files into gzip format"
zip ./build/css/all.css.gz ./build/css/all.css
rm ./build/css/all.css
zip ./build/js/all.js.gz ./build/js/all.js
rm ./build/js/all.js
zip ./build/favicon.ico.gz ./build/favicon.ico
rm ./build/favicon.ico
zip ./build/language.xml.gz ./build/language.xml
rm ./build/language.xml

# get mkspiffs here and install into /etc on linux and OSX https://github.com/igrr/mkspiffs/releases
/etc/mkspiffs -c build -b 8192 -p 256 -s 3125248 ./Release/DuetWebControl.bin

echo "Done"

