# DuetWebControl

Duet Web Control is a fully-responsive HTML5-based web interface for RepRapFirmware which utilizes the Bootstrap framework, JQuery and a few other libraries to allow easy control of Duet-based 3D printer electronics.

It is designed to communicate with RepRapFirmware using HTTP GET requests and to upload single files using an HTTP POST request. One goal of the core application is to keep things compact, so a good loading speed can be achieved even on slow networks. Another one is to communicate to the firmware using only AJAX calls, which either return JSON objects, plain texts or binary blobs.

Duet Web Control is free software; it is licensed under the terms of the GNU Public License v2.

## Supported electronics

At this time the following platforms are supported:

* Duet 0.6
* Duet 0.8.5
* Duet WiFi
* Duet Ethernet

## Communication to the firmware

Since RepRapFirmware can only process one HTTP request at a time (excluding rr_fileinfo and rr_upload on certain platforms), DuetWebControl should attempt to avoid parallel requests. In general, the communication between the web interface and RepRapFirmware looks like this:

- Establish a connection (via rr_connect)
- Send an extended status request (rr_status?type=2) and start status update loop
- Load macros (rr_filelist?dir=/macros)
- (User switches to "G-Code Files" tab)
- Stop automatic status updates
- Load G-code filelist (rr_filelist?dir=/gcodes)
- File info about each file is requested (unless cached values are available)
- Start automatic status requests again
- (User does something else)
- DWC disconnects (via rr_disconnect)

Note the interrupt of live updates while multiple long requests are processed. DWC implements two particular functions (stopUpdates and startUpdates) which can - and should - be used to stop status requests while long-running HTTP requests are being executed. The update loop is stopped when file uploads are started, too, however it is not required to interrupt the update loop while short requests (e.g. rr_gcode) are sent.

Some requests may send or expect date and time values. These values are represented by the format "YYYY-MM-DDTHH:MM:SS" similar to the ISO-8601 format.

## List of HTTP requests

All HTTP requests, except for rr_upload, are simple GET requests that return JSON objects, which makes it easy to deal with them using JavaScript code. Here the list of all currently used requests:

#### rr_connect?password=XXX&time=YYY
Create an initial connection between DWC and RRF.
- On success, the firmware sends out a response like: {"err":0,"sessionTimeout":[time in ms],"boardType":"[board type]"} This way DWC can adjust the AJAX timeout value and set board-specific options. The "time" value should represent the client's date and time to set the on-board RTC if necessary.
- If anything goes wrong, the firmware only responds with an {"err":[code]} object. If code is 1, then the specified password is wrong. If it is 2, then the firmware cannot allocate enough resources to accomodate another session.

#### rr_disconnect
Delete an existing HTTP session. This should be used to log off manually, however sessions are usually purged automatically if no communication takes place within the time specified in "sessionTimeout" above.

#### rr_status?type=XXX
Request a status response from the firmware which usually includes all the machine parameters that are expected to change from time to time. This makes it possible to display live values like XYZ position and heater temperatures. This type of request is usually sent to the firmware in rather short intervals (250ms by default). At this time there are three different supported status request types, which may be polled in different intervals:

- Type 1: Regular status request. The response for this is usually rather compact and only includes values that are expected to change quickly. The following types 2 and 3 include those values under any circumstances to keep the web interface up-to-date.
- Type 2: Extended status request. This type of request is polled right after a connection has been established. This response provides information about the tool mapping and values that can change.
- Type 3: Print status request. Unlike type 2, this type of request is always polled when a file print is in progress. It provides print time estimations and other print-related information which can be shown on the print status page.

#### rr_code?gcode=XXX
Send a G-code to the firmware. Since RepRapFirmware is generally only controlled by G-codes, this provides an interface to transmit codes from the web interface. This request returns the amount of currently available buffer space for incoming G-codes, however DWC does not actively use this response yet.

#### rr_upload?name=XXX&time=YYY
Upload a file to path XXX with the last modified date and time using an HTTP POST request. This is the only supported POST request in RepRapFirmware, however be aware that the POST request is no standard HTTP request. To make this work in the firmware, the payload (ie. file) has to be send in one chunk right after the HTTP header without any encapsulation. This mechanism is used to speed up transfers. Once complete, the firmware responds with {"err":[code]}. If everything goes well, the error code will be 0 and 1 on failure.

#### rr_download?name=XXX
Download a specified file from the SD card.

#### rr_delete?name=XXX
Delete a file from the SD card. The firmware responds again with `{"err":[code]}` and the error code will be 0 on success.

#### rr_filelist?dir=XXX
Request a file list from the directory XXX. Unlike rr_files, which was used in past web interface versions, this request returns a JSON object which encapsulates each file in the following format:

`{"type":[type],"name":"[name]","size":[size],"lastModified":"[datetime]"}`

Type can be either 'd' if it is a directory or 'f' if it is a regular file. The size is reported in bytes.

If an error occurs, the firmware will respond with `{"err":[code]}`. If the code is 1, the directory doesn't exist. If it is 2, the requested volume is not mounted.

#### rr_fileinfo?name=XXX
Parse G-code file information from file XXX or return file information about the file being printed if the key is omitted. RepRapFirmware implements a dedicate function to retrieve information from a G-code file (see also M36) which may be used on the G-code file list and on the print status page.

#### rr_move?old=XXX&new=YYY
Move a file on the SD card from XXX to YYY. Returns {"err":[code]} after completion where code will be 0 if the request was successful.

#### rr_mkdir?dir=XXX
Create a new directory. Returns {"err":[code]} with code being 0 if the directory could be created.

#### rr_config
Get the configuration response. Some printer information do not need to be requested for regular usage but to obtain machine properties and firmware versions this request can be used.

## Building Duet Web Control

The final file structure of a Duet Web Control package may differ from the structure in the "core" directory. For example, the Duet WiFi has a filename length limit of 32 characters, so the existing paths must be adjusted to meet this limitation. Apart from that, it may be required to compress the target files for webservers that cannot send source files in parallel. In addition, web files on the Duet are not stored in sub-directories, so the paths must be changed for this board as well.

For these purposes a build script has been introduced which can be run on Linux (and possibly OS X). To do so, open a terminal in the DWC root directory and run `./build.sh`. Refer to the build script header to see which other tools you will need.

Once the script has completed, you should get two files:

- DuetWebControl-$VERSION.bin (SPIFFS image for Duet WiFi)
- DuetWebControl-$VERSION.zip (ZIP package for first-generation Duets)

These packages can be uploaded via Duet Web Control to update the web interface. Due to the extra compression on the Duet WiFi, it is recommended to test new features on first-generation Duets first.

## Internationalization

Duet Web Control is capable of translating basically every text to a custom language. The translated entries are stored in an extra (and yet optional) XML file called "language.xml". Each language has its own section and if you want to add support for your own language, just follow the following tasks:

1. Copy the first section containing the German translations, i.e. the whole text between <de name="Deutsch"> and </de> and paste it before the last line of the file. It is explicitly recommended to use this section, because it will be up-to-date on every official release.
2. Change "de" to your own country code and replace "Deutsch" with your own language.
3. Replace the content of each "string" tag with your own translated text. Dynamic arguments may be specified in curly braces as in "Uploading File(s), {0}% Complete".

If your language is supported, but you are missing entries for your own language, you can easily extend the existing translations. The list of translations is sequential, so you can always compare your own language section with the "de" language section. To extend them, check the length of your own language section, copy the missing entries from the "de" tag to your own language section and update the missing translations. In case some texts are not covered by the German translations, you can always create your own `<string t="...">...</string>` tags, too.

When you are done and would like to contribute your changes, feel free to send a pull request on GitHub or send me your updated language.xml file via e-mail.
