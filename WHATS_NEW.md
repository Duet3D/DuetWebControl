Summary of important changes in recent versions
===============================================

Version 3.1.1
==============

Compatible files:
- DuetSoftwareFramework 2.0.0 or newer
- RepRapFirmware 2 or newer (1.2x may work but untested)

Bug fixes:
- Downloading filaments did not work
- When opening large files in DWC, a timeout exception could be thrown
- When connected in SBC mode, the kinematics key could be incorrectly updated
- Duplicate notifications were not closed again automatically
- Display messages from M117 were displayed multiple times

Version 3.1.0
==============

Compatible files:
- DuetSoftwareFramework 2.0.0 or newer
- RepRapFirmware 2 or newer (1.2x may work but untested)

Changed behaviour:
- When installing expansion board updates, DWC waits for the status to become not 'Updating' before moving on to the next one

Bug fixes:
- Mesh edit dialog sent wrong M-code when using delta kinematics
- Resetting the speed and extrusion factors worked even when the UI was frozen
- Datetime was not updated after a firmware reset
- When returning from a filament directory on the Filaments page, the "Create Filament" button was no longer visible

Version 2.1.7
==============

Compatible files:
- DuetSoftwareFramework 2.0.0 or newer
- RepRapFirmware 2 or newer (1.2x may work but untested)

Changed behaviour:
- Codes that only consist of comments no longer wait for a response

Bug fixes:
- Message box axis controls are shown again for unhomed axes
- HTTP code 503 was not properly handled

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
- The file path in the edit dialog could be wrong after returning from a deeper directory

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

