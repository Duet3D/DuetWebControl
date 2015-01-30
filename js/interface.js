/* Interface logic for the Duet Web Control v1.00
 * 
 * written by Christian Hammacher
 * 
 * licensed under the terms of the GPL v2
 * see http://www.gnu.org/licenses/gpl-2.0.html
 */

var jsVersion = 1.0;
var sessionPassword = "reprap";

/* Constants */

var maxTemperatureSamples = 1000;
var probeSlowDownColor = "#FFFFE0", probeTriggerColor = "#FFF0F0";

var tempChart;
var tempChartOptions = 	{
							colors: ["#0000FF", "#FF0000", "#00DD00", "#FFA000", "#FF00FF"],
							grid: {
								borderWidth: 0
							},
							xaxis: {
								show: false
							},
							yaxis: {
								min: 0,
								max: 280
							}
						};
var tempChartPadding = 15;

var printChart;
var printChartOptions =	{
							grid: {
								borderWidth: 0
							},
							pan: {
								interactive: true
							},
							xaxis: {
								min: 0,
								tickDecimals: 0,
							},
							yaxis: {
								min: 0,
								max: 60,
								ticks: 5,
								tickDecimals: 0,
								tickFormatter: function(val) { if (!val) { return ""; } else { return val + "s"; } }
							},
							zoom: {
								interactive: true
							}
						};
						
/* Settings */

var settings = {
	updateInterval: 250,			// in ms
	haltedReconnectDelay: 5000,		// in ms
	extendedStatusInterval: 10,		// nth status request will include extended values
	maxRequestTime: 8000,			// time to wait for a status response in ms
	
	halfZMovements: false,			// use half Z movements
	logSuccess: true,				// log all sucessful G-Codes in the console
	useKiB: false,					// display file sizes in KiB instead of KB
	showFanControl: false,			// show fan controls
	showATXControl: false,			// show ATX control
	confirmStop: false,				// ask for confirmation when pressing Emergency STOP
	moveFeedrate: 6000				// in mm/min
};
var defaultSettings = settings;

/* Variables */

var isConnected = false, justConnected, isPrinting, isPaused;
var ajaxRequests = [], extendedStatusCounter, lastStatusResponse, lastSendGCode, lastGCodeFromInput;

var haveFileInfo, fileInfo;
var maxLayerTime, lastLayerPrintDuration;

var geometry, probeSlowDownValue, probeTriggerValue;
var heatedBed, numHeads, numExtruderDrives, toolMapping;
var coldExtrudeTemp, coldRetractTemp;

var recordedBedTemperatures, recordedHeadTemperatures, layerData;

var currentPage = "control", refreshTempChart = false, refreshPrintChart = false, waitingForPrintStart;

var currentGCodeDirectory, knownGCodeFiles, gcodeUpdateIndex, gcodeLastDirectory;
var knownMacroFiles, macroUpdateIndex;

var fanSliderActive, speedSliderActive, extrSliderActive;

function resetGuiData() {
	setPauseStatus(false);
	setPrintStatus(false);
	setGeometry("cartesian");
	
	justConnected = haveFileInfo = false;
	fileInfo = lastStatusResponse = undefined;
	lastSendGCode = "";
	lastGCodeFromInput = false;
	
	probeSlowDownValue = probeTriggerValue = undefined;
	heatedBed = 1;
	numHeads = 4;			// 4 Heads max
	numExtruderDrives = 5;	// 5 Extruder Drives max
	
	coldExtrudeTemp = 160;
	coldRetractTemp = 90;
	
	recordedBedTemperatures = layerData = [];
	recordedHeadTemperatures = [[], [], [], []];
	
	layerData = [];
	maxLayerTime = lastLayerPrintDuration = 0;
	
	toolMapping = undefined;
	
	knownGCodeFiles = knownMacroFiles = [];
	gcodeUpdateIndex = macroUpdateIndex = -1;
	currentGCodeDirectory = "/gcodes";
	
	waitingForPrintStart = fanSliderActive = speedSliderActive = extrSliderActive = false;
}

/* Connect / Disconnect */

function connect(password, firstConnect) {
	$(".btn-connect").removeClass("btn-info").addClass("btn-warning disabled").find("span:not(.glyphicon)").text("Connecting...");
	$(".btn-connect span.glyphicon").removeClass("glyphicon-log-in").addClass("glyphicon-transfer");
	$.ajax("rr_connect?password=" + password, {
		async: true,
		dataType: "json",
		error: function() {
 			showMessage("exclamation-sign", "Error", "Could not establish connection to the Duet firmware!<br/><br/>Please check your settings and try again.", "md");
			$("#modal_message").one("hide.bs.modal", function() {
				$(".btn-connect").removeClass("btn-warning disabled").addClass("btn-info").find("span:not(.glyphicon)").text("Connect");
				$(".btn-connect span.glyphicon").removeClass("glyphicon-transfer").addClass("glyphicon-log-in");
			});
		},
		success: function(data) {
			if (data.err == 2) {		// Looks like the firmware ran out of HTTP sessions
				showMessage("exclamation-sign", "Error", "Could not connect to Duet, because there are no more HTTP sessions available.", "md");
				$("#modal_message").one("hide.bs.modal", function() {
					$(".btn-connect").removeClass("btn-warning disabled").addClass("btn-info").find("span:not(.glyphicon)").text("Connect");
					$(".btn-connect span.glyphicon").removeClass("glyphicon-transfer").addClass("glyphicon-log-in");
				});
			}
			else if (firstConnect)
			{
				if (data.err == 0) {	// No password authentication required
					sessionPassword = password;
					postConnect();
				}
				else {					// We can connect, but we need a password first
					showPasswordPrompt();
				}
			}
			else {
				if (data.err == 0) {	// Connect successful
					sessionPassword = password;
					postConnect();
				} else {
					showMessage("exclamation-sign", "Error", "Invalid password!", "sm");
					$("#modal_message").one("hide.bs.modal", function() {
						$(".btn-connect").removeClass("btn-warning disabled").addClass("btn-info").find("span:not(.glyphicon)").text("Connect");
						$(".btn-connect span.glyphicon").removeClass("glyphicon-transfer").addClass("glyphicon-log-in");
					});
				}
			}
		}
	});
}

function postConnect() {
	log("success", "<strong>Connection established!</strong>");
	
	isConnected = justConnected = true;
	extendedStatusCounter = settings.extendedStatusInterval; // ask for extended status response on first poll
	
	updateStatus();
	if (currentPage == "files") {
		updateGCodeFiles();
	} else if (currentPage == "control" || currentPage == "macros") {
		updateMacroFiles();
	}
	
	$(".btn-connect").removeClass("btn-warning disabled").addClass("btn-success").find("span:not(.glyphicon)").text("Disconnect");
	$(".btn-connect span.glyphicon").removeClass("glyphicon-transfer").addClass("glyphicon-log-out");
	
	enableControls();
}

function disconnect() {
	if (isConnected) {
		log("danger", "<strong>Disconnected.</strong>");
	}
	isConnected = false;
	
	$(".btn-connect").removeClass("btn-success").addClass("btn-info").find("span:not(.glyphicon)").text("Connect");
	$(".btn-connect span.glyphicon").removeClass("glyphicon-log-out").addClass("glyphicon-log-in");
	
	$.ajax("rr_disconnect", { async: true, dataType: "json", global: false });
	ajaxRequests.forEach(function(request) {
		request.abort();
	});
	ajaxRequests = [];
	
	resetGuiData();
	resetGui();
	updateGui();
	
	disableControls();
}

/* AJAX */

function updateStatus() {
	var ajaxRequest = "rr_status";
	if (extendedStatusCounter >= settings.extendedStatusInterval) {
		extendedStatusCounter = 0;
		ajaxRequest += "?type=2";
	} else if (isPrinting) {
		ajaxRequest += "?type=3";
	} else {
		ajaxRequest += "?type=1";
	}
	extendedStatusCounter++;
	
	$.ajax(ajaxRequest, {
		async: true,
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
			
			// Printer Geometry
			if (status.hasOwnProperty("geometry")) {
				setGeometry(status.geometry);
			}
			
			// Machine Name
			if (status.hasOwnProperty("name")) {
				$(".navbar-brand").html(status.name);
			}
			
			// Probe Parameters (maybe hide probe info for type 0 someday?)
			if (status.hasOwnProperty("probe")) {
				probeTriggerValue = status.probe.threshold;
				probeSlowDownValue = probeTriggerValue * 0.9;	// see Platform::Stopped in dc42/zpl firmware forks
			}
			
			// Tool Mapping
			if (status.hasOwnProperty("tools")) {
				toolMapping = status.tools;
			}
			
			/*** Default status response ***/
			
			// Status
			var printing = false, paused = false;
			switch (status.status) {
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
					
				case 'I':	// Idle
					setStatusLabel("Idle", "default");
					break;
			}
			setPrintStatus(printing);
			setPauseStatus(paused);
			justConnected = false;
			
			// Set homed axes
			setAxesHomed(status.coords.axesHomed);
			
			// Update extruder drives
			if (status.coords.extr.length != numExtruderDrives) {
				numExtruderDrives = status.coords.extr.length;
				needGuiUpdate = true;
			}
			for(var i=1; i<=numExtruderDrives; i++) {
				$("#td_extr_" + i).html(status.coords.extr[i - 1].toFixed(1));
			}
			$("#td_extr_total").html(status.coords.extr.reduce(function(a, b) { return a + b; }));
			
			// XYZ coordinates
			if (geometry == "delta" && !status.coords.axesHomed[0]) {
				$("#td_x, #td_y, #td_z").html("n/a");
			} else {
				$("#td_x").html(status.coords.xyz[0].toFixed(2));
				$("#td_y").html(status.coords.xyz[1].toFixed(2));
				$("#td_z").html(status.coords.xyz[2].toFixed(2));
			}
			
			// Output
			if (status.hasOwnProperty("output")) {
				if (status.output.hasOwnProperty("beepDuration") && status.output.hasOwnProperty("beepFrequency")) {
					beep(status.output.beepFrequency, status.output.beepDuration);
				}
				if (status.output.hasOwnProperty("message")) {
					showMessage("envelope", "Message from Duet firmware", status.output.message, "md");
				}
			}
			
			// ATX Power
			setATXPower(status.params.atxPower);
			
			// Fan Control
			if (!fanSliderActive && (lastStatusResponse == undefined || $("#slider_fan_print").slider("getValue") != status.params.fanPercent)) {
				if ($("#override_fan").is(":checked") && settings.showFanControl) {
					sendGCode("M106 S" + ($("#slider_fan_print").slider("getValue") / 100.0));
				} else {
					$("#slider_fan_control").slider("setValue", status.params.fanPercent);
					$("#slider_fan_print").slider("setValue", status.params.fanPercent);
				}
			}
			
			// Speed Factor
			if (!speedSliderActive && (lastStatusResponse == undefined || $("#slider_speed").slider("getValue") != status.params.speedFactor)) {
				$("#slider_speed").slider("setValue", status.params.speedFactor);
			}
			if (!extrSliderActive) {
				for(var i=0; i<status.params.extrFactors.length; i++) {
					var extrSlider = $("#slider_extr_" + (i + 1));
					if (lastStatusResponse == undefined || extrSlider.slider("getValue") != status.params.extrFactors) {
						extrSlider.slider("setValue", status.params.extrFactors[i]);
					}
				}
			}
			
			// Fetch the latest G-Code response from the server
			if (lastStatusResponse == undefined || lastStatusResponse.seq != status.seq) {
				$.ajax("rr_reply", {
					async: true,
					dataType: "html",
					success: function(response) {
						response = response.trim();
						var logThis = (response != "");
						logThis |= (lastSendGCode != "" && (lastGCodeFromInput || settings.logSuccess));
						if (logThis) {
							var style = (response == "") ? "success" : "info";
							var content = (lastSendGCode != "") ? "<strong>" + lastSendGCode + "</strong><br/>" : "";
							if (response.match("^Error: ") != null) {
								style = "warning";
								content = "<strong>Error:</strong>" + response.substring(6).replace(/\n/g, "<br/>");
							} else {
								content += response.replace(/\n/g, "<br/>")
							}
							log(style, content);
							
							lastSendGCode = "";
							lastGCodeFromInput = false;
						}
					}
				});
			}
			
			// Sensors
			setProbeValue(status.sensors.probeValue, status.sensors.probeSecondary);
			$("#td_fanrpm").html(status.sensors.fanRPM);
			
			// Heated bed
			if (status.temps.hasOwnProperty("bed")) {
				setCurrentTemperature("bed", status.temps.bed.current);
				setTemperatureInput("bed", status.temps.bed.active, 1);
				setHeaterState("bed", status.temps.bed.state, status.currentTool);
			} else if (heatedBed) {
				heatedBed = 0;
				needGuiUpdate = true;
			}
			
			// Heads
			if (status.temps.heads.current.length != numHeads) {
				numHeads = status.temps.heads.current.length;
				needGuiUpdate = true;
			}
			for(var i=0; i<status.temps.heads.current.length; i++) {
				setCurrentTemperature(i + 1, status.temps.heads.current[i]);
				setTemperatureInput(i + 1, status.temps.heads.active[i], 1);
				setTemperatureInput(i + 1, status.temps.heads.standby[i], 0);
				setHeaterState(i + 1, status.temps.heads.state[i], status.currentTool);
			}
			recordHeaterTemperatures(status.temps.bed.current, status.temps.heads.current);
			
			/*** Print status response ***/
			
			if (isPrinting && !isPaused && status.hasOwnProperty("fractionPrinted")) {
				if (haveFileInfo) {
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
						progressText.push("Layer: " + status.currentLayer + " of " + numLayers);
					}
					
					// Try to calculate the progress by checking the filament usage
					if (fileInfo.filament.length > 0) {
						var totalFileFilament = (fileInfo.filament.reduce(function(a, b) { return a + b; })).toFixed(1);
						var totalRawFilament = (status.extrRaw.reduce(function(a, b) { return a + b; })).toFixed(1);
						progress = ((totalRawFilament / totalFileFilament) * 100.0).toFixed(1);
						
						progressText.push("Filament Usage: " + totalRawFilament + "mm of " + totalFileFilament + "mm");
						if (true) { // TODO: make this optional
							progressText[progressText.length - 1] += " (" + (totalFileFilament - totalRawFilament).toFixed(1) + "mm remaining)";
						}
					}
					// Otherwise by comparing the current Z position to the total height
					else if (fileInfo.height > 0) {
						progress = ((status.coords.xyz[2] / fileInfo.height) * 100.0).toFixed(1);
						if (progress > 100) {
							progress = 100;
						}
					}
					// Use the file-based progress as a fallback option
					else {
						progress = status.fractionPrinted;
						if (progress < 0) {
							progress = 100;
						}
					}
					
					// Ensure we stay within reasonable boundaries
					if (progress < 0) {
						progress = 0;
					} else if (progress > 100) {
						progress = 100;
					}
					
					// Update info texts
					if (progressText.length > 0) {
						setProgress(progress, "Printing " + fileInfo.fileName + ", " + progress + "% Complete", progressText.reduce(function(a, b) { return a + ", " + b; }));
					} else {
						setProgress(progress, "Printing " + fileInfo.fileName + ", " + progress + "% Complete", "");
					}
				} else {
					if (status.fractionPrinted > 0) {
						setProgress(status.fractionPrinted, status.fractionPrinted + "% Complete", "");
					} else {
						setProgress(100, "100% Complete", "");
					}
				}
				
				// Print Chart
				if (status.currentLayer > 1) {
					var realPrintTime = (status.printDuration - status.warmUpDuration - status.firstLayerDuration);
					if (layerData.length == 0) {
						addLayerData(status.firstLayerDuration);
						if (status.currentLayer > 2) {						// add avg values on reconnect
							realPrintTime -= status.currentLayerTime;
							for(var layer=2; layer<status.currentLayer; layer++) {
								addLayerData(realPrintTime / status.currentLayer);
							}
						}
						
						if (status.currentLayer == 2) {
							lastLayerPrintDuration = 0;
						} else {
							lastLayerPrintDuration = realPrintTime;
						}
					} else if (status.currentLayer > layerData.length) {	// there are two entries for the first layer
						addLayerData(realPrintTime - lastLayerPrintDuration);
						lastLayerPrintDuration = realPrintTime;
					}
				} else if (layerData.length > 0) {
					layerData = [];
					maxLayerTime = lastLayerPrintDuration = 0;
					drawPrintChart();
				}
				
				// Print Estimations
				if (haveFileInfo && fileInfo.filament.length > 0) {
					setTimeLeft("filament", status.timesLeft.filament);
				} else {
					setTimeLeft("filament", undefined);
				}
				setTimeLeft("file", status.timesLeft.file);
				if (haveFileInfo && fileInfo.height > 0) {
					setTimeLeft("layer", status.timesLeft.layer);
				} else {
					setTimeLeft("layer", undefined);
				}
				
				// First Layer Duration
				if (status.firstLayerDuration > 0) {
					$("#td_fl_time").html(convertSeconds(status.firstLayerDuration));
				} else if (status.warmUpDuration > 0) {
					$("#td_fl_time").html(convertSeconds(status.printDuration - status.warmUpDuration));
				} else {
					$("#td_fl_time").html("n/a");
				}
				
				// First Layer Height
				if (status.firstLayerHeight > 0) {
					$("#td_fl_height").html(status.firstLayerHeight + " mm");
				} else {
					$("#td_fl_height").html("n/a");
				}
				
				// Current Layer Time
				if (status.currentLayer > 1) {
					if (status.currentLayerTime > 0) {
						$("#td_curr_layer").html(convertSeconds(status.currentLayerTime));
					} else {
						$("#td_curr_layer").html("n/a");
					}
					$(".col-layertime").removeClass("hidden");
				}
				
				// Print Duration
				if (status.printDuration > 0) {
					$("#td_print_duration").html(convertSeconds(status.printDuration));
				} else {
					$("#td_print_duration").html("n/a");
				}
				
				// Warm-Up Time
				if (status.warmUpDuration > 0 || status.firstLayerHeight > 0) {
					if (status.warmUpDuration == 0) {
						$("#td_warmup_time").html("none");
					} else {
						$("#td_warmup_time").html(convertSeconds(status.warmUpDuration));
					}
				} else if (status.printDuration > 0 && haveFileInfo && fileInfo.filament.length) {
					$("#td_warmup_time").html(convertSeconds(status.printDuration));
				} else {
					$("#td_warmup_time").html("n/a");
				}
			}
			
			// Update the GUI when we have processed the whole status response
			if (needGuiUpdate) {
				updateGui();
			}
			drawTemperatureChart();
			
			// Set timer for next status update
			if (status.status != 'H') {
				setTimeout(updateStatus, settings.updateInterval);
			} else {
				log("danger", "<strong>Emergency Stop!</strong>");
				setTimeout(function() {
					connect(sessionPassword, false);
				}, settings.haltedReconnectDelay);
			}
			
			// Save the last status response
			lastStatusResponse = status;
		}
	});
}

function updateGCodeFiles() {
	if (!isConnected) {
		gcodeUpdateIndex = -1;
		$(".span-refresh-files").addClass("hidden");
		clearGCodeDirectory();
		clearGCodeFiles();
		return;
	}
	
	if (gcodeUpdateIndex == -1) {
		gcodeUpdateIndex = 0;
		gcodeLastDirectory = undefined;
		clearGCodeFiles();
		
		$.ajax("rr_files?dir=" + currentGCodeDirectory, {
			async: true,
			dataType: "json",
			success: function(response) {
				if (isConnected) {
					knownGCodeFiles = response.files.sort();
					for(var i=0; i<knownGCodeFiles.length; i++) {
						addGCodeFile(knownGCodeFiles[i]);
					}
					
					if (knownGCodeFiles.length == 0) {
						$(".span-refresh-files").removeClass("hidden");
					} else {
						updateGCodeFiles();
					}
				}
			}
		});
	} else if (gcodeUpdateIndex < knownGCodeFiles.length) {
		var row = $("#table_gcode_files tr[data-item='" + knownGCodeFiles[gcodeUpdateIndex] + "']");
		$.ajax("rr_fileinfo?name=" + currentGCodeDirectory + "/" + encodeURIComponent(knownGCodeFiles[gcodeUpdateIndex]), {
			async: true,
			dataType: "json",
			row: row,
			success: function(response) {
				if (!isConnected || this.row == undefined) {
					return;
				}
				gcodeUpdateIndex++;
				
				if (response.err == 0) {	// File
					setGCodeFileItem(this.row, response.size, response.height, response.layerHeight, response.filament, response.generatedBy);
				} else {					// Directory
					setGCodeDirectoryItem(this.row);
				}
				
				if (gcodeUpdateIndex >= knownGCodeFiles.length) {
					$(".span-refresh-files").removeClass("hidden");
				} else if (currentPage == "files") {
					updateGCodeFiles();
				}
			}
		});
	}
}
function updateMacroFiles() {
	if (!isConnected) {
		macroUpdateIndex = -1;
		$(".span-refresh-macros").addClass("hidden");
		clearMacroFiles();
		return;
	}
	
	if (macroUpdateIndex == -1) {
		macroUpdateIndex = invalidMacros = 0;
		clearMacroFiles();
		
		$.ajax("rr_files?dir=/macros", {
			async: true,
			dataType: "json",
			success: function(response) {
				if (isConnected) {
					knownMacroFiles = response.files.sort();
					for(var i=0; i<knownMacroFiles.length; i++) {
						addMacroFile(knownMacroFiles[i]);
					}
					
					if (knownMacroFiles.length == 0) {
						if (currentPage == "macros") {
							$(".span-refresh-macros").removeClass("hidden");
						}
					} else {
						updateMacroFiles();
					}
				}
			}
		});
	} else if (macroUpdateIndex < knownMacroFiles.length) {
		var row = $("#table_macro_files tr[data-macro='" + knownMacroFiles[macroUpdateIndex] + "']");
		$.ajax("rr_fileinfo?name=/macros/" + encodeURIComponent(knownMacroFiles[macroUpdateIndex]), {
			async: true,
			dataType: "json",
			row: row,
			success: function(response) {
				if (!isConnected || this.row == undefined) {
					return;
				}
				macroUpdateIndex++;
				
				if (response.err == 0) {	// File
					setMacroFileItem(this.row, response.size);
				} else {
					row.remove();			// Not a file, purge it
					invalidMacros++;
				}
				
				if (macroUpdateIndex >= knownMacroFiles.length) {
					if (currentPage == "macros") {
						$(".span-refresh-macros").removeClass("hidden");
					} else if (macroUpdateIndex - invalidMacros == 0) {
						clearMacroFiles();
					}
				} else if (currentPage == "control" || currentPage == "macros") {
					updateMacroFiles();
				}
			}
		});
	}
}

function sendGCode(gcode, fromInput) {
	lastSendGCode = gcode;
	lastGCodeFromInput = (fromInput != undefined && fromInput);
	
	// Although rr_gcode gives us a JSON response, it doesn't provide any results.
	// We only need to worry about an AJAX error event.
	$.ajax("rr_gcode?gcode=" + encodeURIComponent(gcode), {
		async: true,
		dataType: "json"
	});
}

/* AJAX Events */

$(document).ajaxSend(function(event, jqxhr, settings) {
	settings.timeout = settings.maxRequestTime;
	ajaxRequests.push(jqxhr);
});

$(document).ajaxComplete(function(event, jqxhr, settings) {
	ajaxRequests = $.grep(ajaxRequests, function(item) { item != jqxhr; });
});

$(document).ajaxError(function(event, jqxhr, settings, thrownError) {
	if (isConnected) {
		var msg = "An AJAX error was reported, so the current session has been terminated.<br/><br/>Please check if your printer is still on and try to connect again.";
		if (thrownError != "") {
			msg += "<br/></br>Error reason: " + thrownError;
		}
		showMessage("warning-sign", "Communication Error", msg, "md");
		
		disconnect();
	}
});

/* Settings */

function loadSettings() {
    $.cookie.JSON = true;
    
	var newSettings = $.cookie("settings");
	if (newSettings != undefined) {
		settings = JSON.parse(newSettings);
		applySettings();
	}
}

function saveSettings() {
	// Appearance and Behavior
	settings.halfZMovements = $("#half_z").is(":checked");
	settings.logSuccess = $("#log_success").is(":checked");
	settings.useKiB = $("#use_kib").is(":checked");
	settings.showFanControl = $("#fan_sliders").is(":checked");
	settings.showATXControl = $("#show_atx").is(":checked");
	settings.confirmStop = $("#confirm_stop").is(":checked");
	settings.moveFeedrate = $("#move_feedrate").val();
	
	// UI Timing
	settings.updateInterval = $("#update_interval").val();
	settings.extendedStatusInterval = $("#extended_status_interval").val();
	settings.haltedReconnectDelay = $("#reconnect_delay").val();
	settings.maxRequestTime = $("#ajax_timeout").val();
	
	// Save Settings
	$.cookie("settings", JSON.stringify(settings), { expires: 999999 });
}

function applySettings() {
	/* Apply UI settings */
	
	// Half Z Movements
	var decreaseChildren = $("#td_decrease_z a");
	var decreaseVal = (settings.halfZMovements) ? 50 : 100;
	decreaseChildren.each(function(index) {
		decreaseChildren.eq(index).data("z", decreaseVal * (-1)).contents().last().replaceWith(" Z-" + decreaseVal);
		decreaseVal /= 10;
	});
	var increaseChildren = $("#td_increase_z a");
	var increaseVal = (settings.halfZMovements) ? 0.05 : 0.1;
	increaseChildren.each(function(index) {
		increaseChildren.eq(index).data("z", increaseVal).contents().first().replaceWith("Z+" + increaseVal + " ");
		increaseVal *= 10;
	});
	
	// Show/Hide Fan Control
	if (settings.showFanControl) {
		$(".fan-control").removeClass("hidden");
	} else {
		$(".fan-control").addClass("hidden");
	}
	
	// Show/Hide ATX Power
	if (settings.showATXControl) {
		$(".atx-control").removeClass("hidden");
	} else {
		$(".atx-control").addClass("hidden");
	}
	
	// Possibly hide entire misc control panel
	if (!settings.showFanControl && !settings.showATXControl) {
		$("#panel_control_misc").addClass("hidden");
	} else {
		$("#panel_control_misc").removeClass("hidden");
	}
	
	/* Set values on the Settings page */
	
	// Appearance and Behavior
	$("#half_z").prop("checked", settings.halfZMovements);
	$("#log_success").prop("checked", settings.logSuccess);
	$("#use_kib").prop("checked", settings.useKiB);
	$("#fan_sliders").prop("checked", settings.showFanControl);
	$("#show_atx").prop("checked", settings.showATXControl);
	$("#confirm_stop").prop("checked", settings.confirmStop);
	$("#move_feedrate").val(settings.moveFeedrate);
	
	// UI Timing
	$("#update_interval").val(settings.updateInterval);
	$("#extended_status_interval").val(settings.extendedStatusInterval);
	$("#reconnect_delay").val(settings.haltedReconnectDelay);
	$("#ajax_timeout").val(settings.maxRequestTime);
}

/* GUI */

$(document).ready(function() {
	resetGuiData();
	updateGui();
	
	loadSettings();
	$("#web_version").append(", JS: " + jsVersion.toFixed(2));
	applySettings();
	
	log("info", "<strong>Page Load complete!</strong>");
});

function enableControls() {
	$("nav input, #div_heaters input, #main_content input").prop("disabled", false);			// Generic inputs
	
	$(".btn-emergency-stop, .gcode-input button[type=submit], .gcode").removeClass("disabled");	// Navbar
	$(".bed-temp, .gcode, .head-temp").removeClass("disabled");									// List items
	
	$("#mobile_home_buttons button, #btn_homeall, #table_move_head a").removeClass("disabled");	// Move buttons
	$("#panel_extrude label.btn, #panel_extrude button").removeClass("disabled");				// Extruder Control
	$("#panel_control_misc label.btn").removeClass("disabled");									// ATX Power
	$("#slider_fan_control").slider("enable");													// Fan Control
	
	$("#page_print .checkbox").removeClass("disabled");											// Print Control
	$("#slider_fan_print").slider("enable");													// Fan Control
	$("#slider_speed").slider("enable");														// Speed Factor
	for(var extr=1; extr<=5; extr++) {
		$("#slider_extr_" + extr).slider("enable");												// Extrusion Factors
	}
	
	$(".row-actions").removeClass("hidden");													// G-Code/Macro Files
}

function disableControls() {
	$("nav input, #div_heaters input, #main_content input").prop("disabled", true);				// Generic inputs
	
	$(".btn-emergency-stop, .gcode-input button[type=submit], .gcode").addClass("disabled");	// Navbar
	$(".bed-temp, .gcode, .head-temp").addClass("disabled");									// List items
	
	$("#mobile_home_buttons button, #btn_homeall, #table_move_head a").addClass("disabled");	// Move buttons
	$("#panel_extrude label.btn, #panel_extrude button").addClass("disabled");					// Extruder Control
	$("#panel_control_misc label.btn").addClass("disabled");									// ATX Power
	$("#slider_fan_control").slider("disable");													// Fan Control
	
	$("#btn_pause, #page_print .checkbox").addClass("disabled");								// Print Control
	$("#slider_fan_print").slider("disable");													// Fan Control
	$("#slider_speed").slider("disable");														// Speed Factor
	for(var extr=1; extr<=5; extr++) {
		$("#slider_extr_" + extr).slider("disable");											// Extrusion Factors
	}
	
	$(".row-actions").addClass("hidden");														// G-Code/Macro Files
}

function updateGui() {
	// Visibility for Heater Temperatures
	
	if (heatedBed) {	// Heated Bed
		$("#tr_bed").removeClass("hidden");
	} else {
		$("#tr_bed").addClass("hidden");
	}
	for(var i=1; i<=4; i++) {
		if (i <= numHeads) {
			$("#tr_head_" + i).removeClass("hidden");
		} else {
			$("#tr_head_" + i).addClass("hidden");
		}
	}
	
	// Visibility for Extruder Drive columns
	
	for(var i=1; i<=5; i++) {
		if (i <= numExtruderDrives) {
			$(".extr-" + i).removeClass("hidden");
			$("#slider_extr_" + i).slider("relayout");
		} else {
			$(".extr-" + i).addClass("hidden");
		}
	}
	if (numExtruderDrives > 0) {
		$("#row_status_2").removeClass("hidden");
	} else {
		$("#row_status_2").addClass("hidden");
	}
	
	// Do some rearrangement for the panels if we have less than or exactly three extruder drives
	
	if (numExtruderDrives <= 3) {
		$(".div-head-temp").removeClass("hidden-sm");
		$("#col_extr_totals, #td_extr_total").addClass("hidden");
		for(var i=1; i<=3; i++) {
			$("th.extr-" + i).html("Drive " + i);
			$("#row_status_2 .extr-" + i).removeClass("hidden-md");
		}
		$("#div_heaters").removeClass("col-sm-5").addClass("col-sm-6");
		$("#div_temp_chart").removeClass("col-lg-3").addClass("col-lg-5");
		$("#div_status").removeClass("col-sm-7 col-lg-5").addClass("col-sm-6 col-lg-3");
	} else {
		$(".div-head-temp").addClass("hidden-sm");
		$("#col_extr_totals, #td_extr_total").removeClass("hidden");
		for(var i=1; i<=3; i++) {
			$("th.extr-" + i).html("D" + i);
			$("#row_status_2 .extr-" + i).addClass("hidden-md");
		}
		$("#div_heaters").removeClass("col-sm-6").addClass("col-sm-5");
		$("#div_temp_chart").removeClass("col-lg-5").addClass("col-lg-3");
		$("#div_status").removeClass("col-sm-6 col-lg-3").addClass("col-sm-7 col-lg-5");
	}
	
	// Charts
	
	resizeCharts();
	drawTemperatureChart();
	drawPrintChart();
}

function resetGui() {
	// Auto-Complete items
	clearHeadTemperatures();
	clearBedTemperatures();
	
	// Charts
	drawTemperatureChart();
	drawPrintChart();
	
	// Navbar
	$(".navbar-brand").html("Duet Web Control");
	setStatusLabel("Disconnected", "default");
	
	// Heater Temperatures
	$("#table_heaters tr > th:first-child > span").text("");
	setCurrentTemperature("bed",  undefined);
	setTemperatureInput("bed", 0, 1);
	for(var i=1; i<=4; i++) {
		setCurrentTemperature(i, undefined);
		setTemperatureInput(i, 0, 1);
		setTemperatureInput(i, 0, 0);
	}
	
	// Status fields
	$("#td_x, #td_y, #td_z").text("n/a");
	for(var i=1; i<=numExtruderDrives; i++) {
		$("#td_extr_" + i).text("n/a");
	}
	$("#td_extr_total").text("n/a");
	setProbeValue(-1, undefined);
	$("#td_fanrpm").text("n/a");
	
	// Control page
	setAxesHomed([1,1,1]);
	setATXPower(false);
	$('#slider_fan_control').slider("setValue", 35);
	
	// Print Status
	$(".row-progress, .col-layertime").addClass("hidden");
	setProgress(100, "", "");
	$("#override_fan, #auto_sleep").prop("checked", false);
	$('#slider_fan_print').slider("setValue", 35);
	$("#page_print dd, #panel_print_info table td, #table_estimations td").html("n/a");
	$('#slider_speed').slider("setValue", 100);
	for(var extr=1; extr<=5; extr++) {
		$("#slider_extr_" + extr).slider("setValue", 100);
	}
	
	// G-Code Console is not cleared automatically
	
	// G-Code Files
	updateGCodeFiles();
	
	// Macro Files
	updateMacroFiles();
	
	// Settings
	$("#firmware_name #firmware_version").html("n/a");
}

/* Dynamic GUI Events */

$("body").on("click", ".bed-temp", function(e) {
	sendGCode("M140 S" + $(this).data("temp"));
	e.preventDefault();
});

$("body").on("click", ".btn-macro", function(e) {
	sendGCode("M98 P" + $(this).data("macro"));
	e.preventDefault();
});

$("body").on("click", ".btn-print-file, .gcode-file", function(e) {
	var file = $(this).parents("tr").data("file");
	showConfirmationDialog("Start Print", "Do you want to print <strong>" + file + "</strong>?", function() {
		waitingForPrintStart = true;
		if (currentGCodeDirectory == "/gcodes") {
			sendGCode("M32 " + file);
		} else {
			sendGCode("M32 " + currentGCodeDirectory.substring(8) + "/" + file);
		}
	});
	e.preventDefault();
});

$("body").on("click", ".btn-delete-file", function(e) {
	var row = $(this).parents("tr");
	var file = row.data("file");
	showConfirmationDialog("Delete File", "Are you sure you want to delete <strong>" + file + "</strong>?", function() {
		$.ajax("rr_delete?name=" + encodeURIComponent(currentGCodeDirectory + "/" + file), {
			async: true,
			dataType: "json",
			row: row,
			file: file,
			success: function(response) {
				if (response.err == 0) {
					this.row.remove();
					if ($("#table_gcode_files tbody").children().length == 0) {
						gcodeUpdateIndex = -1;
						updateGCodeFiles();
					}
				} else {
					showMessage("warning-sign", "Deletion failed", "<strong>Warning:</strong> Could not delete file <strong>" + this.file + "</strong>!", "md");
				}
			}
		});
	});
	e.preventDefault();
});

$("body").on("click", ".btn-delete-directory", function(e) {
	$.ajax("rr_delete?name=" + encodeURIComponent(currentGCodeDirectory + "/" + $(this).parents("tr").data("directory")), {
		async: true,
		dataType: "json",
		row: $(this).parents("tr"),
		directory: $(this).parents("tr").data("directory"),
		success: function(response) {
			if (response.err == 0) {
				this.row.remove();
				if ($("#table_gcode_files tbody").children().length == 0) {
					gcodeUpdateIndex = -1;
					updateGCodeFiles();
				}
			} else {
				showMessage("warning-sign", "Deletion failed", "<strong>Warning:</strong> Could not delete directory <strong>" + this.directory + "</strong>!<br/><br/>Perhaps it isn't empty?", "md");
			}
		}
	});
	e.preventDefault();
});

$("body").on("click", ".btn-delete-macro", function(e) {
	$.ajax("rr_delete?name=/macros/" + $(this).parents("tr").data("macro"), {
		async: true,
		dataType: "json",
		macro: $(this).parents("tr").data("macro"),
		row: $(this).parents("tr"),
		success: function(response) {
			if (response.err == 0) {
				this.row.remove();
				if ($("#table_macro_files tbody").children().length == 0) {
					macroUpdateIndex = -1;
					updateMacroFiles();
				}
			} else {
				showMessage("warning-sign", "Deletion failed", "<strong>Warning:</strong> Could not delete macro <strong>" + this.macro + "</strong>!", "md");
			}
		}
	});
	e.preventDefault();
});

$("body").on("click", ".btn-run-macro", function(e) {
	sendGCode("M98 P/macros/" + $(this).parents("tr").data("macro"));
	e.preventDefault();
});

$("body").on("click", ".gcode", function(e) {
	if (isConnected) {
		sendGCode($(this).data("gcode"));
	}
	e.preventDefault();
});

$("body").on("click", ".gcode-directory", function(e) {
	setGCodeDirectory(currentGCodeDirectory + "/" + $(this).parents("tr").data("directory"));
	gcodeUpdateIndex = -1;
	updateGCodeFiles();
	e.preventDefault();
});

$("body").on("click", ".head-temp", function(e) {
	var inputElement = $(this).parents("div.input-group").find("input");
	var activeOrStandby = (inputElement.prop("id").match("active$")) ? "S" : "R";
	var heater = inputElement.prop("id").match("_h(.)_")[1];
	var temperature = $(this).data("temp");
	
	getToolsByHeater(heater).forEach(function(tool) {
		sendGCode("G10 P" + tool + " " + activeOrStandby + temperature);
	});
	e.preventDefault();
});

$("body").on("click", "#ol_gcode_directory a", function(e) {
	setGCodeDirectory($(this).data("directory"));
	gcodeUpdateIndex = -1;
	updateGCodeFiles();
	e.preventDefault();
});

$("body").on("click", ".tool", function(e) {
	sendGCode("T" + $(this).data("tool"));
	e.preventDefault();
});

$("body").on("hidden.bs.popover", function() {
	$(this).popover("destroy");
});

/* Static GUI Events */

$("#btn_cancel").click(function() {
	sendGCode("M0");	// Stop / Cancel Print
	$(this).addClass("disabled");
});

$(".btn-connect").click(function() {
	if (!isConnected) {
		// Attempt to connect with the last-known password first
		connect(sessionPassword, true);
	} else {
		disconnect();
	}
});

$(".btn-emergency-stop").click(function() {
	if (settings.confirmStop) {
		showConfirmationDialog("Emergency STOP", "This will turn off everything and perform a software reset.<br/><br/>Are you REALLY sure you want to do this?", function() {
			sendGCode("M112\nM999");
		});
	} else {
		sendGCode("M112\nM999");
	}
});

$("#btn_clear_log").click(function(e) {
	$("#console_log").html("");
	log("info", "<strong>Message Log cleared!</strong>");
	e.preventDefault();
});

// TODO: deal with mixing drives
$("#btn_extrude").click(function(e) {
	var feedrate = $("#panel_extrude input[name=feedrate]:checked").val() * 60;
	var amount = $("#panel_extrude input[name=feed]").val();
	sendGCode("M120\nM83\nG1 E" + amount + " F" + feedrate + "\nM121");
});
$("#btn_retract").click(function(e) {
	var feedrate = $("#panel_extrude input[name=feedrate]:checked").val() * 60;
	var amount = $("#panel_extrude input[name=feed]").val();
	sendGCode("M120\nM83\nG1 E-" + amount + " F" + feedrate + "\nM121");
});

$(".btn-hide-info").click(function() {
	if ($(this).hasClass("active")) {
		$("#row_info").addClass("hidden-xs hidden-sm");
		setTimeout(function() {
			$(".btn-hide-info").removeClass("active");
		}, 100);
	} else {
		$("#row_info").removeClass("hidden-xs hidden-sm");
		setTimeout(function() {
			$(".btn-hide-info").addClass("active");
		}, 100);
	}
	$(this).blur();
});

$(".btn-home-x").resize(function() {
	if (!$(this).hasClass("hidden")) {
		var width = $(this).parent().width();
		if (width > 0) {
			$("#btn_homeall").css("width", width);
		}
	}
}).resize();

$("#mobile_home_buttons button, #btn_homeall, #table_move_head a").click(function(e) {
	$this = $(this);
	if ($this.data("home") != undefined) {
		if ($this.data("home") == "all") {
			sendGCode("G28");
		} else {
			sendGCode("G28 " + $this.data("home"));
		}
	} else {
		var moveString = "M120\nG91\nG1";
		if ($this.data("x") != undefined) {
			moveString += " X" + $this.data("x");
		}
		if ($this.data("y") != undefined) {
			moveString += " Y" + $this.data("y");
		}
		if ($this.data("z") != undefined) {
			moveString += " Z" + $this.data("z");
		}
		moveString += " F" + settings.moveFeedrate + "\nM121";
		sendGCode(moveString);
	}
	e.preventDefault();
});

$("#btn_new_directory").click(function() {
	showTextInput("New directory", "Please enter a name:", function(value) {
		$.ajax("rr_mkdir?dir=" + currentGCodeDirectory + "/" + value, {
			async: true,
			dataType: "json",
			success: function(response) {
				if (response.err == 0) {
					gcodeUpdateIndex = -1;
					updateGCodeFiles();
				} else {
					showMessage("warning-sign", "Error", "Could not create directory!", "sm");
				}
			}
		});
	});
});

$("#btn_pause").click(function() {
	if (isPaused) {
		sendGCode("M24");	// Resume
	} else if (isPrinting) {
		sendGCode("M25");	// Pause
	}
	$(this).addClass("disabled");
});

$("#btn_reset_settings").click(function(e) {
	showConfirmationDialog("Reset Settings", "Are you sure you want to revert to Factory Settings?", function() {
		settings = defaultSettings;
		saveSettings();
		applySettings();
	});
	e.preventDefault();
});

$(".gcode-input").submit(function(e) {
	if (isConnected) {
		sendGCode($(this).find("input").val(), true);
		$(this).find("input").select();
	}
	e.preventDefault();
});

// Make the auto-complete dropdown items look proper.
// This should be replaced by proper CSS someday, but
// for now we only check which elements may float around.
$(".div-gcodes").bind("shown.bs.dropdown", function() {
	var maxWidth = 0;
	$(this).find("ul > li > a").each(function() {
		var rowWidth = 0;
		$(this).find("span").each(function() {
			rowWidth += $(this).width();
		});
		
		if (rowWidth > maxWidth) {
			maxWidth = rowWidth;
		}
	});
	
	if (maxWidth > 0) {
		$(this).find("ul > li > a").each(function() {
			var rowWidth = 0;
			$(this).find("span").each(function() {
				rowWidth += $(this).width();
			});
			
			if (rowWidth < maxWidth) {
				$(this).addClass("gcode-float");
			}
		});
	}
});

$("#frm_settings").submit(function(e) {
	saveSettings();
	applySettings();
	e.preventDefault();
});

$("input[type='number']").focus(function() {
	var input = $(this);
	setTimeout(function() {
		input.select();
	}, 10);
});

$("#input_temp_bed").keydown(function(e) {
	var enterKeyPressed = (e.which == 13);
	enterKeyPressed |= (e.which == 9 && window.matchMedia('(max-width: 991px)').matches); // need this for Android
	if (isConnected && enterKeyPressed) {
		sendGCode("M140 S" + $(this).val());
		$(this).select();
		
		e.preventDefault();
	}
});

$("input[id^='input_temp_h']").keydown(function(e) {
	var enterKeyPressed = (e.which == 13);
	enterKeyPressed |= (e.which == 9 && window.matchMedia('(max-width: 991px)').matches); // need this for Android
	if (isConnected && enterKeyPressed) {
		var activeOrStandby = ($(this).prop("id").match("active$")) ? "S" : "R";
		var heater = $(this).prop("id").match("_h(.)_")[1];
		var temperature = $(this).val();
		
		getToolsByHeater(heater).forEach(function(toolNumber) {
			sendGCode("G10 P" + toolNumber + " " + activeOrStandby + temperature);
		});
		$(this).select();
		
		e.preventDefault();
	}
});

$(".navbar-brand").click(function(e) { e.preventDefault(); });

$(".navlink").click(function(e) {
	var target = $(this).data("target");
	showPage(target);
	e.preventDefault();
});

$("#panel_control_misc label.btn").click(function() {
	if ($(this).find("input").val() == 1) {		// ATX on
		sendGCode("M80");
	} else {									// ATX off
		showConfirmationDialog("ATX Power", "Do you really want to turn off ATX power?<br/><br/>This will turn off all drives, heaters and fans.", function() {
			sendGCode("M81");
		});
	}
});

$("#panel_extrude label.btn").click(function() {
	$(this).parent().find("label.btn").removeClass("btn-primary").addClass("btn-default");
	$(this).removeClass("btn-default").addClass("btn-primary");
});

$(".span-refresh-files").click(function() {
	gcodeUpdateIndex = -1;
	updateGCodeFiles();
	$(".span-refresh-files").addClass("hidden");
});

$(".span-refresh-macros").click(function() {
	macroUpdateIndex = -1;
	updateMacroFiles();
	$(".span-refresh-macros").addClass("hidden");
});

$(".panel-chart").resize(function() {
	resizeCharts();
});

$("#table_heaters tr > th:first-child > a").click(function(e) {
	if (isConnected) {
		var heater = $(this).parents("tr").index();
		var heaterState = lastStatusResponse.temps.heads.state[heater - 1];
		if (heaterState == 3) {
			showMessage("exclamation-sign", "Heater Fault", "<strong>Error:</strong> A heater fault has occured on this particular heater.<br/><br/>Please turn off your machine and check your wiring for loose connections.", "md");
		} else {
			var tools = getToolsByHeater(heater), hasToolSelected = false;
			tools.forEach(function(tool) {
				if (tool == lastStatusResponse.currentTool) {
					hasToolSelected = true;
				}
			});
			
			if (hasToolSelected) {
				sendGCode("T0");
				$(this).blur();
			} else if (tools.length == 1) {
				sendGCode("T" + tools[0]);
				$(this).blur();
			} else if (tools.length > 0) {
				if ($(this).parent().children("div.popover").length > 0) {
					$(this).blur();
				} else {
					var content = '<div class="btn-group-vertical btn-group-vertical-justified">';
					tools.forEach(function(toolNumber) {
						content += '<div class="btn-group"><a href="#" class="btn btn-default btn-sm tool" data-tool="' + toolNumber + '">T' + toolNumber + '</a></div>';
					});
					content += '</div>';
					
					$(this).popover({ 
						content: content,
						html: true,
						title: "Select Tool",
						trigger: "manual",
						placement: "bottom",
					});
					$(this).popover("show");
				}
			}
		}
	}
	e.preventDefault();
});

$("#table_heaters tr > th:first-child > a").blur(function() {
	$(this).popover("hide");
});

/* Temperature charts */

function addLayerData(lastLayerTime) {
	if (layerData.length == 0) {
		layerData.push([0, lastLayerTime]);
		layerData.push([1, lastLayerTime]);
	} else {
		layerData.push([layerData.length, lastLayerTime]);
	}
	
	if (lastLayerTime > maxLayerTime) {
		maxLayerTime = lastLayerTime;
	}
	
	drawPrintChart();
}

function drawTemperatureChart()
{
	// Only draw the chart if it's possible
	if ($("#chart_temp").width() === 0) {
		refreshTempChart = true;
		return;
	}
	
	// Prepare the data
	var preparedBedTemps = [];
	for(var i=0; i<recordedBedTemperatures.length; i++) {
		preparedBedTemps.push([i, recordedBedTemperatures[i]]);
	}
	var preparedHeadTemps = [[], [], [], []], heaterSamples;
	for(var head=0; head<recordedHeadTemperatures.length; head++) {
		heaterSamples = recordedHeadTemperatures[head];
		for(var k=0; k<heaterSamples.length; k++) {
			preparedHeadTemps[head].push([k, heaterSamples[k]]);
		}
	}
	
	// Draw it
	if (tempChart == undefined) {
		tempChart = $.plot("#chart_temp", [preparedBedTemps, preparedHeadTemps[0], preparedHeadTemps[1], preparedHeadTemps[2], preparedHeadTemps[3]], tempChartOptions);
	} else {
		tempChart.setData([preparedBedTemps, preparedHeadTemps[0], preparedHeadTemps[1], preparedHeadTemps[2], preparedHeadTemps[3]]);
		tempChart.setupGrid();
		tempChart.draw();
	}
	
	refreshTempChart = false;
}

function drawPrintChart() {
	// Only draw the chart if it's possible
	if ($("#chart_print").width() === 0) {
		refreshPrintChart = true;
		return;
	}
	
	// Find absolute maximum values for the X axis
	var maxX = 100, maxPanX = 100;
	if (layerData.length < 21) {
		maxX = maxPanX = 20;
	} else if (layerData.length < 100) {
		maxX = maxPanX = layerData.length - 1;
	} else {
		maxPanX = layerData.length - 1;
	}
	printChartOptions.xaxis.max = maxX;
	printChartOptions.xaxis.panRange = [0, maxPanX];
	printChartOptions.xaxis.zoomRange = [50, maxPanX];
	printChartOptions.yaxis.panRange = [0, (maxLayerTime < 60) ? 60 : maxLayerTime];
	printChartOptions.yaxis.zoomRange = [60, (maxLayerTime < 60) ? 60 : maxLayerTime];
	
	// Find max visible value for Y axis
	var maxVisibleValue = 30;
	if (layerData.length > 3) {
		for(var i=(layerData.length > 102) ? layerData.length - 100 : 2; i<layerData.length; i++) {
			if (maxVisibleValue < layerData[i][1]) {
				maxVisibleValue = layerData[i][1];
			}
		}
	} else if (layerData.length > 0) {
		maxVisibleValue = layerData[0][1];
	} else {
		maxVisibleValue = 60;
	}
	printChartOptions.yaxis.max = (layerData.length > 3 && layerData.length < 101) ? maxVisibleValue * 1.1 : maxVisibleValue;
	
	// Update chart and pan to the right
	printChart = $.plot("#chart_print", [layerData], printChartOptions);
	printChart.pan({ left: 99999 });
	refreshPrintChart = false;
}

/*function makeDummyData() {
	layerData = [];
	maxLayerTime = lastLayerPrintDuration = 0;
	
	addLayerData(450);
	setTimeout(function() { addDummyPoint(); }, 1000);
}

function addDummyPoint() {
	addLayerData((Math.random() * 84) + 5);
	if (layerData.length <= 300) {
		setTimeout(addDummyPoint, 100);
	}
}*/

function resizeCharts() {
	var headsHeight = $("#table_heaters").height();
	var statusHeight = 0;
	$("#div_status table").each(function() {
		statusHeight += $(this).outerHeight();
	});
	
	var max = (headsHeight > statusHeight) ? headsHeight : statusHeight;
	max -= tempChartPadding;
	
	if (max > 0) {
		$("#chart_temp").css("height", max);
	}
	
	if (refreshTempChart) {
		drawTemperatureChart();
	}
	if (refreshPrintChart) {
		drawPrintChart();
	}
}

/* Sliders */

$('#slider_fan_control').slider({
	enabled: false,
	id: "fan_control",
	min: 0,
	max: 100,
	step: 1,
	value: 35,
	tooltip: "always",
	
	formatter: function(value) {
		return value + " %";
	}
}).on("slideStart", function() {
	fanSliderActive = true;
}).on("slideStop", function(slideEvt) {
	if (isConnected && !isNaN(slideEvt.value)) {
		sendGCode("M106 S" + (slideEvt.value / 100.0));
		$("#slider_fan_print").slider("setValue", slideEvt.value);
	}
	fanSliderActive = false;
});

$('#slider_fan_print').slider({
	enabled: false,
	id: "fan_print",
	min: 0,
	max: 100,
	step: 1,
	value: 35,
	tooltip: "always",
	
	formatter: function(value) {
		return value + " %";
	}
}).on("slideStart", function() {
	fanSliderActive = true;
}).on("slideStop", function(slideEvt) {
	if (isConnected && !isNaN(slideEvt.value)) {
		sendGCode("M106 S" + (slideEvt.value / 100.0));
		$("#slider_fan_control").slider("setValue", slideEvt.value);
	}
	fanSliderActive = false;
});

for(var extr=1; extr<=5; extr++) {
	$('#slider_extr_' + extr).slider({
		enabled: false,
		id: "extr-" + extr,
		min: 50,
		max: 150,
		step: 1,
		value: 100,
		tooltip: "always",
		
		formatter: function(value) {
			return value + " %";
		}
	}).on("slideStart", function() {
		extrSliderActive = true;
	}).on("slideStop", function(slideEvt) {
		if (isConnected && !isNaN(slideEvt.value)) {
			sendGCode("M221 D" + $(this).data("drive") + " S" + slideEvt.value);
		}
		extrSliderActive = false;
	});
}

$('#slider_speed').slider({
	enabled: false,
	id: "speed",
	min: 50,
	max: 250,
	step: 1,
	value: 100,
	tooltip: "always",
	
	formatter: function(value) {
		return value + " %";
	}
}).on("slideStart", function() {
	speedSliderActive = true;
}).on("slideStop", function(slideEvt) {
	if (isConnected && !isNaN(slideEvt.value)) {
		sendGCode("M220 S" + slideEvt.value);
	}
	speedSliderActive = false;
});

/* Modals */

function showConfirmationDialog(title, message, action) {
	$("#modal_confirmation h4").html('<span class="glyphicon glyphicon-question-sign"></span> ' + title);
	$("#modal_confirmation p").html(message);
	$("#modal_confirmation button:first-child").off().one("click", action);
	$("#modal_confirmation").modal("show");
	$("#modal_confirmation .btn-success").focus();
}

function showTextInput(title, message, action) {
	$("#modal_textinput h4").html(title);
	$("#modal_textinput p").html(message);
	$("#modal_textinput input").val("");
	$("#modal_textinput form").off().submit(function(e) {
		$("#modal_textinput").modal("hide");
		var value = $("#modal_textinput input").val();
		if (value.trim() != "") {
			action(value);
		}
		e.preventDefault();
	});
	$("#modal_textinput").modal("show");
}

function showMessage(icon, title, message, size) {
	$("#modal_message h4").html((icon == "") ? "" :  '<span class="glyphicon glyphicon-' + icon + '"></span> ');
	$("#modal_message h4").append(title);
	$("#modal_message p").html(message);
	$("#modal_message .modal-dialog").removeClass("modal-sm modal-lg");
	if (size != "md") {
		$("#modal_message .modal-dialog").addClass("modal-" + size);
	}
	$("#modal_message").modal("show");
}

function showPasswordPrompt() {
	$('#input_password').val("");
	$("#modal_pass_input").modal("show");
	$("#modal_pass_input").one("hide.bs.modal", function() {
		$(".btn-connect").removeClass("btn-warning disabled").addClass("btn-info").html("Connect");
	});
}

$("#modal_pass_input, #modal_textinput").on('shown.bs.modal', function() {
	$(this).find("input").focus()
});

$("#modal_message").on('shown.bs.modal', function() {
	$('#modal_message button').focus()
});

$("#form_password").submit(function(e) {
	$("#modal_pass_input").off("hide.bs.modal").modal("hide");
	connect($("#input_password").val(), false);
	e.preventDefault();
});

/* GUI Helpers */

function addBedTemperature(label, temperature) {
	$(".ul-bed-temp").append('<li><a href="#" class="bed-temp" data-temp="' + temperature + '">' + label + '</a></li>');
	$(".btn-bed-temp").removeClass("disabled");
}

function addDefaultGCode(label, gcode) {
	var item =	'<li><a href="#" class="gcode" data-gcode="' + gcode + '">';
 	item +=		'<span>' + label + '</span>';
	item +=		'<span class="label label-primary">' + gcode + '</span>';
	item +=		'</a></li>';
	
	$(".ul-gcodes").append(item);
	$(".btn-gcodes").removeClass("disabled");
}

function addGCodeFile(filename) {
	$("#page_files h1").addClass("hidden");

	var row =	'<tr data-item="' + filename + '"><td class="col-actions"></td>';
	row +=		'<td><span class="glyphicon glyphicon-asterisk"></span>' + filename + '</td>';
	row +=		'<td class="hidden-xs">loading</td>';
	row +=		'<td>loading</td>';
	row +=		'<td>loading</td>';
	row +=		'<td>loading</td>';
	row +=		'<td class="hidden-xs hidden-sm">loading</td></tr>';
	
	$("#table_gcode_files").append(row).removeClass("hidden");
}

function addMacroFile(filename) {
	// Control Page
	var label = filename.match(/(.*)\.\w+/)[1]
	var macroButton =	'<div class="btn-group">';
	macroButton +=		'<button class="btn btn-default btn-macro btn-sm" data-macro="/macros/' + filename + '">' + label + '</button>';
	macroButton +=		'</div>';
	
	$("#panel_macro_buttons h4").addClass("hidden");
	$("#panel_macro_buttons .btn-group-vertical").append(macroButton);

	// Macro Page
	var row =	'<tr data-macro="' + filename + '"><td class="col-actions"></td>';
	row +=		'<td><span class="glyphicon glyphicon-asterisk"></span>' + filename + '</td>';
	row +=		'<td>loading</td></tr>';
	
	$("#page_macros h1").addClass("hidden");
	$("#table_macro_files").append(row).removeClass("hidden");
}

function beep(frequency, duration) {
	var context = new webkitAudioContext();
	oscillator = context.createOscillator();
	
	oscillator.type = 0; // sine wave
	oscillator.frequency.value = frequency;
	oscillator.connect(context.destination);
	oscillator.noteOn && oscillator.noteOn(0);
	
	setTimeout(function() {
		oscillator.disconnect();
	}, duration);
}

function addHeadTemperature(label, temperature) {
	$(".ul-head-temp").append('<li><a href="#" class="head-temp" data-temp="' + temperature + '">' + label + '</a></li>');
	$(".btn-head-temp").removeClass("disabled");
}

function clearBedTemperatures() {
	$(".ul-bed-temp").html("");
	$(".btn-bed-temp").addClass("disabled");
}

function clearGCodeDirectory() {
	$("#ol_gcode_directory").children(":not(:last-child)").remove();
	$("#ol_gcode_directory").prepend('<li class="active">G-Codes Directory</li>');
}

function clearGCodeFiles() {
	$("#table_gcode_files > tbody").remove();
	$("#table_gcode_files").addClass("hidden");
	$("#page_files h1").removeClass("hidden");
	if (isConnected) {
		$("#page_files h1").text("No Files or Directories found");
	} else {
		$("#page_files h1").text("Connnect to your Duet to display G-Code files");
	}
}

function clearDefaultGCodes() {
	$(".ul-gcodes").html("");
	$(".btn-gcodes").addClass("disabled");
}

function clearHeadTemperatures() {
	$(".ul-heat-temp").html("");
	$(".btn-head-temp").addClass("disabled");
}

function clearMacroFiles() {
	$("#panel_macro_buttons .btn-group-vertical").html("");
	$("#panel_macro_buttons h4").removeClass("hidden");
	
	$("#table_macro_files > tbody").remove();
	$("#table_macro_files").addClass("hidden");
	$("#page_macros h1").removeClass("hidden");
	if (isConnected) {
		$("#page_macros h1").text("No Macro Files found");
	} else {
		$("#page_macros h1").text("Connnect to your Duet to display Macro files");
	}
}

function formatSize(bytes) {
	if (settings.binaryPrefix) {
		if (bytes > 1073741824) { // GiB
			return (bytes / 1073741824).toFixed(1) + " GiB";
		}
		if (bytes > 1048576) { // MiB
			return (bytes / 1048576).toFixed(1) + " MiB";
		}
		if (bytes > 1024) { // KiB
			return (bytes / 1024).toFixed(1) + " KiB";
		}
	} else {
		if (bytes > 1000000000) { // GB
			return (bytes / 1000000000).toFixed(1) + " GB";
		}
		if (bytes > 1000000) { // MB
			return (bytes / 1000000).toFixed(1) + " MB";
		}
		if (bytes > 1000) { // KB
			return (bytes / 1000).toFixed(1) + " KB";
		}
	}
	return bytes + " B";
}

function log(style, message) {
	var entry =		'<div class="row alert-' + style + '">';
	entry +=		'<div class="col-xs-2 col-sm-2 col-md-2 col-lg-1 text-center"><strong>' + (new Date()).toLocaleTimeString() + '</strong></div>';
	entry +=		'<div class="col-xs-10 col-sm-10 col-md-10 col-lg-11">' + message + '</div></div>';
	$("#console_log").prepend(entry);
}

function recordHeaterTemperatures(bedTemp, headTemps) {
	// Add bed temperature
	if (heatedBed) {
		recordedBedTemperatures.push(bedTemp);
	} else {
		recordedBedTemperatures = [];
	}
	
	if (recordedBedTemperatures.length > maxTemperatureSamples) {
		recordedBedTemperatures.shift();
	}
	
	// Add heater temperatures
	for(var i=0; i<headTemps.length; i++) {
		recordedHeadTemperatures[i].push(headTemps[i]);
		if (recordedHeadTemperatures[i].length > maxTemperatureSamples) {
			recordedHeadTemperatures[i].shift();
		}
	}
	
	// Remove invalid data (in case the number of heads has changed)
	for(var i=headTemps.length; i<4; i++) {
		recordedHeadTemperatures[i] = [];
	}
}

function setAxesHomed(axes) {
	// Set button colors
	var unhomedAxes = "";
	if (axes[0]) {
		$(".btn-home-x").removeClass("btn-warning").addClass("btn-primary");
	} else {
		unhomedAxes = (geometry == "delta") ? ", A" : ", X";
		$(".btn-home-x").removeClass("btn-primary").addClass("btn-warning");
	}
	if (axes[1]) {
		$(".btn-home-y").removeClass("btn-warning").addClass("btn-primary");
	} else {
		unhomedAxes += (geometry == "delta") ? ", B" : ", Y";
		$(".btn-home-y").removeClass("btn-primary").addClass("btn-warning");
	}
	if (axes[2]) {
		$(".btn-home-z").removeClass("btn-warning").addClass("btn-primary");
	} else {
		unhomedAxes += (geometry == "delta") ? ", C" : ", Z";
		$(".btn-home-z").removeClass("btn-primary").addClass("btn-warning");
	}
	
	// Set home alert visibility
	if (unhomedAxes == "") {
		$("#home_warning").addClass("hidden");
	} else {
		if (unhomedAxes.length > 3) {
			$("#unhomed_warning").html("The following axes are not homed: <strong>" + unhomedAxes.substring(2) + "</strong>");
		} else {
			$("#unhomed_warning").html("The following axis is not homed: <strong>" + unhomedAxes.substring(2) + "</strong>");
		}
		$("#home_warning").removeClass("hidden");
	}
}

function setATXPower(value) {
	$("input[name='atxPower']").prop("checked", false).parent().removeClass("active");
	$("input[name='atxPower'][value='" + (value ? "1" : "0") + "']").prop("checked", true).parent().addClass("active");
}

function setCurrentTemperature(heater, temperature) {
	var field = (heater == "bed") ? "#tr_bed td" : "#tr_head_" + heater + " td";
	if (temperature == undefined) {
		$(field).first().html("n/a");
	} else if (temperature < -200) {
		$(field).first().html("error");
	} else {
		$(field).first().html(temperature.toFixed(1) + " °C");
	}
	
	if (heater != "bed" && lastStatusResponse != undefined && lastStatusResponse.currentTool > 0) {
		var isActiveHead = false;
		getToolsByHeater(heater).forEach(function(tool) { if (tool == lastStatusResponse.currentTool) { isActiveHead = true; } });
		if (isActiveHead) {
			if (temperature >= coldRetractTemp) {
				$("#btn_retract").removeClass("disabled");
			} else {
				$("#btn_retract").addClass("disabled");
			}
			
			if (temperature >= coldExtrudeTemp) {
				$("#btn_extrude").removeClass("disabled");
			} else {
				$("#btn_extrude").addClass("disabled");
			}
		}
	}
}

function setGeometry(g) {
	// The following may be extended in future versions
	if (g == "delta") {
		$(".home-buttons div, div.home-buttons").addClass("hidden");
		$("td.home-buttons").css("padding-right", "0px");
		$("#btn_homeall").css("width", "");
	} else {
		$(".home-buttons div, div.home-buttons").removeClass("hidden");
		$("td.home-buttons").css("padding-right", "");
		$("#btn_homeall").resize();
	}
	geometry = g;
}

function setGCodeFileItem(row, size, height, layerHeight, filamentUsage, generatedBy) {
	row.data("file", row.data("item"));
	row.removeData("item");
	
	var buttons =	'<button class="btn btn-success btn-print-file btn-sm"><span class="glyphicon glyphicon-print"></span></button>';
	buttons +=		'<button class="btn btn-danger btn-delete-file btn-sm"><span class="glyphicon glyphicon-trash"></span></button>';
	row.children().eq(0).html(buttons);
	
	var linkCell = row.children().eq(1);
	linkCell.find("span").removeClass("glyphicon-asterisk").addClass("glyphicon-file");
	linkCell.html('<a href="#" class="gcode-file">' + linkCell.html() + '</a>');
	
	row.children().eq(2).html(formatSize(size));
	
	if (height > 0) {
		row.children().eq(3).html(height + " mm");
	} else {
		row.children().eq(3).html("n/a");
	}
	
	if (layerHeight > 0) {
		row.children().eq(4).html(layerHeight + " mm");
	} else {
		row.children().eq(4).html("n/a");
	}
	
	if (filamentUsage.length > 0) {
		row.children().eq(5).html(filamentUsage.reduce(function(a, b) { return a + b; }).toFixed(1) + " mm");
	} else {
		row.children().eq(5).html("n/a");
	}
	
	if (generatedBy != "") {
		row.children().eq(6).html(generatedBy);
	} else {
		row.children().eq(6).html("n/a");
	}
}

function setGCodeDirectoryItem(row) {
	row.data("directory", row.data("item"));
	row.removeData("item");
	
	row.children().eq(0).html('<button class="btn btn-danger btn-delete-directory btn-sm pull-right"><span class="glyphicon glyphicon-trash"></span></button>');
	
	var linkCell = row.children().eq(1);
	linkCell.find("span").removeClass("glyphicon-asterisk").addClass("glyphicon-folder-open");
	linkCell.html('<a href="#" class="gcode-directory">' + linkCell.html() + '</a>').prop("colspan", 6);
	
	for(var i=6; i>=2; i--) {
		row.children().eq(i).remove();
	}
	
	if (gcodeLastDirectory == undefined) {
		var firstRow = $("#table_gcode_files tbody > tr:first-child");
		if (firstRow != row) {
			row.insertBefore(firstRow);
		}
	} else {
		row.insertAfter(gcodeLastDirectory);
	}
	gcodeLastDirectory = row;
}

function setGCodeDirectory(directory) {
	currentGCodeDirectory = directory;
	
	$("#ol_gcode_directory").children(":not(:last-child)").remove();
	if (directory == "/gcodes") {
		$("#ol_gcode_directory").prepend('<li class="active">G-Codes Directory</li>');
		$("#ol_gcode_directory li:last-child").html("Go Up");
	} else {
		var listContent = '<li><a href="#" data-directory="/gcodes">G-Codes Directory</a></li>';
		var directoryItems = directory.split("/"), directoryPath = "/gcodes";
		for(var i=2; i<directoryItems.length -1; i++) {
			directoryPath += "/" + directoryItems[i];
			listContent += '<li class="active"><a href="#" data-directory="' + directoryPath + '">' + directoryItems[i] + '</a></li>';
		}
		listContent += '<li class="active">' + directoryItems[directoryItems.length -1] + '</li>';
		$("#ol_gcode_directory").prepend(listContent);
		$("#ol_gcode_directory li:last-child").html('<a href="#" data-directory="' + directoryPath + '">Go Up</a>');
	}
}

function setHeaterState(heater, status, currentTool) {
	var statusText = "n/a";
	switch (status) {
		case 0:
			statusText = "off";
			break;
			
		case 1:
			statusText = "standby";
			break;
			
		case 2:
			statusText = "active";
			break;
			
		case 3:
			statusText = "fault";
			break;
	}
	
	if (heater != "bed") {
		var tools = getToolsByHeater(heater);
		if (tools.length != 0) {
			statusText += " (T" + tools.reduce(function(a, b) { return a + ", T" + b; }) + ")";
			if (tools.length > 1) {
				statusText = statusText.replace("T" + currentTool, "<u>T" + currentTool + "</u>");
				$("#table_heaters tr > th:first-child").eq(heater).find(".caret").removeClass("hidden");
			} else {
				$("#table_heaters tr > th:first-child").eq(heater).find(".caret").addClass("hidden");
			}
		} else {
			$("#table_heaters tr > th:first-child").eq(heater).find(".caret").addClass("hidden");
		}
		$("#table_heaters tr > th:first-child").eq(heater).children("span").html(statusText);
	} else {
		$("#table_heaters tr:last-child > th:first-child > span").text(statusText);
	}
}

function setMacroFileItem(row, size) {
	row.data("file", row.data("item"));
	row.removeData("item");
	
	var buttons =	'<button class="btn btn-success btn-run-macro btn-sm"><span class="glyphicon glyphicon-play"></span></button>';
	buttons +=		'<button class="btn btn-danger btn-delete-macro btn-sm"><span class="glyphicon glyphicon-trash"></span></button>';
	row.children().eq(0).html(buttons);
	
	var linkCell = row.children().eq(1);
	linkCell.find("span").removeClass("glyphicon-asterisk").addClass("glyphicon-file");
	
	row.children().eq(2).html(formatSize(size));
}

function setPauseStatus(paused) {
	if (paused == isPaused) {
		return;
	}
	
	if (paused) {
		$("#btn_cancel").removeClass("disabled").parents("div.btn-group").removeClass("hidden");
		$("#btn_pause").removeClass("btn-warning disabled").addClass("btn-success").text("Resume");
	} else {
		$("#btn_cancel").parents("div.btn-group").addClass("hidden");
		$("#btn_pause").removeClass("btn-success").addClass("btn-warning").text("Pause Print");
		if (isPrinting) {
			$("#btn_pause").removeClass("disabled");
		}
	}
	isPaused = paused;
}

function setPrintStatus(printing) {
	if (printing == isPrinting) {
		return;
	}
	
	if (printing) {
		if (justConnected) {
			showPage("print");
		}
		
		$("#btn_pause").removeClass("disabled");
		$(".row-progress").removeClass("hidden");
		$(".col-layertime").addClass("hidden");
		$("th.col-layertime").text("Current Layer Time");
		
		$.ajax("rr_fileinfo", {
			async: true,
			dataType: "json",
			success: function(response) {
				if (response.err == 0) {
					haveFileInfo = true;
					fileInfo = response;
					
					$("span_progress_left").html("Printing " + response.fileName);
					
					$("#dd_size").html(formatSize(response.size));
					$("#dd_height").html((response.height > 0) ? (response.height + " mm") : "n/a");
					$("#dd_layer_height").html((response.layerHeight > 0) ? (response.layerHeight + " mm") : "n/a");
					
					if (response.filament.length == 0) {
						$("#dd_filament").html("n/a");
					} else {
						var filament = response.filament.reduce(function(a, b) { return a + " mm, " + b; }) + " mm";
						$("#dd_filament").html(filament);
					}
					
					$("#dd_generatedby").html((response.generatedBy == "") ? "n/a" : response.generatedBy);
				}
			}
		});
	} else {
		$("#btn_pause").addClass("disabled");
		
		if (!isConnected || !haveFileInfo) {
			$(".row-progress").addClass("hidden");
		}
		
		if (isConnected) {
			if ($("#auto_sleep").is(":checked")) {
				sendGCode("M1");
				$("#auto_sleep").prop("checked", false);
			}
			
			if (haveFileInfo) {
				setProgress(100, "Printed " + fileInfo.fileName + ", 100% Complete", undefined);
			} else {
				setProgress(100, "Print Complete!", undefined);
			}
			
			["filament", "layer", "file"].forEach(function(id) {
				if ($("#tl_" + id).html() != "n/a") {
					$("#tl_" + id).html("00s");
					$("#et_" + id).html((new Date()).toLocaleTimeString());
				}
			});
			
			$("th.col-layertime").text("Last Layer Time");
		}
		
		haveFileInfo = false;
		fileInfo = undefined;
	}
	
	isPrinting = printing;
	
	if (waitingForPrintStart && printing) {
		showPage("print");
		waitingForPrintStart = false;
	}
}

function setProbeValue(value, secondaryValue) {
	if (value < 0) {
		$("#td_probe").html("n/a");
	} else if (secondaryValue == undefined) {
		$("#td_probe").html(value);
	} else {
		$("#td_probe").html(value + " (" + secondaryValue.reduce(function(a, b) { return a + b; }) + ")");
	}
	
	if (probeTriggerValue != undefined && value > probeTriggerValue && !isPrinting) {
		$("#td_probe").css("background-color", probeTriggerColor);
	} else if (probeSlowDownValue != undefined && value > probeSlowDownValue && !isPrinting) {
		$("#td_probe").css("background-color", probeSlowDownColor);
	} else {
		$("#td_probe").css("background-color", "");
	}
}

function setProgress(progress, labelLeft, labelRight) {
	if (labelLeft != undefined) {
		$("#span_progress_left").text(labelLeft);
	}
	if (labelRight != undefined) {
		$("#span_progress_right").text(labelRight);
	}
	$("#progress").css("width", progress + "%");
}

function setStatusLabel(text, style) {
	$(".label-status").removeClass("label-default label-danger label-info label-warning label-success").addClass("label-" + style).text(text);
}

function setTemperatureInput(head, value, active) {
	var tempInput;
	
	if (head == "bed") {
		tempInput = "#input_temp_bed";
	} else {
		tempInput = "#input_temp_h" + head + "_";
		tempInput += (active) ? "active": "standby";
	}
	
	if (!$(tempInput).is(":focus")) {
		$(tempInput).val((value < 0) ? 0 : value);
	}
}

function convertSeconds(value) {
	value = Math.round(value);
	if (value < 0) {
		value = 0;
	}
	
	var timeLeft = [], temp;
	if (value >= 3600) {
		temp = Math.floor(value / 3600);
		if (temp > 0) {
			timeLeft.push(temp + "h");
			value = value % 3600;
		}
	}
	if (value >= 60) {
		temp = Math.floor(value / 60);
		if (temp > 0) {
			timeLeft.push((temp > 9 ? temp : "0" + temp) + "m");
			value = value % 60;
		}
	}
	value = value.toFixed(0);
	timeLeft.push((value > 9 ? value : "0" + value) + "s");
	
	return timeLeft.reduce(function(a, b) { return a + " " + b; });
}

function setTimeLeft(field, value) {
	if (value == undefined || (value == 0 && isPrinting)) {
		$("#et_" + field + ", #tl_" + field).html("n/a");
	} else {
		// Estimate end time
		var now = new Date();
		var estEndTime = new Date(now.getTime() + value * 1000); // Date uses ms
		$("#et_" + field).html(estEndTime.toLocaleTimeString());
		
		// Estimate time left
		$("#tl_" + field).html(convertSeconds(value));
	}
}

function showPage(name) {
	$(".navitem, .page").removeClass("active");
	$(".navitem-" + name + ", #page_" + name).addClass("active");
	
	if (name != currentPage) {
		if (name == "control") {
			$("#slider_fan_control").slider("relayout")
		}
		
		if (name == "print") {
			$("#slider_speed").slider("relayout");
			$("#slider_fan_print").slider("relayout");
			for(var extr=1; extr<=5; extr++) {
				$("#slider_extr_" + extr).slider("relayout");
			}
			if (refreshPrintChart) {
				drawPrintChart();
			}
			waitingForPrintStart = false;
		}
		
		if (name == "console" && window.matchMedia('(min-width: 992px)').matches) {
			$("#page_console input").focus();
		}
		
		if (name == "files") {
			if (gcodeUpdateIndex == knownGCodeFiles.length) {
				$(".span-refresh-files").removeClass("hidden");
			} else {
				updateGCodeFiles();
			}
		} else {
			$(".span-refresh-files").addClass("hidden");
		}
		
		if (name == "macros") {
			if (macroUpdateIndex == knownMacroFiles.length) {
				$(".span-refresh-macros").removeClass("hidden");
			} else {
				updateMacroFiles();
			}
		} else {
			$(".span-refresh-macros").addClass("hidden");
		}
	}
	currentPage = name;
}

/* Data helpers */

function getToolsByHeater(heater) {
	if (toolMapping == undefined) {
		return [];
	}
	
	var result = [];
	for(var i=0; i<toolMapping.length; i++) {
		for(var k=0; k<toolMapping[i].heaters.length; k++) {
			if (toolMapping[i].heaters[k] == heater) {
				result.push(i + 1);
			}
		}
	}
	return result;
}