/* Utility functions for Duet Web Control
 * 
 * written by Christian Hammacher (c) 2016
 * 
 * licensed under the terms of the GPL v2
 * see http://www.gnu.org/licenses/gpl-2.0.html
 */


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


/* Tool Mapping */

function setToolMapping(mapping) {
	// Don't compare raw objects here as this would always evaluate as false
	if (JSON.stringify(toolMapping) != JSON.stringify(mapping)) {
		toolMapping = mapping;

		/** Machine Status **/

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

		/** Settings page **/

		// Clean up current tools
		$("#page_tools").children(":not(:first-child)").remove();

		// Create new panels for each tool
		if (toolMapping != undefined) {
			for(var i = 0; i < toolMapping.length; i++) {
				var number = toolMapping[i].hasOwnProperty("number") ? toolMapping[i].number : (i + 1);

				var heaters;
				if (toolMapping[i].heaters.length == 0) {
					heaters = T("none");
				} else {
					heaters = toolMapping[i].heaters.reduce(function(a, b) { return a + ", " + b; });
				}

				var drives;
				if (toolMapping[i].drives.length == 0) {
					drives = T("none");
				} else {
					drives = toolMapping[i].drives.reduce(function(a, b) { return a + ", " + b; });
				}

				var div =	'<div class="col-xs-6 col-sm-6 col-md-3 col-lg-3"><div class="panel panel-default">';
				div +=		'<div class="panel-heading"><span>' + T("Tool {0}", number) + '</span></div>';
				div +=		'<div data-tool="' + number + '" class="panel-body">';
				div +=		'<dl><dt>' + T("Heaters:") + '</dt><dd>' + heaters + '</dd>';
				div +=		'<dt>' + T("Drives:") + '</dt><dd>' + drives + '</dd>';
				div +=		'</dl><div class="row"><div class="col-md-12 text-center">';
				if (lastStatusResponse != undefined && lastStatusResponse.currentTool == number) {
					div +=		'<button class="btn btn-success btn-select-tool" title="' + T("Deselect this tool") + '">';
					div +=		'<span class="glyphicon glyphicon-remove"></span> <span>' + T("Deselect") + '</span></button>';
				} else {
					div +=		'<button class="btn btn-success btn-select-tool" title="' + T("Select this tool") + '">';
					div +=		'<span class="glyphicon glyphicon-pencil"></span> <span>' + T("Select") + '</span></button>';
				}
				div +=		' <button class="btn btn-danger btn-remove-tool" title="' + T("Remove this tool") + '">';
				div +=		'<span class="glyphicon glyphicon-trash"></span> ' + T("Remove") + '</button>';
				div +=		'</div></div></div></div></div>';
				$("#page_tools").append(div);
			}
		}

		// Keep the GUI updated
		validateAddTool();
	}
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


/* Control state management */

function enableControls() {
	$("nav input, #div_heaters input, #main_content input").prop("disabled", false);			// Generic inputs
	$("#page_tools label").removeClass("disabled");												// and on Settings page
	$(".machine-button").removeClass("disabled");

	$(".btn-emergency-stop, .gcode-input button[type=submit], .gcode").removeClass("disabled");	// Navbar
	$(".bed-temp, .gcode, .heater-temp, .btn-upload").removeClass("disabled");					// List items and Upload buttons

	$("#mobile_home_buttons button, #btn_homeall, .table-move a").removeClass("disabled");		// Move buttons
	$("#panel_extrude label.btn, #panel_extrude button").removeClass("disabled");				// Extruder Control
	$("#panel_control_misc label.btn").removeClass("disabled");									// ATX Power
	$("#slider_fan_control").slider("enable");													// Fan Control

	$("#page_print .checkbox").removeClass("disabled");											// Print Control
	$("#slider_fan_print").slider("enable");													// Fan Control
	$("#slider_speed").slider("enable");														// Speed Factor
	for(var extr = 1; extr <= maxExtruders; extr++) {
		$("#slider_extr_" + extr).slider("enable");												// Extrusion Factors
	}

	$(".online-control").removeClass("hidden");													// G-Code/Macro Files
}

function disableControls() {
	$("nav input, #div_heaters input, #main_content input").prop("disabled", true);				// Generic inputs
	$("#page_general input, #page_ui input, #page_listitems input").prop("disabled", false);	// ... except ...
	$("#page_tools label").addClass("disabled");												// ... for Settings
	$(".machine-button").addClass("disabled");

	$(".btn-emergency-stop, .gcode-input button[type=submit], .gcode").addClass("disabled");	// Navbar
	$(".bed-temp, .gcode, .heater-temp, .btn-upload").addClass("disabled");						// List items and Upload buttons

	$("#mobile_home_buttons button, #btn_homeall, #table_move_head a").addClass("disabled");	// Move buttons
	$("#panel_extrude label.btn, #panel_extrude button").addClass("disabled");					// Extruder Control
	$("#panel_control_misc label.btn").addClass("disabled");									// ATX Power
	$("#slider_fan_control").slider("disable");													// Fan Control

	$("#btn_pause, #page_print .checkbox").addClass("disabled");								// Print Control
	$("#slider_fan_print").slider("disable");													// Fan Control
	$("#slider_speed").slider("disable");														// Speed Factor
	for(var extr = 1; extr <= maxExtruders; extr++) {
		$("#slider_extr_" + extr).slider("disable");											// Extrusion Factors
	}

	$(".online-control").addClass("hidden");													// G-Code/Macro Files
}


/* Window size queries */


function windowIsXsSm() {
	return window.matchMedia('(max-width: 991px)').matches;
}

function windowIsMdLg() {
	return window.matchMedia('(min-width: 992px)').matches;
}


/* Misc */

function log(style, message) {
	var entry =		'<div class="row alert-' + style + '">';
	entry +=		'<div class="col-xs-2 col-sm-2 col-md-2 col-lg-1 text-center"><strong>' + (new Date()).toLocaleTimeString() + '</strong></div>';
	entry +=		'<div class="col-xs-10 col-sm-10 col-md-10 col-lg-11">' + message + '</div></div>';
	$("#console_log").prepend(entry);
}

var audioContext = new (window.AudioContext || window.webkitAudioContext);
function beep(frequency, duration) {
	var oscillator = audioContext.createOscillator();

	oscillator.type = 'sine';
	oscillator.frequency.value = frequency;
	oscillator.connect(audioContext.destination);
	oscillator.start();

	setTimeout(function() {
		oscillator.disconnect();
	}, duration);
}

function faviconProgress(value) {
    if (value == 'reset') {
        Piecon.reset();
    } else {
        Piecon.setProgress(value);
    }
}
