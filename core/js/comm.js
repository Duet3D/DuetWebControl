/* Communication routines between RepRapFirmware and Duet Web Control
 * 
 * written by Christian Hammacher (c) 2016
 * 
 * licensed under the terms of the GPL v2
 * see http://www.gnu.org/licenses/gpl-2.0.html
 */


var ajaxPrefix = "";					// Host to use for AJAX requests + "?" char or empty if running on a webserver
var sessionPassword = "reprap";			// Password used when establishing a new connection
var sessionTimeout = 8000;				// Time in ms before RepRapFirmware kills our session
var boardType;							// Which electronics board is this?

var isConnected = false;				// Are we connected?
var justConnected = false;				// Have we just connected?

var reconnectingAfterHalt = false;		// Have we just reconnected after a firmware halt?
var resetConfirmationShown = false;		// Have we shown a prompt to send a reset code yet?

var updateTaskLive = false;				// Are status responses being polled?
var stopUpdating = false;				// This will be true if status updates should be no longer polled
var extendedStatusCounter = 0;			// Counts the number of regular status updates so extended ones are polled from time to time
var lastStatusResponse;					// Contains the last available status response (rr_status)

var configResponse;						// Contains the last rr_config response (if any)
var configFile;							// This is a cached copy of the machine's config.g file

var ajaxRequests = [];					// List of all outstanding AJAX requests
var lastSentGCode;						// The last sent G-code


/* AJAX Events */

$(document).ajaxSend(function(event, jqxhr, settings) {
	ajaxRequests.push(jqxhr);
});

$(document).ajaxComplete(function(event, jqxhr, settings) {
	ajaxRequests = $.grep(ajaxRequests, function(item) { item != jqxhr; });
});

$(document).ajaxError(function(event, jqxhr, xhrsettings, thrownError) {
	if (thrownError == "abort") {
		// Ignore this error if this request was cancelled intentionally
		return;
	}

	if (isConnected) {
		// Resend this request if it timed out. This may be necessary for DuetWiFi
		// Also check for empty responses, although not every browser reports an
		// error in this case. However if we get one, treat it as a timeout.
		var response = jqxhr.responseText || jqxhr.responseJSON;
		if (thrownError == "timeout" || (thrownError == "" && response == undefined)) {
			if (!xhrsettings.hasOwnProperty('retryCount')) {
				xhrsettings.retryCount = 1;
			} else {
				xhrsettings.retryCount++;
			}

			if (xhrsettings.retryCount <= settings.maxRetries) {
				$.ajax(xhrsettings);
				return;
			}
		}

		// Disconenct and report an error if we exceeded the maximum number of retries
		var msg = T("An AJAX error has been reported, so the current session has been terminated.<br/><br/>Please check if your printer is still on and try to connect again.");
		if (thrownError != undefined && thrownError != "") {
			msg += "<br/><br/>" + T("Error reason: {0}", T(thrownError.toString()));
		}
		showMessage("danger", T("Communication Error"), msg, 0);

		disconnect(false);

		// Try to log the faulty response to console
		if (response != undefined) {
			console.log("Error! The following JSON response could not be parsed:");
			console.log(response);
		}
	}
});


/* Connect / Disconnect */

$("body").on("click", ".btn-connect", function() {
	if (!isConnected) {
		// Attempt to connect with the last-known password first
		connect(sessionPassword, true);
	} else {
		disconnect(true);
	}
});

function connect(password, regularConnect) {
	if (regularConnect) {
		// Close all notifications before we connect...
		$.notifyClose();

		// If we are running on localhost, ask for a destination
		if (document.location.host == "" && ajaxPrefix == "") {
			showHostPrompt();
			return;
		}
	}

	$(".btn-connect").removeClass("btn-info").addClass("btn-warning disabled").find("span:not(.glyphicon)").text(T("Connecting..."));
	$(".btn-connect span.glyphicon").removeClass("glyphicon-log-in").addClass("glyphicon-transfer");
	$.ajax(ajaxPrefix + "rr_connect?password=" + password + "&time=" + encodeURIComponent(timeToStr(new Date())), {
		dataType: "json",
		error: function() {
			showMessage("danger", T("Error"), T("Could not establish a connection to the Duet firmware! Please check your settings and try again.") + "<div class=\"visible-xs visible-sm\"><br/><center><button id=\"btn_quick_connect\" class=\"btn btn-info btn-connect\"><span class=\"glyphicon glyphicon-log-in\"></span> Connect</button></center>", 0);

			$(".btn-connect").removeClass("btn-warning disabled").addClass("btn-info").find("span:not(.glyphicon)").text(T("Connect"));
			$(".btn-connect span.glyphicon").removeClass("glyphicon-transfer").addClass("glyphicon-log-in");

			disconnect(false);
		},
		success: function(response) {
			if (response.err == 2) {		// Looks like the firmware ran out of HTTP sessions
				showMessage("danger", T("Error"), T("Could not connect to Duet, because there are no more HTTP sessions available."), 0);
				$(".btn-connect").removeClass("btn-warning disabled").addClass("btn-info").find("span:not(.glyphicon)").text(T("Connect"));
				$(".btn-connect span.glyphicon").removeClass("glyphicon-transfer").addClass("glyphicon-log-in");
			}
			else if (regularConnect)
			{
				if (response.err == 0) {	// No password authentication required
					sessionPassword = password;
					postConnect(response);
				} else {					// We can connect, but we need a password first
					showPasswordPrompt();
				}
			}
			else {
				if (response.err == 0) {	// Connect successful
					sessionPassword = password;
					postConnect(response);
				} else {
					showMessage("danger", T("Error"), T("Invalid password!"), 0);
					$(".btn-connect").removeClass("btn-warning disabled").addClass("btn-info").find("span:not(.glyphicon)").text(T("Connect"));
					$(".btn-connect span.glyphicon").removeClass("glyphicon-transfer").addClass("glyphicon-log-in");
				}
			}
		}
	});
}

function postConnect(response) {
	if (response.hasOwnProperty("sessionTimeout")) {
		sessionTimeout = response.sessionTimeout;
		$.ajaxSetup({ timeout: sessionTimeout / (settings.maxRetries + 1) });
	}
	if (response.hasOwnProperty("boardType")) {
		setBoardType(response.boardType);
	}

	log("success", "<strong>" + T("Connection established!") + "</strong>");

	isConnected = justConnected = true;
	extendedStatusCounter = settings.extendedStatusInterval; // ask for extended status response on first poll

	startUpdates();
	if (currentPage == "settings") {
		getConfigResponse();
	}

	$(".btn-connect").removeClass("btn-warning disabled").addClass("btn-success").find("span:not(.glyphicon)").text(T("Disconnect"));
	$(".btn-connect span.glyphicon").removeClass("glyphicon-transfer").addClass("glyphicon-log-out");

	enableControls();
	validateAddTool();
}

function disconnect(sendDisconnect) {
	if (isConnected) {
		log("danger", "<strong>" + T("Disconnected.") + "</strong>");
	}
	isConnected = false;
	ajaxPrefix = "";

	$(".btn-connect").removeClass("btn-success").addClass("btn-info").find("span:not(.glyphicon)").text(T("Connect"));
	$(".btn-connect span.glyphicon").removeClass("glyphicon-log-out").addClass("glyphicon-log-in");

	if (sendDisconnect) {
		$.ajax(ajaxPrefix + "rr_disconnect", { dataType: "json", global: false });
	}

	ajaxRequests.forEach(function(request) {
		request.abort();
	});
	ajaxRequests = [];
	updateTaskLive = false;

	resetGuiData();
	resetGui();
	updateGui();

	disableControls();
	validateAddTool();
	setToolMapping(undefined);
}


/* Status updates */

function startUpdates() {
	stopUpdating = false;
	if (!updateTaskLive) {
		retryCount = 0;
		updateStatus();
	}
}

function stopUpdates() {
	stopUpdating = updateTaskLive;
}

function updateStatus() {
	if (stopUpdating) {
		updateTaskLive = false;
		return;
	}
	updateTaskLive = true;

	var machinePropsVisible = (currentPage == "settings") && $("#page_machine").hasClass("active");
	var ajaxRequest = "rr_status";
	if (extendedStatusCounter >= settings.extendedStatusInterval || machinePropsVisible && (!isPrinting || extendedStatusCounter > 1)) {
		extendedStatusCounter = 0;
		ajaxRequest += "?type=2";
	} else if (isPrinting) {
		ajaxRequest += "?type=3";
	} else {
		ajaxRequest += "?type=1";
	}
	extendedStatusCounter++;

	$.ajax(ajaxPrefix + ajaxRequest, {
		dataType: "json",
		success: function(status) {
			// Don't process this one if we're no longer connected
			if (!isConnected) {
				return;
			}
			var needGuiUpdate = false;

			/*** Extended status response ***/

			// Cold Extrusion + Retraction Temperatures
			if (status.hasOwnProperty("coldExtrudeTemp")) {
				coldExtrudeTemp = status.coldExtrudeTemp;
			}
			if (status.hasOwnProperty("coldRetractTemp")) {
				coldRetractTemp = status.coldRetractTemp;
			}

			// Temperature limit
			if (status.hasOwnProperty("tempLimit")) {
				tempLimit = status.tempLimit;
			}

			// Endstops
			if (status.hasOwnProperty("endstops")) {
				for(var i = 0; i <= maxDrives; i++) {
					var displayText;
					if ((status.endstops & (1 << i)) != 0) {
						displayText = T("Yes");
					} else {
						displayText = T("No");
					}

					$("#tr_drive_" + i + " > td:nth-child(2)").text(displayText);
				}
			}

			// Printer Geometry
			if (status.hasOwnProperty("geometry")) {
				setGeometry(status.geometry);
			}

			// Number of axes
			if (status.hasOwnProperty("axes") && numAxes != status.axes)
			{
				numAxes = status.axes;
				needGuiUpdate = true;
			}

			// Number of volumes
			if (status.hasOwnProperty("volumes")) {
				setVolumes(status.volumes);
			}

			// Bitmap of mounted volumes
			if (status.hasOwnProperty("mountedVolumes")) {
				setMountedVolumes(status.mountedVolumes);
			}

			// Probe Parameters (maybe hide probe info for type 0 someday?)
			if (status.hasOwnProperty("probe")) {
				probeTriggerValue = status.probe.threshold;
				probeSlowDownValue = probeTriggerValue * 0.9;	// see Platform::Stopped in dc42/ch firmware forks

				var probeType;
				switch (status.probe.type) {
					case 0:
						probeType = T("Switch (0)");
						break;
					case 1:
						probeType = T("Unmodulated (1)");
						break;
					case 2:
						probeType = T("Modulated (2)");
						break;
					case 3:
						probeType = T("Alternative (3)");
						break;
					case 4:
						probeType = T("Two Switches (4)");
						break;
					default:
						probeType = T("Unknown ({0})", status.probe.type);
						break;
				}
				$("#dd_probe_type").text(probeType);
				$("#dd_probe_height").text(T("{0} mm", status.probe.height));
				$("#dd_probe_value").text(probeTriggerValue);
			}

			// Tool Mapping
			if (status.hasOwnProperty("tools")) {
				setToolMapping(status.tools);
			}

			// CPU temperature
			if (status.hasOwnProperty("mcutemp")) {
				$(".cpu-temp").removeClass("hidden");
				$("#td_cputemp").html(T("{0} °C", status.mcutemp.cur.toFixed(1)));
				$("#td_cputemp").prop("title", T("Minimum: {0} °C Maximum: {1} °C", status.mcutemp.min.toFixed(1), status.mcutemp.max.toFixed(1)));
			}

			/*** Default status response ***/

			// Status
			var printing = false, paused = false;
			switch (status.status) {
				case 'F':	// Flashing new firmware
					setStatusLabel("Updating", "success");
					break;

				case 'H':	// Halted
					setStatusLabel("Halted", "danger");
					break;

				case 'D':	// Pausing / Decelerating
					setStatusLabel("Pausing", "warning");
					printing = true;
					paused = true;
					break;

				case 'S':	// Paused / Stopped
					setStatusLabel("Paused", "info");
					printing = true;
					paused = true;
					break;

				case 'R':	// Resuming
					setStatusLabel("Resuming", "warning");
					printing = true;
					paused = true;
					break;

				case 'P':	// Printing
					setStatusLabel("Printing", "success");
					printing = true;
					break;

				case 'B':	// Busy
					setStatusLabel("Busy", "warning");
					break;

				case 'T':	// Changing tool
					printing = isPrinting;
					setStatusLabel("Changing Tool", "primary");
					break;

				case 'I':	// Idle
					setStatusLabel("Idle", "default");
					break;
			}
			
      if (printing) {
          if (justConnected) {
              if (status.hasOwnProperty("name")) {
                  setTitle(status.name);
              }
          }
      } else {
          if (status.hasOwnProperty("name")) {
              setTitle(status.name);
          }
          faviconProgress('reset');
      }
			
			setPrintStatus(printing);
			setPauseStatus(paused);

			// Update file lists of the visible page after the first status response
			if (justConnected) {
				if (currentPage == "files") {
					updateGCodeFiles();
				} else if (currentPage == "control" || currentPage == "macros") {
					updateMacroFiles();
				} else if (currentPage == "settings" && $("#page_sysedit").is(".active")) {
					updateSysFiles();
				}

				justConnected = false;
			}

			// Set homed axes
			setAxesHomed(status.coords.axesHomed);

			// Update extruder drives
			if (status.coords.extr.length != numExtruderDrives) {
				numExtruderDrives = status.coords.extr.length;
				needGuiUpdate = true;
			}
			for(var i = 1; i <= numExtruderDrives; i++) {
				$("#td_extr_" + i).html(status.coords.extr[i - 1].toFixed(1));
			}
			if (numExtruderDrives > 0) {
				$("#td_extr_total").html(status.coords.extr.reduce(function(a, b) { return a + b; }));
			} else {
				$("#td_extr_total").html(T("n/a"));
			}

			// XYZ coordinates
			if (geometry == "delta" && !status.coords.axesHomed[0]) {
				$("#td_x, #td_y, #td_z").html(T("n/a"));
			} else {
				$("#td_x").text(status.coords.xyz[0].toFixed(1));
				$("#td_y").text(status.coords.xyz[1].toFixed(1));
				$("#td_z").text(status.coords.xyz[2].toFixed(2));
			}

			// UVW coordinates
			if (numAxes > 3) {
				$("#td_u").text(numAxes > 3 ? status.coords.xyz[3].toFixed(1) : "n/a");
				$("#td_v").text(numAxes > 4 ? status.coords.xyz[4].toFixed(1) : "n/a");
				$("#td_w").text(numAxes > 5 ? status.coords.xyz[5].toFixed(1) : "n/a");
			}

			// Current Tool
			if (lastStatusResponse == undefined || lastStatusResponse.currentTool != status.currentTool) {
				setCurrentTool(status.currentTool);
			}

			// Manage Tool selection on Settings -> Tools page
			if (lastStatusResponse != undefined && lastStatusResponse.currentTool != status.currentTool) {
				var btn = $("div.panel-body[data-tool='" + lastStatusResponse.currentTool + "'] > button.btn-select-tool");
				btn.attr("title", T("Select this tool"));
				btn.find("span:last-child").text(T("Select"));
				btn.find("span.glyphicon").removeClass("glyphicon-remove").addClass("glyphicon-pencil");

				btn = $("div.panel-body[data-tool='" + status.currentTool + "'] > button.btn-select-tool");
				btn.attr("title", T("Select this tool"));
				btn.find("span.glyphicon").removeClass("glyphicon-remove").addClass("glyphicon-pencil");
				btn.find("span:last-child").text(T("Deselect"));
			}

			// Output
			if (status.hasOwnProperty("output")) {
				if (status.output.hasOwnProperty("beepDuration") && status.output.hasOwnProperty("beepFrequency")) {
					beep(status.output.beepFrequency, status.output.beepDuration);
				}
				if (status.output.hasOwnProperty("message")) {
					showMessage("info", T("Message from Duet firmware"), status.output.message, settings.autoCloseUserMessages ? settings.notificationTimeout : 0);
				}
			}

			// ATX Power
			setATXPower(status.params.atxPower);

			// Fan Control
			if (!fanSliderActive) {
				var selectedFan = getFanSelection();
				var fanValues = (status.params.fanPercent.constructor === Array) ? status.params.fanPercent : [status.params.fanPercent];
				for(var i = 0; i < Math.min(maxFans, fanValues.length); i++) {
					// Check if the prior fan value must be enforced
					var fanValue = fanValues[i] / 100.0;
					if (overriddenFanValues[i] != undefined && overriddenFanValues[i] != fanValue) {
						fanValue = overriddenFanValues[i];
						sendGCode("M106 P" + i + " S" + fanValue);
					}

					// Update slider values
					if (i == selectedFan) {
						$(".fan-slider").children("input").slider("setValue", fanValue * 100.0);
					}
				}

				if (numFans != fanValues.length) {
					numFans = fanValues.length;

					var fanVisible = [settings.showFan1, settings.showFan2, settings.showFan3];
					for(var i = 0; i < maxFans; i++) {
						setFanVisibility(i, fanVisible[i] && i < numFans);
					}
				}
			}

			// Speed Factor
			if (!speedSliderActive && (lastStatusResponse == undefined || $("#slider_speed").slider("getValue") != status.params.speedFactor)) {
				$("#slider_speed").slider("setValue", status.params.speedFactor);
			}
			if (!extrSliderActive) {
				for(var i = 0; i < status.params.extrFactors.length; i++) {
					var extrSlider = $("#slider_extr_" + (i + 1));
					if (lastStatusResponse == undefined || extrSlider.slider("getValue") != status.params.extrFactors) {
						extrSlider.slider("setValue", status.params.extrFactors[i]);
					}
				}
			}

			// Babystepping
			if (status.params.hasOwnProperty("babystep")) {
				$(".babystepping button").toggleClass("disabled", settings.babysteppingZ <= 0);
				$("#span_babystepping").text(T("{0} mm", status.params.babystep));
			} else {
				// Don't enable babystepping controls if the firmware doesn't support it
				$(".babystepping button").addClass("disabled");
			}

			// Fetch the last G-Code response from the server if there is anything new and we're not flashing new firmware
			if (lastStatusResponse == undefined || (status.status != 'F' && lastStatusResponse.seq != status.seq)) {
				$.ajax(ajaxPrefix + "rr_reply", {
					dataType: "html",
					success: function(response) {
						response = response.trim();

						// Deal with firmware responses that can be parsed
						if (!isPrinting && response != "") {
							// Is this a bed compensation report?
							if (response.indexOf("Bed equation fits points ") == 0) {
								var points = response.substr("Bed equation fits points ".length);
								points = JSON.parse("[" + points.split("] [").join("],[") + "]");
								showBedCompensation(points);
							}

							// Has grid-based probing finished?
							if (response.indexOf(" points probed, mean error ") != -1) {
								getHeightmap();
							}

							// If an error is reported and we're trying to mount a volume, don't wait for it any longer
							if (mountRequested && (response.indexOf("Cannot initialise") != -1 || response.indexOf("Can't mount") != -1)) {
								mountRequested = false;
								changeGCodeVolume(currentGCodeVolume);
							}
						}
						if (lastSentGCode == "M561") {
							// We should not isplay the probe points if they are no longer valid
							clearBedPoints();
						}

						// Is this a response that should be logged?
						if ((response != "") || (lastSentGCode != "" && (settings.logSuccess || currentPage == "console"))) {
							// What kind of reply are we dealing with?
							var style = "success", content = response;
							if (response.match("^Warning: ") != null) {
								style = "warning";
								content = content.replace(/Warning:/g, "<strong>Warning:</strong>");
							} else if (response.match("^Error: ") != null) {
								style = "danger";
								content = content.replace(/Error:/g, "<strong>Error:</strong>");
							} else if (response != "") {
								style = "info";
							}

							// Prepare line breaks for HTML
							lastSentGCode = lastSentGCode.trim().replace(/\n/g, "<br/>");
							content = content.replace(/\n/g, "<br/>");

							// Log this message in the G-Code console
							var prefix = (lastSentGCode != "") ? "<strong>" + lastSentGCode + "</strong><br/>" : "";
							log(style, prefix + content);

							// If the console isn't visible, show a notification too
							if (currentPage != "console") {
								if (response == "" && lastSentGCode != "") {
									showMessage(style, "", "<strong>" + lastSentGCode + "</strong>");
								} else {
									showMessage(style, lastSentGCode, content);
								}
							}

							// Close the scanner modal dialog if an error occurred
							if (style == "danger")
							{
								$("#modal_scanner").modal("hide");
							}
						}

						// Reset info about the last sent G-Code again
						lastSentGCode = "";
					}
				});
			}

			// Sensors
			setProbeValue(status.sensors.probeValue, status.sensors.probeSecondary);
			$("#td_fanrpm").html(status.sensors.fanRPM);

			// Heated bed
			var bedTemp = undefined;
			if (status.temps.hasOwnProperty("bed")) {
				if (!heatedBed) {
					heatedBed = 1;
					needGuiUpdate = true;
				}

				bedTemp = status.temps.bed.current;
				setCurrentTemperature("bed", status.temps.bed.current);
				setTemperatureInput("bed", status.temps.bed.active, 1);
				setHeaterState("bed", status.temps.bed.state, status.currentTool);
			} else if (heatedBed) {
				heatedBed = 0;
				needGuiUpdate = true;
			}

			// Chamber
			var chamberTemp = undefined;
			if (status.temps.hasOwnProperty("chamber")) {
				if (!chamber)
				{
					chamber = 1;
					needGuiUpdate = true;
				}

				chamberTemp = status.temps.chamber.current;
				setCurrentTemperature("chamber", chamberTemp);
				setTemperatureInput("chamber", status.temps.chamber.active, 1);
				setHeaterState("chamber", status.temps.chamber.state, status.currentTool);
			} else if (chamber) {
				chamber = 0;
				needGuiUpdate = true;
			}

			// Heads
			if (status.temps.heads.current.length != numHeads) {
				numHeads = status.temps.heads.current.length;
				needGuiUpdate = true;
			}
			for(var i = 0; i < status.temps.heads.current.length; i++) {
				setCurrentTemperature(i + 1, status.temps.heads.current[i]);
				setTemperatureInput(i + 1, status.temps.heads.active[i], 1);
				setTemperatureInput(i + 1, status.temps.heads.standby[i], 0);
				setHeaterState(i + 1, status.temps.heads.state[i], status.currentTool);
			}
			recordHeaterTemperatures(bedTemp, chamberTemp, status.temps.heads.current);

			// Scanner extension
			if (status.hasOwnProperty("scanner")) {
				// Toggle visibility of scanner controls
				if (lastStatusResponse == undefined || !lastStatusResponse.hasOwnProperty("scanner")) {
					$(".scan-control").removeClass("hidden");
					$("#main_content").resize();
				}

				// Enable "Start Scan" button only if the scanner is ready
				$("#btn_start_scan").toggleClass("disabled", status.scanner.status != "I");

				// Update scan dialog
				updateScannerDialog(status.scanner);

				// Reload scans as soon as a 3D scan is finished
				if (lastStatusResponse != undefined && status.scanner.status == "I" &&
					(lastStatusResponse.scanner.status == "S" || lastStatusResponse.scanner.status == "U")) {
					$("#modal_scanner .modal-title").text(T("Scan complete"));
					$("#p_scan_info").text(T("Your 3D scan is now complete! You may download it from the file list next."));

					updateScanFiles();
				}
			} else if (currentPage == "scanner") {
				showPage("control");
				$(".scan-control").addClass("hidden");
			}

			/*** Print status response ***/

			if (status.hasOwnProperty("fractionPrinted") && fileInfo != undefined) {
				var printJustFinished = false;
				if (!printHasFinished) {
					var progress = 100, progressText = [];

					// Get the current layer progress text
					if (fileInfo.height > 0 && fileInfo.layerHeight > 0) {
						var numLayers;
						if (status.firstLayerHeight > 0) {
							numLayers = ((fileInfo.height - status.firstLayerHeight) / fileInfo.layerHeight) + 1;
						} else {
							numLayers = (fileInfo.height / fileInfo.layerHeight);
						}
						numLayers = numLayers.toFixed();
						progressText.push(T("Layer: {0} of {1}", status.currentLayer, numLayers));
					}

					// Try to calculate the progress by checking the filament usage
					if (fileInfo.filament.length > 0) {
						var totalFileFilament = (fileInfo.filament.reduce(function(a, b) { return a + b; })).toFixed(1);
						var totalRawFilament = (status.extrRaw.reduce(function(a, b) { return a + b; })).toFixed(1);
						progress = ((totalRawFilament / totalFileFilament) * 100.0).toFixed(1);

						var remainingFilament = (totalFileFilament - totalRawFilament);
						if (progress < 0) {
							progress = 0;
						} else if (progress > 100) {
							progress = 100;
							totalRawFilament = totalFileFilament;
							remainingFilament = 0;
							printJustFinished = printHasFinished = true;
						}
						progressText.push(T("Filament Usage: {0}mm of {1}mm", totalRawFilament, totalFileFilament));

						// TODO: Make this optional
						progressText[progressText.length - 1] += " " + T("({0}mm remaining)", remainingFilament.toFixed(1));

					}
					// Otherwise by comparing the current Z position to the total height
					else if (fileInfo.height > 0) {
						progress = ((status.coords.xyz[2] / fileInfo.height) * 100.0).toFixed(1);
						if (progress < 0) {
							progress = 0;
						} else if (progress > 100) {
							progress = 100;
							printJustFinished = printHasFinished = true;
						}
					}
					// Use the file-based progress as a fallback option
					else {
						progress = status.fractionPrinted;
						if (progress < 0) {
							progress = 100;
							printJustFinished = printHasFinished = true;
						}
					}
					setProgress(progress, T("Printing {0}, {1}% Complete", fileInfo.fileName, progress), 
							(progressText.length > 0) ? progressText.reduce(function(a, b) { return a + ", " + b; }) : "");
				}

				// Print Chart
				if (status.currentLayer > 1) {
					var realPrintTime = (status.printDuration - status.warmUpDuration - status.firstLayerDuration);
					if (layerData.length == 0) {
						if (status.currentLayer > 2) {						// add avg values on reconnect
							addLayerData(status.firstLayerDuration, false);
							realPrintTime -= status.currentLayerTime;
							for(var layer=2; layer<status.currentLayer; layer++) {
								addLayerData(realPrintTime / (status.currentLayer - 1), false);
							}
							drawPrintChart();
						} else {											// else only the first layer is complete
							addLayerData(status.firstLayerDuration, true);
						}

						if (status.currentLayer == 2) {
							lastLayerPrintDuration = 0;
						} else {
							lastLayerPrintDuration = realPrintTime;
						}
					} else if (printJustFinished || status.currentLayer - 1 > layerData.length) {
						addLayerData(realPrintTime - lastLayerPrintDuration, true);
						lastLayerPrintDuration = realPrintTime;
					}
				}

				// Warm-Up Time
				if (status.warmUpDuration > 0) {
					if (status.warmUpDuration < 0.5) {
						$("#td_warmup_time").html(T("none"));
					} else {
						$("#td_warmup_time").html(formatTime(status.warmUpDuration));
					}
				} else if (!printHasFinished) {
					$("#td_warmup_time").html(T("n/a"));
				}

				// Current Layer Time
				if (!printHasFinished) {
					if (status.currentLayerTime > 0 || status.currentLayer > 1) {
						currentLayerTime = status.currentLayerTime;
						$("#td_layertime").html(formatTime(status.currentLayerTime));
					} else if (status.firstLayerDuration > 0) {
						currentLayerTime = status.firstLayerDuration;
						$("#td_layertime").html(formatTime(status.firstLayerDuration));
					} else {
						$("#td_layertime").html(T("n/a"));
					}
				} else {
					$("#td_layertime").html(T("n/a"));
				}

				// Print Duration
				if (status.printDuration > 0) {
					$("#td_print_duration").html(formatTime(status.printDuration));
				} else if (!printHasFinished) {
					$("#td_print_duration").html(T("n/a"));
				}

				// First Layer Height (maybe we need to update the layer height info)
				if (status.firstLayerHeight > 0 && $("#dd_layer_height").html().indexOf("/") == -1)
				{
					$("#dd_layer_height").html(T("{0} mm", status.firstLayerHeight) + " / " + $("#dd_layer_height").html());
				}

				// Print Estimations
				if (printHasFinished) {
					["filament", "layer", "file"].forEach(function(id) {
						if ($("#tl_" + id).html() != T("n/a")) {
							$("#tl_" + id).html("00s");
							$("#et_" + id).html((new Date()).toLocaleTimeString());
						}
					});
				} else {
					if (fileInfo.filament.length > 0) {
						setTimeLeft("filament", status.timesLeft.filament);
					} else {
						setTimeLeft("filament", undefined);
					}
					setTimeLeft("file", status.timesLeft.file);
					if (fileInfo.height > 0) {
						setTimeLeft("layer", status.timesLeft.layer);
					} else {
						setTimeLeft("layer", undefined);
					}
				}
			}

			// Update the GUI when we have processed the whole status response
			if (needGuiUpdate) {
				updateGui();
			}
			drawTemperatureChart();

			// Set timer for next status update
			if (status.status == 'F') {
				isConnected = updateTaskLive = false;

				// Ideally each update path should have its own status char, OTOH this should be sufficient for the moment
				if (uploadDWCFile != undefined && uploadDWSFile == undefined && uploadFirmwareFile == undefined) {
					log("info", "<strong>" + T("Updating Duet Web Control...") + "</strong>");
					showUpdateMessage(2);
					setTimeout(function() {
						connect(sessionPassword, false);

						showConfirmationDialog(T("Reload Page?"), T("You have just updated Duet Web Control. Would you like to reload the page now?"), function() {
							location.reload();
						});
					}, settings.dwcReconnectDelay);
				} else if (uploadDWSFile != undefined && uploadDWCFile == undefined && uploadFirmwareFile == undefined) {
					log("info", "<strong>" + T("Updating Duet WiFi Server...") + "</strong>");
					showUpdateMessage(1);
					setTimeout(function() {
						connect(sessionPassword, false);
					}, settings.dwsReconnectDelay);
				} else if (uploadFirmwareFile != undefined && uploadDWCFile == undefined && uploadDWSFile == undefined) {
					log("info", "<strong>" + T("Updating Firmware...") + "</strong>");
					showUpdateMessage(0);
					setTimeout(function() {
						connect(sessionPassword, false);
					}, settings.updateReconnectDelay);
				} else {
					log("info", "<strong>" + T("Updating Firmware...") + "</strong>");

					var duration = 0;
					if (uploadDWCFile != undefined) { duration += settings.dwcReconnectDelay; }
					if (uploadDWSFile != undefined) { duration += settings.dwcReconnectDelay; }
					if (uploadFirmwareFile != undefined) { duration += settings.updateReconnectDelay; }

					showUpdateMessage(3, duration);
					setTimeout(function() {
						connect(sessionPassword, false);

						if (uploadDWCFile != undefined) {
							showConfirmationDialog(T("Reload Page?"), T("You have just updated Duet Web Control. Would you like to reload the page now?"), function() {
								location.reload();
							});
						}
					}, duration);
				}
			} else if (status.status == 'H') {
				if (!reconnectingAfterHalt) {
					reconnectAfterHalt();
				} else {
					if (!resetConfirmationShown) {
						showConfirmationDialog(T("Perform firmware reset?"), T("The firmware still reports to be halted after an emergency stop. Would you like to reset your board now?"), function() {
							sendGCode("M999");
							reconnectAfterHalt();
						});
						resetConfirmationShown = true;
					}
				}
			} else {
				reconnectingAfterHalt = resetConfirmationShown = false;
				retryCount = 0;
				setTimeout(updateStatus, settings.updateInterval);
			}

			// Save the last status response
			lastStatusResponse = status;
		}
	});
}

function reconnectAfterHalt() {
	isConnected = updateTaskLive = false;
	showHaltMessage();
	setTimeout(function() {
		reconnectingAfterHalt = true;
		connect(sessionPassword, false);
	}, settings.haltedReconnectDelay);
}

function requestFileInfo() {
	$.ajax(ajaxPrefix + "rr_fileinfo", {
		dataType: "json",
		success: function(response) {
			if (isConnected && response.err == 2) {
				// The firmware is still busy parsing the file, so try again until it's ready
				setTimeout(function() {
					if (isConnected) {
						requestFileInfo();
					}
				}, 250);
			} else if (response.err == 0) {
				// File info is valid, use it
				fileInfo = response;

				$("#span_progress_left").html(T("Printing {0}", response.fileName));

				$("#dd_size").html(formatSize(response.size));
				$("#dd_height").html((response.height > 0) ? T("{0} mm", response.height) : T("n/a"));
				var layerHeight = (response.layerHeight > 0) ? T("{0} mm", response.layerHeight) : T("n/a");
				if (response.firstLayerHeight > 0) {
					$("#dd_layer_height").html(T("{0} mm", response.firstLayerHeight) + " / " + layerHeight);
				} else {
					$("#dd_layer_height").html(layerHeight);
				}

				if (response.filament.length == 0) {
					$("#dd_filament").html(T("n/a"));
				} else {
					var filament = T("{0} mm", response.filament.reduce(function(a, b) { return T("{0} mm", a) + ", " + b; }));
					$("#dd_filament").html(filament);
				}

				$("#dd_generatedby").html((response.generatedBy == "") ? T("n/a") : response.generatedBy);

				$("#td_print_duration").html(formatTime(response.printDuration));
			}
		}
	});
}

function getConfigResponse() {
	$.ajax(ajaxPrefix + "rr_config", {
		dataType: "json",
		success: function(response) {
			configResponse = response;

			$("#firmware_name").text(response.firmwareName);
			$("#panel_tool_changes").toggleClass("hidden", response.firmwareName.indexOf("ch fork") == -1);

			if (response.hasOwnProperty("firmwareElectronics")) {
				$("#tr_firmware_electronics").removeClass("hidden");
				$("#firmware_electronics").text(response.firmwareElectronics);
			}

			if (response.hasOwnProperty("dwsVersion")) {
				$("#dws_version").text(response.dwsVersion);
			}

			$("#firmware_version").text(response.firmwareVersion + " (" + response.firmwareDate + ")");

			for(var drive = 0; drive < response.accelerations.length; drive++) {
				if (drive < response.axisMins.length) {
					$("#tr_drive_" + drive + " > td:nth-child(3)").text(T("{0} mm", response.axisMins[drive]));
				}
				if (drive < response.axisMaxes.length) {
					$("#tr_drive_" + drive + " > td:nth-child(4)").text(T("{0} mm", response.axisMaxes[drive]));
				}
				$("#tr_drive_" + drive + " > td:nth-child(5)").text(T("{0} mm/s", response.minFeedrates[drive]));
				$("#tr_drive_" + drive + " > td:nth-child(6)").text(T("{0} mm/s", response.maxFeedrates[drive]));
				$("#tr_drive_" + drive + " > td:nth-child(7)").text(T("{0} mm/s²", response.accelerations[drive]));
				if (response.hasOwnProperty("currents")) {
					$("#tr_drive_" + drive + " > td:nth-child(8)").text(T("{0} mA", response.currents[drive]));
				}
			}
			if (response.hasOwnProperty("idleCurrentFactor")) {
				$("#dd_idle_current").text(response.idleCurrentFactor.toFixed(0) + "%");
			}
			if (response.hasOwnProperty("idleTimeout")) {
				var idleTimeoutText = (response.idleTimeout == 0) ? T("never") : formatTime(response.idleTimeout);
				$("#dd_idle_timeout").text(idleTimeoutText);
			}
		}
	});
}

// Send G-Code directly to the firmware
function sendGCode(gcode, fromInput) {
	lastSentGCode = gcode;

	// Although rr_gcode gives us a JSON response, it doesn't provide any results.
	// We only need to worry about an AJAX error event.
	$.ajax(ajaxPrefix + "rr_gcode?gcode=" + encodeURIComponent(gcode), {
		dataType: "json"
	});
}
