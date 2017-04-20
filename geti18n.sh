#!/bin/bash

# This script is supposed to generate a list of new XML translation strings for "language.xml"
git diff HEAD | grep "^\+" | grep -Po "T\(['\"]([^\"]*)['\"]" | cut -d '"' -f 2 | sed -e 's/</\&lt;/g' | sed -e 's/>/\&gt;/g' | sort | uniq | while read translation
do
	if [[ -z $(grep "\"$translation\"" ./core/language.xml) ]]
	then
		echo "<string t=\"$translation\"></string>"
	fi
done

