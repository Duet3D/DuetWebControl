/* Communication routines between RepRapFirmware and Duet Web Control
 * 
 * written by Christian Hammacher (c) 2016-2018
 * 
 * licensed under the terms of the GPL v3
 * see http://www.gnu.org/licenses/gpl-3.0.html
 */


var ajaxPrefix = "";					// Host to use for AJAX requests + "?" char or empty if running on a webserver
var defaultPassword = "reprap";			// Default password that is used when a new connection is established
var sessionPassword = defaultPassword	// The actual password of the board
var reconnectInterval = 1000;			// Interval in which DWC attempts to reconnect to the firmware
var sessionTimeout = 8000;				// Time in ms before RepRapFirmware kills our session

var isConnected = false;				// Are we connected?
var justConnected = false;				// Have we just connected?

var reconnectingAfterHalt = false;		// Are we trying to reconnect after a firmware halt?
var reconnectingAfterUpdate = false;	// Are we trying to reconnect after a firmware update?
var resetConfirmationShown = false;		// Have we shown a prompt to send a reset code yet?

var updateTaskLive = false;				// Are status responses being polled?
var stopUpdating = false;				// This will be true if status updates should be no longer polled
var extendedStatusCounter = 0;			// Counts the number of regular status updates so extended ones are polled from time to time
var lastStatusResponse;					// Contains the last available status response (rr_status)
var zTriggerHeight = 0.0;				// Trigger height of the Z-probe (only used for OEM)

var configResponse;						// Contains the last rr_config response (if any)
var configFile;							// This is a cached copy of the machine's config.g file

var ajaxRequests = [];					// List of all outstanding AJAX requests
var lastSentGCode, lastGCodeFromInput;	// The last sent G-code

var vendor = undefined;					// For OEM functionality
var calibrationWebcamSource = "", calibrationWebcamEmbedded = false;
var hideLastExtruderDrive = false;


/* AJAX Events */

$(document).ajaxSend(function(event, jqxhr, xhrsettings) {
	xhrsettings.sendTime = new Date();
	ajaxRequests.push(jqxhr);
});

$(document).ajaxComplete(function(event, jqxhr, xhrsettings) {
	ajaxRequests = $.grep(ajaxRequests, function(item) { item != jqxhr; });
});

$(document).ajaxError(function(event, jqxhr, xhrsettings, thrownError) {
	if (thrownError == "abort") {
		// Ignore this error if this request was cancelled intentionally
		return;
	}

	if (isConnected) {
		// If we get a 401, that means that the session has timed out.
		// In this case attempt to reconnect with the last set password
		if (jqxhr.status == 401) {
			reconnectAfterTimeout();
			return;
		}

		// Resend this request if it timed out. This may be necessary for DuetWiFi
		// Also check for empty responses, although not every browser reports an
		// error in this case. However if we get one, treat it as a timeout.
		var response = jqxhr.responseText || jqxhr.responseJSON;
		if (thrownError == "timeout" || typeof app !== "undefined" || (thrownError == "" && response == undefined)) {
			if (!xhrsettings.hasOwnProperty("retryCount")) {
				xhrsettings.retryCount = 1;
			} else {
				xhrsettings.retryCount++;
			}

			if (xhrsettings.retryCount <= settings.maxRetries) {
				var retryInterval = sessionTimeout / (settings.maxRetries + 1);
				var timeSinceSend = new Date() - xhrsettings.sendTime;
				if (timeSinceSend < retryInterval) {
					// The time difference between sending and this error is very low,
					// wait a while longer before retrying
					setTimeout(function() {
						$.ajax(xhrsettings);
					}, retryInterval - timeSinceSend);
				} else {
					// This request timed out after a while, retry now
					$.ajax(xhrsettings);
				}
				return;
			}
		}

		// Try to reconnect
		disconnect(false);
		$("#span_reconnect_title").text(T("Connection Lost"));
		$("#span_reconnect_reason").text(errorToDescription(thrownError, ""));
		$("#modal_reconnecting").modal("show");
		setStatusLabel("Reconnecting", "warning");
		connect(sessionPassword, false);

		// Try to log the faulty response to console
		if (response != undefined) {
			console.log("Error! The following JSON response could not be parsed:");
			console.log(response);
		}
	}
});


/* Connect / Disconnect */

$(".btn-connect").click(function(e) {
	if (!$(this).hasClass("disabled")) {
		if (!isConnected) {
			// Attempt to connect with the last-known password first
			connect(sessionPassword, true);
		} else {
			disconnect(true);
		}
	}
	e.preventDefault();
});

function connect(password, regularConnect) {
	if (regularConnect) {
		$("#main_content").css("cursor", "wait");

		setStatusLabel("Connecting", "warning");
		$(".btn-connect > span:not(.glyphicon)").text(T("Connecting..."));
		$(".btn-connect > span.glyphicon").removeClass("glyphicon-log-in").addClass("glyphicon-transfer");
		$("a.btn-connect").removeClass("list-group-item-info").addClass("list-group-item-warning disabled");
		$("button.btn-connect").removeClass("btn-info").addClass("btn-warning disabled");

		closeAllNotifications();

		// If we are running on localhost, ask for a destination
		if (location.host == "") {
			showHostPrompt();
			return;
		}
	}

	$.ajax(ajaxPrefix + "rr_connect?password=" + password + "&time=" + encodeURIComponent(timeToStr(new Date())), {
		dataType: "json",
		global: false,
		error: function(jqXHR, textStatus, errorThrown) {
			if (regularConnect && location.host == "") {
				$("#main_content").css("cursor", "");
				setStatusLabel("Disconnected", "idle");
				$(".btn-connect > span:not(.glyphicon)").text(T("Connect"));
				$(".btn-connect > span.glyphicon").removeClass("glyphicon-transfer").addClass("glyphicon-log-in");
				$("a.btn-connect").removeClass("list-group-item-warning disabled").addClass("list-group-item-info");
				$("button.btn-connect").removeClass("btn-warning disabled").addClass("btn-info");
				showMessage("danger", T("Error"), T("Could not establish a connection to the Duet firmware! Please check your settings and try again."), 0, false);
			} else {
				if (!reconnectingAfterUpdate) {
					$("#span_reconnect_reason").text(errorToDescription(textStatus, errorThrown));
				}
				if (regularConnect) {
					$("#span_reconnect_title").text(T("Failed to connect"));
					$("#modal_reconnecting").modal("show");
				}

				setTimeout(function() {
					connect(password, false);
				}, reconnectInterval);
			}
		},
		success: function(response) {
			if (response.err == 2) {				// Looks like the firmware ran out of HTTP sessions
				$("#span_reconnect_reason").text(T("No more HTTP sessions available"));
				if (regularConnect) {
					$("#span_reconnect_title").text(T("Failed to connect"));
					$("#modal_reconnecting").modal("show");
				}

				setTimeout(function() {
					connect(password, false);
				}, reconnectInterval);
			} else {
				$("#modal_reconnecting").modal("hide");

				if (response.err == 0) {		// Connection established
					sessionPassword = password;
					postConnect(response);
				} else {						// Invalid password
					showPasswordPrompt();
					if (password != "") {
						showMessage("danger", T("Error"), T("Invalid password!"));
					}
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

	$("#main_content").css("cursor", "");
	log("success", "<strong>" + T("Connection established!") + "</strong>");
	if (location.host == "") {
		setLocalSetting("lastHost", $("#input_host").val());
	}

	isConnected = justConnected = true;
	extendedStatusCounter = settings.extendedStatusInterval; // ask for extended status response on first poll

	loadThemes();
	getOemFeatures();
	updateFilaments();

	if (needsInitialSettingsUpload) {
		uploadTextFile("0:/www/dwc.json", JSON.stringify(settings), undefined, false);
	}

	startUpdates();
	if (currentPage == "settings") {
		getConfigResponse();
	}

	$(".btn-connect > span:not(.glyphicon)").text(T("Disconnect"));
	$(".btn-connect > span.glyphicon").removeClass("glyphicon-transfer").addClass("glyphicon-log-out");
	$("a.btn-connect").removeClass("list-group-item-warning disabled").addClass("list-group-item-success");
	$("button.btn-connect").removeClass("btn-warning disabled").addClass("btn-success");

	enableControls();
	validateAddTool();
}

function disconnect(sendDisconnect) {
	if (isConnected) {
		log("danger", "<strong>" + T("Disconnected.") + "</strong>");
	}
	isConnected = false;

	$(".btn-connect > span:not(.glyphicon)").text(T("Connect"));
	$(".btn-connect > span.glyphicon").removeClass("glyphicon-log-out").addClass("glyphicon-log-in");
	$("a.btn-connect").removeClass("list-group-item-success").addClass("list-group-item-info");
	$("button.btn-connect").removeClass("btn-success").addClass("btn-info");

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
	setToolMapping([]);
}

function errorToDescription(textStatus, errorThrown) {
	if (errorThrown != "" && textStatus != errorThrown) {
		return errorThrown;
	}

	switch (textStatus) {
		case "timeout": return  T("Request Timeout");
		case "error": return T("Host unreachable");
		case "abort": return T("Request aborted");
		case "parsererror": return T("Invalid Response");
		case "": return T("Communication Error");
		default: return T("Unknown ({0})", textStatus);
	}
}


/* Status updates */

function startUpdates() {
	stopUpdating = false;
	if (!updateTaskLive) {
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

			// Compensation type
			if (status.hasOwnProperty("compensation"))
			{
				$(".compensation").removeClass("hidden");
				$("#span_compensation").text(status.compensation);
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

					$("#table_drives > tbody > tr").eq(i).children().eq(1).text(displayText);
				}
			}

			// Printer Geometry
			if (status.hasOwnProperty("geometry")) {
				setGeometry(status.geometry);
			}

			// Axis names
			if (status.hasOwnProperty("axisNames") && status.axisNames != axisNames.join("")) {
				axisNames = status.axisNames.split("");
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

			// Bitmap of configurable fans
			if (status.hasOwnProperty("controllableFans")) {
				if (controllableFans != status.controllableFans) {
					controllableFans = status.controllableFans;
					for(var i = 0; i < maxFans; i++) {
						setFanVisibility(i, (controllableFans & (1 << i)) != 0);
					}
				}
			} else if (configResponse == undefined) {
				// For legacy firmware versions download the config response. It will tell us if a DueX is attached
				getConfigResponse();
			}

			// Fan Names
			if (status.params.hasOwnProperty("fanNames") && (lastStatusResponse == undefined || !arraysEqual(status.params.fanNames, fanNames))) {
				fanNames = status.params.fanNames;
				needGuiUpdate = true;
			}

			// Machine Mode
			if (status.hasOwnProperty("mode")) {
				$("#span_mode").removeClass("hidden");
				$("#span_mode > span").text(status.mode);
			}

			// Machine Name
			if (status.hasOwnProperty("name")) {
				setMachineName(status.name);
			}

			// Probe Parameters (maybe hide probe info for type 0 someday?)
			if (status.hasOwnProperty("probe")) {
				probeTriggerValue = status.probe.threshold;
				probeSlowDownValue = probeTriggerValue * 0.9;	// see Platform::Stopped in dc42/ch firmware forks

				var probeType;
				switch (status.probe.type) {
					case 0:
						probeType = T("Z Switch (0)");
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
						probeType = T("E0 Switch (4)");
						break;
					case 5:
						probeType = T("Digital Switch (5)");
						break;
					case 6:
						probeType = T("E1 Switch (6)");
						break;
					case 7:
						probeType = T("Z Switch (7)");
						break;
					case 8:
						probeType = T("Digital Switch (8)");
						break;
					default:
						probeType = T("Unknown ({0})", status.probe.type);
						break;
				}
				$("#dd_probe_type").text(probeType);
				$("#dd_probe_height").text(T("{0} mm", status.probe.height));
				$("#dd_probe_trigger_value").text(probeTriggerValue);

				zTriggerHeight = status.probe.height;
				$("#span_probe_height").text(T("{0} mm", zTriggerHeight.toFixed(2)));
			}

			// Tool Mapping
			if (status.hasOwnProperty("tools")) {
				needGuiUpdate |= setToolMapping(status.tools);
			}

			// Heater name
			if (status.temps.hasOwnProperty("names") && (lastStatusResponse == undefined || !arraysEqual(status.temps.names, heaterNames))) {
				heaterNames = status.temps.names;
				needGuiUpdate = true;
			}

			// MCU temperature
			if (status.hasOwnProperty("mcutemp")) {
				if (lastStatusResponse == undefined) {
					$(".mcutemp").removeClass("hidden");
				}
				$("td.mcutemp").text(status.mcutemp.cur).prop("title", T("Minimum: {0} °C Maximum: {1} °C", status.mcutemp.min, status.mcutemp.max));
			}

			// Input voltage
			if (status.hasOwnProperty("vin")) {
				$(".vin").removeClass("hidden");
				$("#td_vin").html(T("{0} V", status.vin.cur.toFixed(1)));
				$("#td_vin").prop("title", T("Minimum: {0} V Maximum: {1} V", status.vin.min.toFixed(1), status.vin.max.toFixed(1)));
			}

			// Requested and top speeds
			if (status.hasOwnProperty("speeds")) {
				$(".speeds").removeClass("hidden");
				$(".req-speed").text(T("{0} mm/s", status.speeds.requested));
				$(".top-speed").text(T("{0} mm/s", status.speeds.top));
			}

			/*** Default status response ***/

			// Status
			var printing = false, paused = false;
			switch (status.status) {
				case 'F':	// Flashing new firmware
					setStatusLabel("Updating", "success");
					break;

				case 'O':	// Off
					setStatusLabel("off", "danger");
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

				case 'M':	// Simulating
					setStatusLabel("Simulating", "success");
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
			setPrintStatus(printing);
			setPauseStatus(paused);

			// Update file lists of the visible page after the first status response
			if (justConnected) {
				if (currentPage == "files") {
					updateGCodeFiles();
				} else if (currentPage == "control" || currentPage == "macros") {
					updateMacroFiles();
				} else if (currentPage == "filaments") {
					updateFilaments();
				} else if (currentPage == "settings") {
					if ($("#page_sysedit").hasClass("active")) {
						updateSysFiles();
					} else if ($("#page_display").hasClass("active")) {
						updateDisplayFiles();
					}
				}

				justConnected = false;
			}

			// Set homed axes
			if (lastStatusResponse == undefined || !arraysEqual(status.coords.axesHomed, lastStatusResponse.coords.axesHomed)) {
				setAxesHomed(status.coords.axesHomed);
			}

			// Update extruder drives
			if (status.coords.extr.length != numExtruderDrives) {
				numExtruderDrives = status.coords.extr.length;
				needGuiUpdate = true;
			}

			for(var i = 0; i < numExtruderDrives; i++) {
				$("td[data-extruder='" + i + "']").html(status.coords.extr[i].toFixed(1));
			}
			if (numExtruderDrives > 0) {
				$("#td_extr_total").html(status.coords.extr.reduce(function(a, b) { return a + b; }));
			} else {
				$("#td_extr_total").html(T("n/a"));
			}

			// Axis coordinates
			if (status.hasOwnProperty("axes") && status.axes != numAxes)
			{
				numAxes = status.axes;
				needGuiUpdate = true;
			}

			for(var i = 0; i < status.coords.xyz.length; i++) {
				$("td[data-axis='" + i + "']").html(status.coords.xyz[i].toFixed(2));
			}

			if (geometry == "delta" && axisNames.indexOf("X") != -1 && !status.coords.axesHomed[axisNames.indexOf("X")]) {
				// Override XYZ coordinates on a Delta with 'n/a' if the axes are not homed
				$("td[data-axis='" + axisNames.indexOf("X") + "']").html(T("n/a"));
				$("td[data-axis='" + axisNames.indexOf("Y") + "']").html(T("n/a"));
				$("td[data-axis='" + axisNames.indexOf("Z") + "']").html(T("n/a"));

				// Set message box coordinates
				$(".msgbox-x").text("X=" + T("n/a"));
				$(".msgbox-y").text("Y=" + T("n/a"));
				$(".msgbox-z").text("Z=" + T("n/a"));
				$(".msgbox-a").text("A=" + T("n/a"));
			} else {
				var x = (axisNames.indexOf("X") == -1) ? T("n/a") : status.coords.xyz[axisNames.indexOf("X")].toFixed(2);
				var y = (axisNames.indexOf("Y") == -1) ? T("n/a") : status.coords.xyz[axisNames.indexOf("Y")].toFixed(2);
				var z = (axisNames.indexOf("Z") == -1) ? T("n/a") : status.coords.xyz[axisNames.indexOf("Z")].toFixed(2);
				var aIndex = axisNames.indexOf("A");
				var a = (aIndex == -1 || status.coords.xyz.length <= aIndex) ? T("n/a") : status.coords.xyz[aIndex].toFixed(2);
				$(".msgbox-x").text("X=" + x);
				$(".msgbox-y").text("Y=" + y);
				$(".msgbox-z").text("Z=" + z);
				$(".msgbox-a").text("A=" + a);
			}

			// Current Tool
			if (lastStatusResponse != undefined && lastStatusResponse.currentTool != status.currentTool) {
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
				if (status.output.hasOwnProperty("msgBox")) {
					updateMessageBox(status.output.msgBox);
				} else {
					closeMessageBox();
				}
			} else {
				closeMessageBox();
			}

			// ATX Power
			if (lastStatusResponse == undefined || status.params.atxPower != lastStatusResponse.params.atxPower) {
				setATXPower(status.params.atxPower);
			}

			// Fan Control
			var fanValues = (status.params.fanPercent.constructor === Array) ? status.params.fanPercent : [status.params.fanPercent];

			if ($("tr[data-fan='print'] button.fan-visibility").hasClass("active") && fanValues.length > 0) {
				// Set Print/Tool fan value
				var printFan = 0;
				var tool = getTool(status.currentTool);
				if (tool != undefined && tool.hasOwnProperty("fans")) {
					for(var fan = 0; fan < Math.min(maxFans, fanValues.length); fan++) {
						if ((tool.fans & (1 << fan)) != 0) {
							printFan = fan;
							break;
						}
					}
				}

				if (fanSliderActive != "print" && (lastStatusResponse == undefined || $("tr[data-fan='print'] .fan-slider > input").slider("getValue") != fanValues[printFan])) {
					$("tr[data-fan='print'] .fan-slider > input").slider("setValue", fanValues[printFan]);
				}
			}

			for(var fan = 0; fan < Math.min(maxFans, fanValues.length); fan++) {
				if (fan != fanSliderActive) {
					var fanValue = fanValues[fan] / 100.0;
					if (overriddenFanValues[fan] != undefined && overriddenFanValues[fan] != fanValue) {
						// Enforce overriden fan value
						sendGCode("M106 P" + fan + " S" + overriddenFanValues[fan]);
					} else if (lastStatusResponse == undefined || $("tr[data-fan='" + fan + "'] .fan-slider > input").slider("getValue") != fanValue * 100.0) {
						// Update slider value
						$("tr[data-fan='" + fan + "'] .fan-slider > input").slider("setValue", fanValue * 100.0);
					}
				}
			}

			// Speed Factor
			if (!speedSliderActive && (lastStatusResponse == undefined || $("#slider_speed").slider("getValue") != status.params.speedFactor)) {
				$("#slider_speed").slider("setValue", status.params.speedFactor);
			}
			if (!extrSliderActive) {
				for(var i = 0; i < status.params.extrFactors.length; i++) {
					var extrSlider = $("#slider_extr_" + i);
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

							// Has grid-based probing finished? If so, attempt to get the P-parameter if present because represents the filename
							if (response.indexOf(" points probed, mean error ") != -1) {
								var csvFile = undefined;
								if (lastSentGCode.indexOf("G29") == 0) {
									var inQuotes = false, readingFilename = false;
									for(var i = 0; i < lastSentGCode.length; i++) {
										if (lastSentGCode[i] == '"') {
											inQuotes = !inQuotes;
										} else if (inQuotes) {
											if (readingFilename) {
												if (csvFile == undefined) {
													csvFile = lastSentGCode[i];
												} else {
													csvFile += lastSentGCode[i];
												}
											}
										} else if (lastSentGCode[i] == 'P') {
											readingFilename = true;
										}
									}

									if (csvFile != undefined && csvFile.indexOf("/") == -1) {
										csvFile = "0:/sys/" + csvFile;
									}
								}
								getHeightmap(csvFile);
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

						// Check if the reply contains a request to load a calibration stream (OEM)
						var oldResponse = response;
						response = response.replace(/\{UpdateCam\d*\}/g, "");
						var snapshotId = oldResponse.match(/\{UpdateCam(\d*)\}/);
						snapshotId = (snapshotId != null && snapshotId.length > 1) ? snapshotId[snapshotId.length - 1] : "";
						if (response != oldResponse) {
							updateCalibrationWebcam(false, snapshotId);
						} else {
							var camAddress = response.match(/\{CamAddress-(.+)\}/);
							if (camAddress != null && camAddress.length > 1) {
								calibrationWebcamSource = "http://" + camAddress[1];
								updateCalibrationWebcam(true);
							}
							response = response.replace(/\{CamAddress-.+\}/, "");
						}

						// Check if a reload of DWC / DWC settings has been requested
						if (response.match(/\{reloadDWC\}/) != null) {
							response = response.replace(/\{reloadDWC\}/, "");
							if (location.host != "") {
								location.reload();
							}
						} else if (response.match(/\{reloadSettings\}/) != null) {
							response = response.replace(/\{reloadSettings\}/, "");
							if (settings.settingsOnDuet) {
								// Reload the settings once again from the Duet
								loadSettings();
								showMessage("success", "", "<strong>" + T("Settings applied!") + "</strong>");
							}
						}

						// What kind of reply are we dealing with?
						if (response != "" || (lastSentGCode != "" && oldResponse == response)) {
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
							log(style, prefix + "<span>" + content + "</span>");

							// If the console isn't visible, check if a notification can be displayed
							if (currentPage != "console") {
								if ((style == "success" && settings.showEmptyResponses) ||
									(style == "info" && settings.showInfoMessages) ||
									(style == "warning" && settings.showWarningMessages) ||
									(style == "danger" && settings.showErrorMessages))
								{
									if (response == "") {
										showMessage(style, "", "<strong>" + lastSentGCode + "</strong>");
									} else {
										showMessage(style, lastSentGCode, content);
									}
								}
							}

							// Close the scanner modal dialog if an error occurred
							if (style == "danger") {
								$("#modal_scanner").modal("hide");
							}

							// See if this code can be remembered and reset info about the last sent G-Code again
							if (lastSentGCode != "" && lastGCodeFromInput &&
								(style == "success" || style == "info") && rememberedGCodes.indexOf(lastSentGCode) == -1)
							{
								rememberedGCodes.push(lastSentGCode);
								saveGCodes();
								applyGCodes();
							}
						}
						lastSentGCode = "";
					}
				});
			}

			// Sensors
			setProbeValue(status.sensors.probeValue, status.sensors.probeSecondary);
			if (status.sensors.fanRPM.constructor == Array) {
				$("td.fan-rpm").html(status.sensors.fanRPM.join(" / "));
			} else {
				$("td.fan-rpm").html(status.sensors.fanRPM);
			}

			// Heated bed
			if (status.temps.hasOwnProperty("bed")) {
				var configuredBedHeater = (status.temps.bed.hasOwnProperty("heater")) ? status.temps.bed.heater : 0;
				if (bedHeater != configuredBedHeater) {
					bedHeater = configuredBedHeater;
					needGuiUpdate = true;
					setHeatersInUse();
				}

				setTemperatureInput("bed", status.temps.bed.active, true, true);
			} else if (bedHeater != -1) {
				bedHeater = -1;
				needGuiUpdate = true;
			}

			// Chamber
			if (status.temps.hasOwnProperty("chamber")) {
				var configuredChamberHeater = (status.temps.chamber.hasOwnProperty("heater")) ? status.temps.chamber.heater : maxHeaters;
				if (chamberHeater != configuredChamberHeater)
				{
					chamberHeater = configuredChamberHeater;
					needGuiUpdate = true;
					setHeatersInUse();
				}

				setTemperatureInput("chamber", status.temps.chamber.active, true, true);
			} else if (chamberHeater != -1) {
				chamberHeater = -1;
				needGuiUpdate = true;
			}

			// Dry Cabinet
			if (status.temps.hasOwnProperty("cabinet")) {
				if (cabinetHeater != status.temps.cabinet.heater)
				{
					cabinetHeater = status.temps.cabinet.heater;
					needGuiUpdate = true;
					setHeatersInUse();
				}

				setTemperatureInput("cabinet", status.temps.cabinet.active, true, true);
			} else if (cabinetHeater != -1) {
				cabinetHeater = -1;
				needGuiUpdate = true;
			}

			// Heater temperatures and states
			if (status.temps.hasOwnProperty("current") && status.temps.hasOwnProperty("state")) {
				// Set current temperatures and states
				for(var heater = 0; heater < status.temps.current.length; heater++) {
					if (heater == bedHeater) {
						setCurrentTemperature("bed", status.temps.current[heater]);
						setHeaterState("bed", status.temps.state[heater], status.currentTool);
					}
					if (heater == chamberHeater) {
						setCurrentTemperature("chamber", status.temps.current[heater]);
						setHeaterState("chamber", status.temps.state[heater], status.currentTool);
					}
					if (heater == cabinetHeater)
					{
						setCurrentTemperature("cabinet", status.temps.current[heater]);
						setHeaterState("cabinet", status.temps.state[heater], status.currentTool);
					}
					setCurrentTemperature(heater, status.temps.current[heater]);
					setHeaterState(heater, status.temps.state[heater], status.currentTool);
				}

				// Keep the temperature chart up-to-date
				recordCurrentTemperatures(status.temps.current);
			}

			// Active+Standby tool temperatures
			var currentToolTemps = undefined;
			if (status.temps.hasOwnProperty("tools") && toolMapping.length == status.temps.tools.active.length) {
				for(var toolIndex = 0; toolIndex < status.temps.tools.active.length; toolIndex++) {
					var toolNumber = toolMapping[toolIndex].number;
					for(var heaterIndex = 0; heaterIndex < status.temps.tools.active[toolIndex].length; heaterIndex++) {
						var heater = toolMapping[toolIndex].heaters[heaterIndex];
						setToolTemperatureInput(toolNumber, heater, status.temps.tools.active[toolIndex][heaterIndex], true);
						setToolTemperatureInput(toolNumber, heater, status.temps.tools.standby[toolIndex][heaterIndex], false);
					}
				}
			}

			// Extra temperatures
			if (status.temps.hasOwnProperty("extra")) {
				if (status.temps.extra.length != numTempSensors) {
					numTempSensors = status.temps.extra.length;
					needGuiUpdate = true;
				}

				for(var i = 0; i < status.temps.extra.length; i++) {
					var name = status.temps.extra[i].hasOwnProperty("name") ? status.temps.extra[i].name : "";
					if (lastStatusResponse == undefined || status.temps.extra.length != lastStatusResponse.temps.extra.length || status.temps.extra[i].name != lastStatusResponse.temps.extra[i].name) {
						if (name == "") {
							name = T("Sensor " + (i + 1));
						} else if (name.indexOf("[") != -1) {
							name = name.substr(0, name.indexOf("[")).trim();
						}
						$("#table_extra tr").eq(i + 1).children("th").text(name);
					}

					var unit = name.match(/\[(.*?)\]/);
					var value = status.temps.extra[i].temp.toFixed(1);
					if (unit == null) {
						value = T("{0} °C", value);
					} else {
						value = value + " " + unit[1];
					}

					$("#table_extra tr").eq(i + 1).children("td:last-child").text(value);
					if (name == "MCU") {
						$("td.mcutemp").text(value);
					}
				}
				recordExtraTemperatures(status.temps.extra);
			}

			// Scanner extension
			if (status.hasOwnProperty("scanner")) {
				// Toggle visibility of scanner controls
				if (lastStatusResponse == undefined || !lastStatusResponse.hasOwnProperty("scanner")) {
					$(".scan-control").removeClass("hidden");
					$("#div_content").resize();
				}

				// Enable scan controls only if the scanner is ready
				var enableScanControls = (status.scanner.status == "I");
				if (vendor == "diabase") {
					status.coords.axesHomed.forEach(function(isHomed) {
						enableScanControls &= (isHomed > 0);
					});
				}
				$("#btn_calibrate_scanner, #btn_start_scan, #btn_shutdown_scanner").toggleClass("disabled", !enableScanControls);

				// Update scan dialogs
				updateScannerDialogs(status.scanner);

				// Reload scans as soon as a 3D scan has finished
				var lastStatus = (lastStatusResponse == undefined || !lastStatusResponse.hasOwnProperty("scanner"))
									? "?" : lastStatusResponse.scanner.status;
				if (status.scanner.status == "I" && (lastStatus == "S" || lastStatus == "P" || lastStatus == "U")) {
					updateScanFiles();
				}
			} else if (lastStatusResponse != undefined && lastStatusResponse.hasOwnProperty("scanner")) {
				if (currentPage == "scanner") {
					showPage("control");
				}
				$(".scan-control").addClass("hidden");

				if ($("#modal_scanner").hasClass("in")) {
					$("#modal_scanner").modal("hide");
				}
				if ($("#modal_scanner_calibration").hasClass("in")) {
					$("#modal_scanner_calibration").modal("hide");
				}
			}

			// CNC Spindles
			if (status.hasOwnProperty("spindles")) {
				for(var i = spindleTools.length - 1; i >= status.spindles.length; i--) {
					needGuiUpdate = true;
					spindleTools[i] = -1;
				}

				for(var i = 0; i < status.spindles.length; i++) {
					if (i + 1 > spindleTools.length) {
						if (status.spindles[i].hasOwnProperty("tool")) {
							needGuiUpdate = true;
							spindleTools.push(status.spindles[i].tool);
							spindleCurrents.push(status.spindles[i].current);
							spindleActives.push(status.spindles[i].active);
						}
					} else {
						if (status.spindles[i].hasOwnProperty("tool") && spindleTools[i] != status.spindles[i].tool) {
							needGuiUpdate = true;
							spindleTools[i] = status.spindles[i].tool;
						}
						setSpindleCurrent(i, status.spindles[i].current);
						setSpindleInput(i, status.spindles[i].active);
					}
				}
			} else if (status.hasOwnProperty("spindle") && spindleTools.length > 0) {			// deprecated
				setSpindleCurrent(0, status.spindle.current);
				setSpindleInput(0, status.spindle.active);
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
					else if (fileInfo.height > 0 && fileInfo.layerHeight > 0) {
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
					var totalFilamentUsage = status.coords.extr.reduce(function(a, b) { return a + b; });
					if (layerData.length == 0) {
						if (status.currentLayer > 2) {						// add avg values on reconnect
							var avgFilamentUsage = totalFilamentUsage / status.currentLayer;
							addLayerData(status.firstLayerDuration, avgFilamentUsage, false);
							realPrintTime -= status.currentLayerTime;

							var accFilamentUsage = avgFilamentUsage;
							for(var layer = 2; layer < status.currentLayer; layer++) {
								accFilamentUsage += avgFilamentUsage;
								addLayerData(realPrintTime / (status.currentLayer - 1), accFilamentUsage, false);
							}
							drawPrintChart();
						} else {											// else only the first layer is complete
							addLayerData(status.firstLayerDuration, totalFilamentUsage, true);
						}

						if (status.currentLayer == 2) {
							lastLayerPrintDuration = 0;
						} else {
							lastLayerPrintDuration = realPrintTime;
						}
					} else if (printJustFinished || status.currentLayer - 1 > layerData.length) {
						addLayerData(realPrintTime - lastLayerPrintDuration, totalFilamentUsage, true);
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
				setCurrentTool(status.currentTool);
			}
			drawTemperatureChart();

			// Set timer for next status update
			if (status.status == 'F') {
				isConnected = updateTaskLive = false;

				// Ideally each update path should have its own status char, OTOH this should be sufficient for the moment
				if (uploadDWCFile != undefined && uploadDWSFile == undefined && uploadFirmwareFile == undefined) {
					log("info", "<strong>" + T("Updating Duet Web Control...") + "</strong>");
					showUpdateMessage(2);

					// Ask for page reload if DWC has been updated (wireless Duets, DWC on WiFi chip)
					setTimeout(reconnectAfterUpdate, settings.dwcReconnectDelay);
				} else if (uploadDWSFile != undefined && uploadDWCFile == undefined && uploadFirmwareFile == undefined) {
					log("info", "<strong>" + T("Updating Duet WiFi Server...") + "</strong>");
					showUpdateMessage(1);
					setTimeout(reconnectAfterUpdate, settings.dwsReconnectDelay);
				} else if (uploadFirmwareFile != undefined && uploadDWCFile == undefined && uploadDWSFile == undefined) {
					log("info", "<strong>" + T("Updating Firmware...") + "</strong>");
					showUpdateMessage(0);
					setTimeout(reconnectAfterUpdate, settings.updateReconnectDelay);
				} else if (uploadFirmwareFile != undefined || uploadDWCFile != undefined || uploadDWSFile != undefined) {
					var duration = 0;
					if (uploadDWCFile != undefined) { duration += settings.dwcReconnectDelay; }
					if (uploadDWSFile != undefined) { duration += settings.dwsReconnectDelay; }
					if (uploadFirmwareFile != undefined) { duration += settings.updateReconnectDelay; }

					log("info", "<strong>" + T("Updating Firmware...") + "</strong>");
					showUpdateMessage(3, duration);
					setTimeout(reconnectAfterUpdate, duration);
				} else {
					log("info", "<strong>" + T("Updating Firmware...") + "</strong>");

					disconnect(false);
					reconnectingAfterUpdate = true;
					$("#span_reconnect_title").text(T("Connection Lost"));
					$("#span_reconnect_reason").text(T("Firmware Update"));
					$("#modal_reconnecting").modal("show");
					setStatusLabel("Reconnecting", "warning");
					connect(sessionPassword, false);
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
				reconnectingAfterHalt = reconnectingAfterUpdate = resetConfirmationShown = false;
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

function reconnectAfterUpdate() {
	if ((uploadedDWC || uploadDWCFile != undefined) && location.host != "") {
		if (sessionPassword != defaultPassword) {
			connect(sessionPassword, false);

			showConfirmationDialog(T("Reload Page?"), T("You have just updated Duet Web Control. Would you like to reload the page now?"), function() {
				location.reload();
			});
		} else {
			location.reload();
		}
	} else {
		connect(sessionPassword, false);
	}
}

function reconnectAfterTimeout() {
	updateTaskLive = false;
	connect(sessionPassword, false);
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

			if (response.hasOwnProperty("firmwareElectronics")) {
				$("#tr_firmware_electronics").removeClass("hidden");
				$("#firmware_electronics").text(response.firmwareElectronics);

				if (lastStatusResponse != undefined && !lastStatusResponse.hasOwnProperty("controllableFans") && response.firmwareElectronics.indexOf("DueX") != -1) {
					controllableFans = 511; // we have 9 fans total with the DueX
					updateGui();
				}
			}

			if (response.hasOwnProperty("dwsVersion")) {
				$("#dws_version").text(response.dwsVersion);
			}

			$("#firmware_version").text(response.firmwareVersion + " (" + response.firmwareDate + ")");

			var driveRows = $("#table_drives > tbody > tr");
			for(var drive = 0; drive < maxDrives; drive++) {
				if (lastStatusResponse != undefined && drive < lastStatusResponse.coords.xyz.length + lastStatusResponse.coords.extr.length) {
					var rowCells = driveRows.eq(drive).removeClass("hidden").children();
					rowCells.eq(2).text((drive < response.axisMins.length) ? T("{0} mm", response.axisMins[drive]) : T("n/a"));
					rowCells.eq(3).text((drive < response.axisMaxes.length) ? T("{0} mm", response.axisMaxes[drive]) : T("n/a"));
					rowCells.eq(4).text(T("{0} mm/s", response.minFeedrates[drive]));
					rowCells.eq(5).text(T("{0} mm/s", response.maxFeedrates[drive]));
					rowCells.eq(6).text(T("{0} mm/s²", response.accelerations[drive]));
					rowCells.eq(7).text(response.hasOwnProperty("currents") ? T("{0} mA", response.currents[drive]) : T("n/a"));
				} else {
					driveRows.eq(drive).addClass("hidden");
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
	if (gcode == "") {
		return;
	}
	lastSentGCode = gcode;
	lastGCodeFromInput = fromInput;

	// Although rr_gcode gives us a JSON response, it doesn't provide any useful values for DWC.
	// We only need to worry about an AJAX error event, which is handled by the global AJAX error callback.
	$.ajax(ajaxPrefix + "rr_gcode?gcode=" + encodeURIComponent(gcode), {
		dataType: "json"
	});
}


// Theme support
function loadThemes() {
	$.ajax(ajaxPrefix + "rr_filelist?dir=0:/www/css", {
		dataType: "json",
		success: function(response) {
			if (response.hasOwnProperty("files")) {
				response.files.forEach(function(item) {
					var theme = item.name.match(/(.+)\.theme\.css/);
					if (item.type == "f" && theme != null) {
						theme = theme[1];
						if (theme != "bootstrap") {
							$("#dropdown_theme > ul").append('<li><a data-theme="' + theme + '" href="#">' + theme + '</a></li>');
						}
					}
				});
			}
		}
	});
}


// For OEM functionality
function getOemFeatures() {
	if (location.host == "") {
		return;
	}

	$.ajax(ajaxPrefix + "rr_download?name=0:/sys/oem.json", {
		dataType: "json",
		global: false,
		success: function(response) {
			if (response != "") {
				if (response.hasOwnProperty("spindleTool")) {
					spindleTools = [response.spindleTool];
				}

				if (response.hasOwnProperty("calibrationCamSource") && response.calibrationCamSource != "") {
					calibrationWebcamSource = response.calibrationCamSource;
					calibrationWebcamEmbedded = response.hasOwnProperty("calibrationCamEmbedded") && response.calibrationCamEmbedded;
				} else {
					calibrationWebcamSource = "";
				}
				updateCalibrationWebcam(true);

				hideLastExtruderDrive = response.hasOwnProperty("hideLastExtruderDrive") && response.hideLastExtruderDrive > 0;
				if (response.hasOwnProperty("vendor")) {
					setOem(response.vendor);
				}
			}
		}
	});
}

function setOem(oem) {
	vendor = oem;

	// Diabase Engineering
	if (oem == "diabase") {
		$(".diabase").removeClass("hidden");
		$(".no-diabase").addClass("hidden");

		$(".navbar-brand").prop("href", "https://www.diabasepe.com").prop("target", "_blank");
		$(".navbar-brand > img").removeClass("hidden").prop("src", "img/diabase_banner.png");

		$("#table_tools tr[data-heater='cabinet'] > th:first-child > a").text(T("Dry Cabinet"));
		$("#table_heaters tr[data-heater='cabinet'] > th:first-child > a").text(T("Dry Cabinet"));

		$("#img_crosshair").prop("src", "img/crosshair.png");
		$("#img_calibration_diagram").prop("src", "img/diabase_calibration_diagram.png");
	}

	// Update GUI just in case the response was received after the first status response
	if (toolMapping != undefined) {
		updateGui();
	}
}
