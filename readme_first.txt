I propose here Aquilegia, a complete help system coupled with DWC (Duet Web Server), the interface of RepRap Firmware, to be installed on the Duet itself.
1/ presentation 
Files are installed on the SD card and the system propose a complete RepRap Firmware and Duet documentation, including a fast search tool and backlinks.
The documentation is a merge of the documentation of the RepRap Wiki and the Duet3D (DuetWiFi) wiki, with a few added pages which were never published. It is in principle up to date, but I may have missed a few stuff.
It also add an important resource, the RepRap wiki G-code page filtered for codes only applicables to Duet.

Menu collapse on small screens and large image autoresize on small screen, to have nice viewing on smartphones. 

When installed on your SD card (On Duet 0.8.5 and Duet 0.6), the help documentation recognise the board (while connected) and select the displayed documentation accordingly. 

It is accessible by clicking the added 'Help' button on the DWC navigation bar. 

2/ Demonstration
You will find the exact same application installed alone (without DWC) here: http://otocoup.com/aql.
This version do have a manual selector to choose the applicable board.
Note: You can deep link on a page, paragraph in a page or on a search word, so don't hesitate to make a link about a particular topic.
This web address will stay, but T3P3 may creates own space to serve resources.

3/ Availability
Yet this only available for wired Duets. On the Duet WiFi DWC is integrally installed in the WiFi module and the memory available is a bit short to serve all Aquilegia documentation images. Some modifications are needed to the firmware to have it serving resources from the SD card.

Documentation page access is relatively fast, but large image may take time to load from the SD card. It is recommended to replace the original SD card for a faster one (not only for the help system...).

When a permanent resource site will be installed, resources could be served from this site, so you can have documentation permanently up to date. 
Till that, you can use my site if you wish (set parameter aqlO.domain in file aql.js), I have sufficient bandwith. In addition to being up to date, it is faster than serving locally from SD card.  

4/ Interaction between Aquilegia and DWC
The interaction is minimal, just adding button, opening/closing some blocks and detecting the board. Just a few blocks are added to the HTML as the whole help page is dynamically created. 

5/ Known troubles or uncertainty
* This was never tested on Safari  
* Some display problems on Android browser.

6/ How to install it 
Files shall be installed in existing directories.
The simplest is to use FTP, but you can also write it directly on the SD card.
The zip file contains:
*/www/js/aql.js  the help server
*/www/css/aql.css the css of the help page
*/www/reprap.htm  a modified version of DWC adding the help html blocks and help call buttons
*/www/js/model.js a slightly modified version of DWC Javascript for board recognition and file update
*/www/js/viewmodel.js a slightly modified version of DWC Javascript for board recognition

A new directory contains all the resources of Aquilegia, text and images:
*/www/h/

7/ Update
text file (hlp.txt) will be updated through the web interface as other DWC files.
Yet, there is no mechanism to upload images from web interface.

8/How does it work and where does it came from 
This is a completely new application, designed and programmed from scratch.
You will find details here: http://aquilegia.blue 










