I propose Aquilegia, a complete help system coupled with DWC (Duet Web Server), the interface of RepRap Firmware, to be installed on the Duet itself.

1/ presentation 
On Wired Duets, the help system files are installed on the SD card and the system propose a complete RepRap Firmware and Duets documentation, including a fast search tool and backlinks.
The documentation is a merge of the documentation of the RepRap Wiki and the Duet3D (DuetWiFi) wiki, with a few added pages which were never published. I also reworked electrical schematics. This documentation is in principle up to date, but I may have missed a few stuff.
It also add an important resource, the RepRap wiki G-code page filtered for codes only applicables to Duet.

Menu collapse on small screens and large images autoresize on small screen, to have nice viewing on smartphones. 

When installed on your SD card (On Duet 0.8.5 and Duet 0.6), the help documentation recognise the board (while connected) and select the displayed documentation accordingly. 

It is accessible by clicking the added 'Help' button on the DWC navigation bar. 

2/ Demonstration
You will find the exact same application installed alone (without DWC) here: http://otocoup.com/aql 
This independant version do have a manual selector to choose the applicable board.
Note: You can deep link on a page, paragraph in a page or on a search word, so don't hesitate to make a link about a particular topic.
This web address will stay, but T3P3 may creates own space to serve resources.

3/ Availability
Yet this only available for wired Duets. On the Duet WiFi DWC is integrally installed in the WiFi module and the memory available is a bit short to serve all Aquilegia documentation images. Modifications are needed to the firmware to have it serving resources from the SD card. We are working on that.

Documentation page access is relatively fast, but large images may take time to load from the SD card. It is recommended to replace the original SD card for a faster one (not only for the help system...).

When a permanent resource site will be installed, resources could be served from this site, so you can have documentation permanently up to date. 
Till that, you can use my site if you wish (set parameter aqlO.domain in file aql.js), I have sufficient bandwith. In addition to being up to date, it is faster than serving locally from SD card.  

4/ Interaction between Aquilegia and DWC
The interaction is minimal, just adding help opening button, opening/closing some blocks and detecting the board. Just a few blocks are added to the HTML as the whole help page is dynamically created. There is some modifications to upload updates files through web interface.

5/ Known troubles or uncertainty
* This was never tested on Safari  
* Some display problems on Android browser.

6/ How to install it 
The zip file you can find here  http://otocoup.com/aql/aquilegia_dwc.zip contains:
Files shall be installed in existing directories.

*/www/js/aql.js  the help server
*/www/css/aql.css the css of the help page
*/www/reprap.htm  a modified version of DWC adding the help html blocks and help call buttons
*/www/js/model.js a slightly modified version of DWC Javascript for board recognition and file update
*/www/js/viewmodel.js a slightly modified version of DWC Javascript for board recognition

A new directory contains all the resources of Aquilegia, text and images:
*/www/h/

Please note that while in theory this can be installed via FTP, there is a serious bug which make the file listing in FTP uncomplete (it stops at 56th file on images directory). A direct examination of the SD card have shown that, while not listed, all files were properly transferred, but you are in the blind. So I recommend to do direct transfer on the SD card. In any case, any transfer by FTP shall be followed by a board reset (M999) as FTP transfer seems to create troubles in firmware operation.

You can find the DWC fork here  https://github.com/PRouzeau/DuetWebControl1, but there is no need to reinstall the whole DWC. 

7/ Update
All files, notably text file (hlp.txt) and image files (with special file extensions) will be updated through the web interface as other DWC files.

8/How does it work and where does it came from 
This is a completely new application, designed on purpose and programmed from scratch.
You will find details and some history here: http://aquilegia.blue 










