Summary of important changes in recent versions
===============================================

Version 2.1.4
==============
Compatible files:
- DuetSoftwareFramework 2.1.0
- RepRapFirmware 2 or newer (1.2x may work but untested)

Changed behaviour:
- Added new object model fields from RepRapFirmware

Bug fixes:
- Wrong fans were displayed when connected to RRF 2.x or older
- Layers were not properly restored when DWC reconnected to a SBC
- Job progress during a simulation used the filament usage instead of fle progress
- Reset button was shown after an emergency stop even if DWC was not connected
- Zoom is now disabled on mobile devices
- Job file list was stuck in loading state when multiple files were uploaded
- Webcam icon was no longer shown
- Title of the webcam image referenced a wrong translation

Version 2.1.3
==============
Compatible files:
- DuetSoftwareFramework 2.0.0
- RepRapFirmware 3.01-RC7 to 3.01-RC8 (others may or may not work - untested)

Changed behaviour:
- Button asking for printer reset is shown after 4s when the printer enters the Halted state

Bug fixes:
- Print stats were not always updated as intended (Duets in standalone mode)

