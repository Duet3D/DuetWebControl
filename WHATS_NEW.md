Summary of important changes in recent versions
===============================================

Version 3.2.0-rc2
=================

Compatible versions:
- DuetSoftwareFramework 3.2.0-rc2
- RepRapFirmware 2 or newer (1.2x may work but untested)

Bug fixes:
- New code editor has been disabled on touch devices for now due to incompatibilities
- Extra sensors were labelled as heaters in the temperature chart
- Change callbacks in the tool input component didn't check changed values properly
- Simulation state wasn't recorded correctly in the job estimations panel
- When connected in SBC mode multiple concurrent reconnect attempts could be started
- Fixed G3 in the GCode Viewer

Version 3.2.0-rc1
=================

Compatible versions:
- DuetSoftwareFramework 3.2.0-rc1
- RepRapFirmware 2 or newer (1.2x may work but untested)

Changed behaviour:
- Added new dialog for up- and downloads of multiple files (similar to DWC1)
- When an expansion board firmware update is performed, DWC asks for controller reset once done
- Integrated new G-Code viewer plugin (thanks Sindarius)

Bug fixes:
- Print control buttons could show wrong captions during (paused) simulations
- Code input could keep previously selected suggestion even if it differs
- Sometimes code promises were not resolved in the correct order in standalone mode
- When M997/M999 were sent from code inputs, file upload errors for DWC files could be seen

Version 3.2.0-beta4
===================

Changed behaviour:
- Added new delay setting for SBC mode to reduce CPU usage on demand

Bug fixes:
- Job progress didn't show correct simulation status when the simulation was paused
- Pause/Resume button didn't show correct captions when the simulation was paused

Version 3.2.0-beta3
===================

Compatible files:
- DuetSoftwareFramework 3.2.0-b3 or newer
- RepRapFirmware 2 or newer (1.2x may work but untested)

Changed behaviour:
- Height Map plugin is loaded by default
- Last job duration is now displayed on the Job Status page
- Height Map plugin is automatically loaded if no settings could be loaded
- Changed default height map viewing angle

Bug fixes:
- Heightmap wasn't refreshed automatically
- Text editor wasn't automatically focused when editing a file

Version 3.2.0-beta2
===================

Compatible files:
- DuetSoftwareFramework 3.2.0-b2 or newer
- RepRapFirmware 2 or newer (1.2x may work but untested)

Changed behaviour:
- robots.txt is no longer part of the SD package
- Plugins may inject their own plugins into the App component
- Added new on-screen keyboard plugin (primarily for Raspberry Pi touchscreens)

Bug fixes:
- When loading the settings from local storage, no plugins were started
- When loading the heightmap, only an error message could be seen
- Added missing "Starting" item to the status type enumeration
- When creating a new macro the new editor was not activated
- Visualizer wasn't displaying live G-code files correctly
- Fixes for the new code editor
- Made plugin loading more robust

Version 3.2.0-beta1
===================

Compatible files:
- DuetSoftwareFramework 3.2.0 or newer
- RepRapFirmware 2 or newer (1.2x may work but untested)

Changed behaviour:
- Plugins may now be loaded. Refer to the `plugins` directory for further details
- The Height Map has been moved to a built-in plugin (see Settings -> General -> Plugins)
- Increased maximum editor size from 16MiB to 32MiB
- JSON outputs are automatically formatted in the Code Console
- Replaced `/sys/dwc2-` JSON files with `/sys/dwc-` (rename them manually to restore your DWC settings)
- Option to revert to DWC1 has been removed

Bug fixes:
- Fixed some incompatibilities to RRFv2
- Code input occasionally required enter to be pressed twice to send a code
- Base URL as defined by compile options was not respected in the connectors
- Depending on the configuration inputs for bed/chamber heaters were disabled
- Under special circumstances the "Reset heater fault" dialog could never time out

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

