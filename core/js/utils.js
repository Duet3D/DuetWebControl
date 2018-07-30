/* Utility functions for Duet Web Control
 * 
 * written by Christian Hammacher (c) 2016-2017
 * 
 * licensed under the terms of the GPL v3
 * see http://www.gnu.org/licenses/gpl-3.0.html
 */

var heatersInUse;


/* Text formatting */

function formatUploadSpeed(bytesPerSec) {
	if (settings.useKiB) {
		if (bytesPerSec > 1073741824) {		// GiB
			return (bytesPerSec / 1073741824).toFixed(2) + " GiB/s";
		}
		if (bytesPerSec > 1048576) {		// MiB
			return (bytesPerSec / 1048576).toFixed(2) + " MiB/s";
		}
		if (bytesPerSec > 1024) {			// KiB
			return (bytesPerSec / 1024).toFixed(1) + " KiB/s";
		}
	} else {
		if (bytesPerSec > 1000000000) {		// GB
			return (bytesPerSec / 1000000000).toFixed(2) + " GB/s";
		}
		if (bytesPerSec > 1000000) {		// MB
			return (bytesPerSec / 1000000).toFixed(2) + " MB/s";
		}
		if (bytesPerSec > 1000) {			// KB
			return (bytesPerSec / 1000).toFixed(1) + " KB/s";
		}
	}
	return bytesPerSec + " B/s";
}

function formatSize(bytes) {
	if (settings.useKiB) {
		if (bytes > 1073741824) {	// GiB
			return (bytes / 1073741824).toFixed(1) + " GiB";
		}
		if (bytes > 1048576) {		// MiB
			return (bytes / 1048576).toFixed(1) + " MiB";
		}
		if (bytes > 1024) {			// KiB
			return (bytes / 1024).toFixed(1) + " KiB";
		}
	} else {
		if (bytes > 1000000000) {	// GB
			return (bytes / 1000000000).toFixed(1) + " GB";
		}
		if (bytes > 1000000) {		// MB
			return (bytes / 1000000).toFixed(1) + " MB";
		}
		if (bytes > 1000) {			// KB
			return (bytes / 1000).toFixed(1) + " KB";
		}
	}
	return bytes + " B";
}

function formatTime(value) {
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

function timeToStr(time) {
	// Should return an ISO-like datetime string like "2016-10-24T15:39:09"
	// Cannot use toISOString() here because it doesn't output the localtime
	var result = "";
	result += time.getFullYear() + "-";
	result += (time.getMonth() + 1) + "-";
	result += time.getDate() + "T";
	result += time.getHours() + ":";
	result += time.getMinutes() + ":";
	result += time.getSeconds();
	return result;
}

function strToTime(str) {
	// Date.parse() doesn't always return correct dates.
	// Hence we must parse it using a regex here
	var re = /(\d+)-(\d+)-(\d+)T(\d+):(\d+):(\d+)/;
	var results;
	if ((results = re.exec(str)) != null) {
		var date = new Date();
		date.setFullYear(results[1]);
		date.setMonth(results[2] - 1);
		date.setDate(results[3]);
		date.setHours(results[4]);
		date.setMinutes(results[5]);
		date.setSeconds(results[6]);
		return date;
	}
	return undefined;
}

function getHeaterStateText(state) {
	switch (state) {
		case 0:
			return T("off");
		case 1:
			return T("standby");
		case 2:
			return T("active");
		case 3:
			return T("fault");
		case 4:
			return T("tuning");
	}
	return T("n/a");
}


/* CSV Parsing */

function parseCSV(str) {
    var arr = [];
    var quote = false;  // true means we're inside a quoted field

    // iterate over each character, keep track of current row and column (of the returned array)
    for (var row = col = c = 0; c < str.length; c++) {
        var cc = str[c], nc = str[c+1];        // current character, next character
		if (arr.length <= row) { arr.push([]); }
		if (arr[row].length <= col) { arr[row].push([""]); }

        // If the current character is a quotation mark, and we're inside a
        // quoted field, and the next character is also a quotation mark,
        // add a quotation mark to the current column and skip the next character
        if (cc == '"' && quote && nc == '"') { arr[row][col] += cc; ++c; continue; }

        // If it's just one quotation mark, begin/end quoted field
        if (cc == '"') { quote = !quote; continue; }

        // If it's a comma and we're not in a quoted field, move on to the next column
        if (cc == ',' && !quote) { ++col; continue; }

        // If it's a newline and we're not in a quoted field, move on to the next
        // row and move to column 0 of that new row
        if (cc == '\n' && !quote) { ++row; col = 0; continue; }

        // Otherwise, append the current character to the current column
        arr[row][col] += cc;
    }
    return arr;
}

function getCSVValue(csvArray, key) {
	if (csvArray.length > 1) {
		var index = csvArray[0].indexOf(key);
		if (index == -1) {
			return undefined;
		}
		return csvArray[1][index].trim();
	}
	return undefined;
}


/* Heaters */

function setHeatersInUse() {
	heatersInUse = [];
	for(var heater = 0; heater < maxHeaters; heater++) {
		var heaterAssigned = (heater == bedHeater);
		heaterAssigned |= (heater == chamberHeater);
		heaterAssigned |= (heater == cabinetHeater);
		heaterAssigned |= (getToolsByHeater(heater).length > 0);
		heatersInUse.push(heaterAssigned);
	}
}


/* Tool Mapping */

var initialTools = "";
$("#table_tools > tbody > tr[data-tool]").each(function() {
	initialTools += this.outerHTML;
});

function setToolMapping(mapping) {
	var mappingHasChanged = (toolMapping == undefined);
	if (!mappingHasChanged) {
		// Add missing fields in case we're talking with an older firmware version
		for(var i = 0; i < mapping.length; i++) {
			if (!mapping[i].hasOwnProperty("number")) {
				// This is rather ugly and should be never used
				mapping[i].number = i + 1;
			}

			if (!mapping[i].hasOwnProperty("name")) {
				mapping[i].name = "";
			}
		}

		// Compare the old tool mapping with the new one
		if (mapping.length != toolMapping.length) {
			mappingHasChanged = true;
		} else {
			for(var i = 0; i < mapping.length; i++) {
				// Stop immediately if anything significant has changed
				if (mapping[i].number != toolMapping[i].number ||
					mapping[i].name != toolMapping[i].name ||
					mapping[i].hasOwnProperty("filament") != toolMapping[i].hasOwnProperty("filament") ||
					mapping[i].heaters.toString() != toolMapping[i].heaters.toString() ||
					mapping[i].drives.toString() != toolMapping[i].drives.toString()
				) {
					mappingHasChanged = true;
					break;
				}

				// If only the filament has changed, update it
				if (mapping[i].hasOwnProperty("filament") && mapping[i].filament != toolMapping[i].filament) {
					setToolFilament(i, mapping[i].filament);
				}
			}
		}
	}

	// See if anything significant has changed
	if (mappingHasChanged) {
		toolMapping = mapping;
		setHeatersInUse();

		// TODO: The web interface has no idea which drive is assigned to which axis/extruder,
		// so the following cannot be fully implemented yet.

		/**
		// Find out which drives may be assigned to XYZ
		xyzAxisMapping = [[0], [1], [2]];
		if (toolMapping != undefined) {
			for(var i = 0; i < toolMapping.length; i++) {
				var tool = toolMapping[i];
				if (tool.hasOwnProperty("axisMap")) {
					for(var k = 0; k < tool.axisMap.length; i++) {
						for(var l = 0; l < tool.axisMap[k].length; l++) {
							var mappedDrive = tool.axisMap[k][l];
							if (xyzAxisMapping[k].indexOf(mappedDrive) == -1) {
								xyzAxisMapping[k].push(mappedDrive);
							}
						}
					}
				}
			}
		}

		// Adjust the column headers of the XYZ position to match this mapping
		if (axisMapping[0].length > 1) {
			var content = "X (";


			content += ")";
		} else {
			$("#th_x").text("X");
		}*/

		return true;
	}
	return false;
}

function setToolFilament(tool, filament) {
	toolMapping[tool].filament = filament;

	var label = "T" + toolMapping[tool].number + ((filament == "") ? "" : (" - " + filament));
	$("#table_tools tr[data-tool='" + toolMapping[tool].number + "'] > th:first-child > span.text-muted").text(label);

	var filamentLabel = (filament == "") ? T("none") : filament;
	$("#page_tools div[data-tool='" + toolMapping[tool].number + "'] dd.filament").text(filamentLabel);
}

function updateFixedToolTemps(rows) {
	settings.defaultActiveTemps.forEach(function(temp) {
		rows.find(".ul-active-temp").append('<li><a href="#" class="heater-temp" data-temp="' + temp + '">' + T("{0} °C", temp) + '</a></li>');
		rows.find(".btn-active-temp").removeClass("disabled");
	});

	settings.defaultStandbyTemps.forEach(function(temp) {
		rows.find(".ul-standby-temp").append('<li><a href="#" class="heater-temp" data-temp="' + temp + '">' + T("{0} °C", temp) + '</a></li>');
		rows.find(".btn-standby-temp").removeClass("disabled");
	});

	rows.find("input").prop("disabled", !isConnected);
}

function getTool(number) {
	if (toolMapping == undefined) {
		return undefined;
	}

	for(var i = 0; i < toolMapping.length; i++) {
		if (toolMapping[i].hasOwnProperty("number")) {
			if (toolMapping[i].number == number) {
				return toolMapping[i];
			}
		} else if (i + 1 == number) {
			return toolMapping[i];
		}
	}
	return undefined;
}

function getToolsByHeater(heater) {
	if (toolMapping == undefined) {
		return [];
	}

	var result = [];
	for(var i = 0; i < toolMapping.length; i++) {
		for(var k = 0; k < toolMapping[i].heaters.length; k++) {
			if (toolMapping[i].heaters[k] == heater) {
				if (toolMapping[i].hasOwnProperty("number")) {
					result.push(toolMapping[i].number);
				} else {
					result.push(i + 1);
				}
			}
		}
	}
	return result;
}

function setCurrentTool(toolNumber) {
	if (toolMapping == undefined) {
		return;
	}

	// Hide extruder drives that cannot be used
	var hideExtruderInputs = true;
	if (toolNumber >= 0) {
		var drives = getTool(toolNumber).drives;
		for(var i = 0; i < numExtruderDrives; i++) {
			var toolHasDrive = (drives.indexOf(i) != -1) || (i > 0 && vendor == "diabase");
			$("#div_extruders > div > .extr-" + i).toggleClass("hidden", !toolHasDrive);
		}

		hideExtruderInputs = (drives.length < 2) || (vendor == "diabase");
	}

	// Hide whole selection if there is no point showing it
	$("#div_extruders").toggleClass("hidden", hideExtruderInputs);
	if (hideExtruderInputs) {
		$("#div_feedrate, #div_feed").removeClass("col-lg-4").addClass("col-lg-5");
		$("#div_extrude").removeClass("col-lg-1").addClass("col-lg-2");
	} else {
		$("#div_feedrate, #div_feed").addClass("col-lg-4").removeClass("col-lg-5");
		$("#div_extrude").addClass("col-lg-1").removeClass("col-lg-2");

		// Select first available extruder
		if ($('input[name="extruder"]:checked').parent().hasClass("hidden")) {
			$("#div_extruders > div > label:not(.hidden):first-child").click();
		}
	}

	// Underline and highlight current tool
	$("#table_tools > tbody > tr").each(function() {
		$(this).toggleClass("active", $(this).data("tool") == toolNumber);
		$(this).find("th:first-child > a > span:first-child").css("text-decoration", ($(this).data("tool") == toolNumber) ? "underline" : "");
	});

	// Update tools on the Settings page
	$("#page_tools button.btn-select-tool").prop("title", T("Select this tool")).html('<span class="glyphicon glyphicon-pencil"></span> <span>' + T("Select") + '</span>');
	$("#page_tools div[data-tool='" + toolNumber + "'] button.btn-select-tool").prop("title", T("Deselect this tool")).html('<span class="glyphicon glyphicon-remove"></span> <span>' + T("Deselect") + '</span>');
}


/* Control state management */

function enableControls() {
	$(".table-axis-positions td").css("cursor", "pointer");
	$("nav input, #div_tools_heaters input, #div_content input").prop("disabled", false);		// Generic inputs
	$("#page_tools label").removeClass("disabled");												// and on Settings page
	$(".machine-button").removeClass("disabled");

	$(".btn-emergency-stop, .gcode-input button[type=submit], .gcode").removeClass("disabled");	// Navbar
	$(".bed-temp, .gcode, .heater-temp, .btn-upload").removeClass("disabled");					// List items and Upload buttons

	$(".mobile-home-buttons button, #btn_homeall, .table-move a").removeClass("disabled");		// Move buttons
	$("#btn_bed_dropdown").removeClass("disabled");												// Automatic Bed Compensation
	$("#panel_extrude label.btn, #panel_extrude button").removeClass("disabled");				// Extruder Control
	$("#panel_control_misc label.btn").removeClass("disabled");									// ATX Power
	for(var fan = -1; fan < maxFans; fan++) {
		var fanID = (fan == -1) ? "print": fan;
		$("#slider_fan_control_" + fanID).slider("enable");										// Fan
		$("#slider_fan_print_" + fanID).slider("enable");										// Control
	}

	$("#page_scanner button").removeClass("disabled");											// Scanner
	$("#page_print .checkbox, #btn_baby_down, #btn_baby_up").removeClass("disabled");			// Print Control
	$(".table-fan-control tr > td:not(:first-child) > button").removeClass("disabled");			// Fan Control
	$("#slider_speed").slider("enable");														// Speed Factor
	for(var extr = 0; extr < maxExtruders; extr++) {
		$("#slider_extr_" + extr).slider("enable");												// Extrusion Factors
	}

	$(".online-control").removeClass("hidden");													// G-Code/Macro Files

	$('[data-setting="settingsOnDuet"]').prop("disabled", location.host == "");
	$(".btn-apply-settings, .btn-reset-settings").removeClass("disabled");						// Settings
}

function disableControls() {
	$(".table-axis-positions td").css("cursor", "");
	$("nav input, #div_tools_heaters input, #div_content input").prop("disabled", true);		// Generic inputs
	$("#page_general input, #page_ui input, #page_listitems input").prop("disabled", false);	// ... except ...
	$("#page_tools label").addClass("disabled");												// ... for Settings
	$(".machine-button").addClass("disabled");

	$(".btn-emergency-stop, .gcode-input button[type=submit], .gcode").addClass("disabled");	// Navbar
	$(".bed-temp, .gcode, .heater-temp, .btn-upload").addClass("disabled");						// List items and Upload buttons

	$(".mobile-home-buttons button, #btn_homeall, #table_move_head a").addClass("disabled");	// Move buttons
	$("#btn_bed_dropdown").addClass("disabled");												// Automatic Bed Compensation
	$("#panel_extrude label.btn, #panel_extrude button").addClass("disabled");					// Extruder Control
	$("#panel_control_misc label.btn").addClass("disabled");									// ATX Power
	for(var fan = -1; fan < maxFans; fan++) {
		var fanID = (fan == -1) ? "print": fan;
		$("#slider_fan_control_" + fanID).slider("disable");									// Fan
		$("#slider_fan_print_" + fanID).slider("disable");										// Control
	}

	$("#page_scanner button").addClass("disabled");												// Scanner
	$("#btn_pause, #page_print .checkbox, #btn_baby_down, #btn_baby_up").addClass("disabled");	// Print Control
	$(".table-fan-control tr > td:not(:first-child) > button").addClass("disabled");			// Fan Control
	$("#slider_speed").slider("disable");														// Speed Factor
	for(var extr = 0; extr < maxExtruders; extr++) {
		$("#slider_extr_" + extr).slider("disable");											// Extrusion Factors
	}

	$(".online-control").addClass("hidden");													// G-Code/Macro Files

	$(".btn-apply-settings, .btn-reset-settings").toggleClass("disabled", $("[data-setting='settingsOnDuet']").is(":checked"));
}


/* Window size queries */

function windowIsXsSm() {
	return window.matchMedia('(max-width: 991px)').matches;
}

function windowIsMdLg() {
	return window.matchMedia('(min-width: 992px)').matches;
}


/* Misc */

function arraysEqual(a, b) {
	if (a != undefined && b != undefined && a.length == b.length) {
		for(var i = 0; i < a.length; i++) {
			if (a[i].constructor === Array && b[i].constructor === Array) {
				if (!arraysEqual(a[i], b[i])) {
					return false;
				}
			} else if (a[i] != b[i]) {
				return false;
			}
		}
		return true;
	}
	return false;
}

function log(style, message) {
	var entry =		'<div class="row alert-' + style + '">';
	entry +=		'<div class="col-xs-3 col-sm-2 col-md-2 col-lg-1 text-center"><strong>' + (new Date()).toLocaleTimeString() + '</strong></div>';
	entry +=		'<div class="col-xs-9 col-sm-10 col-md-10 col-lg-11">' + message + '</div></div>';
	$("#console_log").prepend(entry);
}

var audioContext = new (window.AudioContext || window.webkitAudioContext);
function beep(frequency, duration) {
	var oscillator = audioContext.createOscillator();

	oscillator.type = "sine";
	oscillator.frequency.value = frequency;
	oscillator.connect(audioContext.destination);
	oscillator.start();

	setTimeout(function() {
		oscillator.disconnect();
	}, duration);
}
