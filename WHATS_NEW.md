Summary of important changes in recent versions
===============================================

Version 2.1.6
==============
Compatible files:
- DuetSoftwareFramework 2.0.0 or newer
- RepRapFirmware 2 or newer (1.2x may work but untested)

Changed behaviour:
- Message box axis controls are only shown if the requested axes are visible and homed

Bug fixes:
- Filament assignment was not updated when using RRFv2 or older
- IAP files could not be uploaded
- Upload of update ZIPs was not working

Version 2.1.5
==============
Compatible files:
- DuetSoftwareFramework 2.0.0 or newer
- RepRapFirmware 2 or newer (1.2x may work but untested)

Bug fixes:
- Mesh edit dialog area showed the wrong inputs for delta kinematics
- Menu item to disable mesh compensation was always disabled

Version 2.1.4
==============
Compatible files:
- DuetSoftwareFramework 2.0.0 or newer
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

