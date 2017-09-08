/* Main interface logic for Duet Web Control
 * 
 * written by Christian Hammacher (c) 2016-2017
 * 
 * licensed under the terms of the GPL v3
 * see http://www.gnu.org/licenses/gpl-3.0.html
 */


var machineName = "Duet Web Control";

var maxAxes = 9, maxExtruders = 6, maxDrives = 9, maxHeaters = 8, maxTempSensors = 10, maxFans = 3;
var axisNames = ["X", "Y", "Z", "U", "V", "W", "A", "B", "C"];
var probeSlowDownColor = "#FFFFE0", probeTriggerColor = "#FFF0F0";

var webcamUpdating = false;

var fileInfo, currentLayerTime, lastLayerPrintDuration;

var geometry, probeSlowDownValue, probeTriggerValue;
var numAxes, numExtruderDrives, numVolumes, numFans;
var bedHeater = 0, chamberHeater = -1, numTempSensors, toolMapping = undefined;
var numHeads;	// deprecated - do not use any more
var coldExtrudeTemp, coldRetractTemp, tempLimit;

var isPrinting, isPaused, printHasFinished;

var currentPage = "control", waitingForPrintStart;


function resetGuiData() {
	setBoardType("unknown");
	setPauseStatus(false);
	setPrintStatus(false);
	setGeometry("cartesian");

	justConnected = isUploading = updateTaskLive = false;
	resetConfirmationShown = false;
	stopUpdating = true;
	fileInfo = lastStatusResponse = configResponse = configFile = undefined;

	lastSentGCode = "";

	probeSlowDownValue = probeTriggerValue = undefined;
	bedHeater = 0;
	chamberHeater = -1;
	numTempSensors = 0;

	numHeads = 2;			// only 2 are visible on load
	numAxes = 3;			// only 3 are visible on load
	numExtruderDrives = 2;	// only 2 are visible on load
	numFans = undefined;

	coldExtrudeTemp = 160;
	coldRetractTemp = 90;
	tempLimit = 280;

	resetChartData();
	lastLayerPrintDuration = 0;

	setToolMapping([]);

	resetFiles();
	resetOem();

	waitingForPrintStart = fanSliderActive = speedSliderActive = extrSliderActive = false;
}

$(document).ready(function() {
	$('[data-min]').each(function() { $(this).attr("min", $(this).data("min")).attr("step", "any"); });
	$('[data-max]').each(function() { $(this).attr("max", $(this).data("max")).attr("step", "any"); });
	$('[data-toggle="popover"]').popover();

	disableControls();
	resetGuiData();
	updateGui();

	loadSettings();
	loadFileCache();
	loadTableSorting();

	// Check if this browser is supported and display a message if it is not
	var userAgent = navigator.userAgent.toLowerCase();
	var browserSupported = true;
	browserSupported &= (String.prototype.startsWith != undefined);
	browserSupported &= (userAgent.indexOf("webkit") != -1 || userAgent.indexOf("gecko") != -1);
	if (!browserSupported) {
		showMessage("warning", T("Unsupported browser"), "<strong>" + T("Warning") + ":</strong> " + T("Your browser is not officially supported. To achieve the best experience it is recommended to use either Mozilla Firefox, Google Chrome or Opera."), 0, true);
	}
});

function pageLoadComplete() {
	$("#span_copyright").html($("#span_copyright").html().replace("Christian Hammacher", '<a href="https://github.com/chrishamm/DuetWebControl" target="_blank">Christian Hammacher</a>'));
	log("info", "<strong>" + T("Page Load complete!") + "</strong>");

	if (settings.autoConnect) {
		// Users may want to connect automatically once the page has loaded
		connect(sessionPassword, true);
	}
}

function updateGui() {
	// Visibility of the Extra temperatures panel
	if (numTempSensors == 0) {
		$(".extra-temps").addClass("hidden");
		if (!$("#div_extra").hasClass("hidden")) {
			$("#div_extra").addClass("hidden");
			$("#div_tools").removeClass("hidden");
		}
	} else {
		$(".extra-temps").removeClass("hidden");
		for(var i = 0; i < maxTempSensors; i++) {
			$("#table_extra tr").eq(i + 1).toggleClass("hidden", i >= numTempSensors);
		}
	}

	// Tool entries in the Tools list
	$("#table_tools > tbody > tr[data-tool]").remove();
	if (isConnected) {
		var generatedHTML = "", toolIndex = 0;
		toolMapping.forEach(function(tool) {
			var toolName = tool.name;
			if (toolName == "") {
				toolName = T("Tool {0}", tool.number);
			}

			if (tool.heaters.length == 0) {
				var row = '<tr data-tool="' + tool.number + '">';
				row +=		'<th><a href="#"><span>' + toolName + '</span>';
				if (tool.hasOwnProperty("filament")) {
					row +=		'<span class="caret"></span>';
					if (tool.filament != "") {
						row +=	'</a><span class="text-muted">T' + tool.number + ' - ' + tool.filament + '</span>';
					} else {
						row +=	'</a><span class="text-muted">T' + tool.number + '</span>';
					}
				} else {
					row +=		'</a><span class="text-muted">T' + tool.number + '</span>';
				}
				row +=		'</th>';
				row +=		'<td colspan="4"></td>';
				row +=	'</tr>';
				generatedHTML += row;
			} else {
				var heaterIndex = 0;
				tool.heaters.forEach(function(heater) {
					var heaterName = T("Heater {0}", heater);
					var heaterState, currentTemp, activeTemp, standbyTemp;
					if (lastStatusResponse != undefined) {
						if (lastStatusResponse.temps.hasOwnProperty("current") && lastStatusResponse.temps.hasOwnProperty("state")) {
							heaterState = getHeaterStateText(lastStatusResponse.temps.state[heater]);
							currentTemp = T("{0} °C", lastStatusResponse.temps.current[heater].toFixed(1));
						} else {
							if (heater == bedHeater && lastStatusResponse.temps.hasOwnProperty("bed")) {
								heaterState = getHeaterStateText(lastStatusResponse.temps.bed.state);
								currentTemp = T("{0} °C", lastStatusResponse.temps.bed.current.toFixed(1));
							} else if (heater == chamberHeater && lastStatusResponse.temps.hasOwnProperty("chamber")) {
								heaterState = getHeaterStateText(lastStatusResponse.temps.chamber.state);
								currentTemp = T("{0} °C", lastStatusResponse.temps.chamber.current.toFixed(1));
							} else if (heater < lastStatusResponse.temps.heads.state.length + 1) {
								heaterState = getHeaterStateText(lastStatusResponse.temps.heads.state[heater - 1]);
								currentTemp = T("{0} °C", lastStatusResponse.temps.heads.current[heater - 1].toFixed(1));
							} else {
								heaterState = currentTemp = T("n/a");
							}
						}

						if (toolIndex < lastStatusResponse.temps.tools.length) {
							activeTemp = lastStatusResponse.temps.tools.active[toolIndex][heaterIndex];
							standbyTemp = lastStatusResponse.temps.tools.standby[toolIndex][heaterIndex];
						} else {
							activeTemp = standbyTemp = 0;
						}
					} else {
						heaterState = currentTemp = T("n/a");
						activeTemp = standbyTemp = 0;
					}

					var row = '<tr data-tool="' + tool.number + '" data-heater="' + heater + '">';
					row +=		'<th><a href="#"><span>' + toolName + '</span>';
					if (tool.hasOwnProperty("filament")) {
						row +=		'<span class="caret"></span>';
						if (tool.filament != "") {
							row +=	'</a><span class="text-muted">T' + tool.number + ' - ' + tool.filament + '</span>';
						} else {
							row +=	'</a><span class="text-muted">T' + tool.number + '</span>';
						}
					} else {
						row +=		'</a><span class="text-muted">T' + tool.number + '</span>';
					}
					row +=		'</th>';
					row +=		'<th><a href="#" class="heater-' + heater + '">' + heaterName + '</a><span class="text-muted heater-state">' + heaterState + '</span></th>';
					row +=		'<td class="current">' + currentTemp + '</td>';
					row +=		'<td class="input-td"><div class="input-group input-group-sm">';
					row +=			'<input type="number" class="form-control" value="' + activeTemp + '" data-type="active" disabled>';
					row +=			'<div class="input-group-btn div-head-temp hidden-sm">';
					row +=				'<button type="button" class="btn btn-default dropdown-toggle btn-active-temp disabled" data-toggle="dropdown" aria-expanded="false"><span class="caret"></span></button>';
					row +=				'<ul class="dropdown-menu dropdown-menu-right ul-active-temp" role="menu"></ul>';
					row +=			'</div>';
					row +=		'</div></td>';
					row +=		'<td class="input-td"><div class="input-group input-group-sm">';
					row +=			'<input type="number" class="form-control standby-input" value="' + standbyTemp + '" data-type="standby" disabled>';
					row +=			'<div class="input-group-btn div-head-temp hidden-sm">';
					row +=				'<button type="button" class="btn btn-default dropdown-toggle btn-standby-temp disabled" data-toggle="dropdown" aria-expanded="false"><span class="caret"></span></button>';
					row +=				'<ul class="dropdown-menu dropdown-menu-right ul-standby-temp" role="menu"></ul>';
					row +=			'</div>';
					row +=		'</div></td>';
					row +=	'</tr>';
					generatedHTML += row;
					heaterIndex++;
				});
			}
			toolIndex++;
		});

		// Generate DOM element and remove redundant tool captions
		var toolRows = $(generatedHTML);
		var firstToolRow = undefined;
		toolRows.each(function() {
			if (firstToolRow == undefined) {
				firstToolRow = $(this);
			} else {
				if (firstToolRow.data("tool") == $(this).data("tool")) {
					$(this).children().first().remove();

					var firstTh = firstToolRow.children().first();
					firstTh.prop("rowspan", firstTh.prop("rowspan") + 1);
				} else {
					firstToolRow = $(this);
				}
			}
		});
		updateFixedToolTemps(toolRows);
		toolRows.prependTo("#table_tools > tbody");
	} else {
		var toolRows = $(initialTools);
		updateFixedToolTemps(toolRows);
		toolRows.prependTo("#table_tools > tbody");
	}

	// Bed heater
	$("tr[data-heater='bed']").toggleClass("hidden", bedHeater == -1);
	if (bedHeater != -1) {
		var heaterName = T("Heater {0}", bedHeater);
		$("#table_tools tr[data-heater='bed'] > th:nth-child(2) > a").text(heaterName);
		$("#table_tools tr[data-heater='bed'] > th:nth-child(2) > a, #table_heaters tr[data-heater='bed'] > th:first-child > a").removeClass().addClass("heater-" + bedHeater);
	}

	// Chamber heater
	$("tr[data-heater='chamber']").toggleClass("hidden", chamberHeater == -1);
	if (chamberHeater != -1) {
		var heaterName = T("Heater {0}", chamberHeater);
		$("#table_tools tr[data-heater='chamber'] > th:nth-child(2) > a").text(heaterName);
		$("#table_tools tr[data-heater='chamber'] > th:nth-child(2) > a, #table_heaters tr[data-heater='chamber'] > th:first-child > a").removeClass().addClass("heater-" + chamberHeater);
	}

	// Visibility of heater temperatures (deprecated)
	for(var i = 1; i < maxHeaters; i++) {
		var hideHeater = (i > 2 && !isConnected) || (getToolsByHeater(i).length == 0 && isConnected);
		$("#table_heaters tr[data-heater='" + i + "']").toggleClass("hidden", hideHeater);
	}

	// Visibility of additional axis control buttons
	$("#panel_extra_axes").toggleClass("hidden", numAxes <= 3);
	for(var i = 4; i <= maxAxes; i++) {
		var row = $("#table_move_axes > tbody > tr").eq(i - 4);
		if (i > numAxes) {
			row.addClass("hidden");
		} else {
			row.removeClass("hidden");
			if (i == numAxes) {
				row.find("div.btn-group").css("padding-bottom", "0px");
			} else {
				row.find("div.btn-group").removeAttr("style");
			}
		}

		$("#mobile_extra_home_buttons > div.btn-group").eq(i - 4).toggleClass("hidden", i > numAxes);
	}

	// Visibility of additional axis positions
	$("#th_z, #td_z").css("border-right", numAxes < 4 ? "1px" : "0px");
	$("#th_u, #td_u").toggleClass("hidden", numAxes < 4).css("border-right", numAxes < 5 ? "1px" : "0px");
	$("#th_v, #td_v").toggleClass("hidden", numAxes < 5).css("border-right", numAxes < 6 ? "1px" : "0px");
	$("#th_w, #td_w").toggleClass("hidden", numAxes < 6).css("border-right", numAxes < 7 ? "1px" : "0px");
	$("#th_a, #td_a").toggleClass("hidden", numAxes < 7).css("border-right", numAxes < 8 ? "1px" : "0px");
	$("#th_b, #td_b").toggleClass("hidden", numAxes < 8).css("border-right", numAxes < 9 ? "1px" : "0px");
	$("#th_c, #td_c").toggleClass("hidden", numAxes < 9).css("border-right", numAxes < 10 ? "1px" : "0px");

	// Visibility of extruder drive columns
	for(var i = 1; i <= maxExtruders; i++) {
		if (i <= numExtruderDrives) {
			$(".extr-" + i).removeClass("hidden");
			$("#slider_extr_" + i).slider("relayout");
		} else {
			$(".extr-" + i).addClass("hidden");
		}

		$("th.extr-" + i + ", td.extr-" + i).css("border-right", (i < numExtruderDrives) ? "" : "0px");
	}

	// Rearrange extruder drive cells if neccessary. Only show totalusage on md desktop if more than three extruders are in use
	if (numExtruderDrives <= 3) {
		$("#col_extr_totals, #td_extr_total").addClass("hidden-md");
		for(var i = 1; i <= 3; i++) {
			$("th.extr-" + i).removeClass("hidden-md").html(T("Drive " + i));
			$("#td_extr_" + i).removeClass("hidden-md");
		}
	} else {
		$("#col_extr_totals, #td_extr_total").removeClass("hidden-md");
		for(var i = 1; i <= maxExtruders; i++) {
			$("th.extr-" + i).addClass("hidden-md").html(T("D" + i));
			$("#td_extr_" + i).addClass("hidden-md");
		}
	}

	// Do some rearrangement if we have less than four extruders and less than five axes
	if (numExtruderDrives <= 3 && numAxes <= 4) {
		$("#table_heaters .div-head-temp").removeClass("hidden-sm");
		$("#control_all_tools, #control_all_heaters").removeClass("hidden-sm");
		$("#div_tools_heaters").removeClass("col-sm-5").addClass("col-sm-6");
		$("#div_temp_chart").removeClass("col-lg-3").addClass("col-lg-5");
		$("#div_status").removeClass("col-sm-7 col-lg-5").addClass("col-sm-6 col-lg-3");
	} else {
		$("#table_heaters .div-head-temp").addClass("hidden-sm");
		$("#control_all_tools, #control_all_heaters").addClass("hidden-sm");
		$("#div_tools_heaters").removeClass("col-sm-6").addClass("col-sm-5");
		$("#div_temp_chart").removeClass("col-lg-5").addClass("col-lg-3");
		$("#div_status").removeClass("col-sm-6 col-lg-3").addClass("col-sm-7 col-lg-5");
	}

	// Charts
	resizeCharts();
	drawTemperatureChart();
	drawPrintChart();

	// Tool list on Settings page
	$("#page_tools").children(":not(:first-child)").remove();
	for(var i = 0; i < toolMapping.length; i++) {
		if (toolMapping[i].name != "") {
			title = toolMapping[i].name + " (T" + toolMapping[i].number + ")";
		} else {
			title = T("Tool {0}", toolMapping[i].number);
		}

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
		div +=		'<div class="panel-heading"><span>' + title + '</span></div>';
		div +=		'<div data-tool="' + toolMapping[i].number + '" class="panel-body"><dl>';
		if (toolMapping[i].hasOwnProperty("filament")) {
			var filament = (toolMapping[i].filament == "") ? T("none") : toolMapping[i].filament;
			div +=	'<dt>' + T("Filament:") + '</dt><dd class="filament">' + filament + '</dd>';
		}
		div +=		'<dt>' + T("Heaters:") + '</dt><dd>' + heaters + '</dd>';
		div +=		'<dt>' + T("Drives:") + '</dt><dd>' + drives + '</dd>';
		div +=		'</dl><div class="row"><div class="col-md-12 text-center">';
		if (lastStatusResponse != undefined && lastStatusResponse.currentTool == toolMapping[i].number) {
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
	validateAddTool();
}

function resetGui() {
	// Charts
	drawTemperatureChart();
	drawPrintChart();

	// Navbar
	setMachineName("Duet Web Control");
	setStatusLabel("Disconnected", "default");

	// Heater Temperatures
	$("#div_tools_heaters span.heater-state").text("");
	setCurrentTemperature("bed",  undefined);
	setTemperatureInput("bed", 0, true, false);
	setCurrentTemperature("chamber",  undefined);
	setTemperatureInput("chamber", 0, true, false);
	for(var i = 1; i < maxHeaters; i++) {
		setCurrentTemperature(i, undefined);
		setTemperatureInput(i, 0, true, false);
		setTemperatureInput(i, 0, false, false);
	}

	// Status fields
	$("#td_x, #td_y, #td_z").text(T("n/a"));
	for(var i = 1; i <= numExtruderDrives; i++) {
		$("#td_extr_" + i).text(T("n/a"));
	}
	$("#td_extr_total").text(T("n/a"));
	setProbeValue(-1, undefined);
	$("#td_fanrpm, #td_cputemp").text(T("n/a"));
	$(".vin").addClass("hidden");

	// Control page
	clearBedPoints();
	setAxesHomed([1, 1, 1]);
	setATXPower(false);
	$('#slider_fan_control').slider("setValue", 35);

	// Hide Scanner page
	$(".scan-control").addClass("hidden");
	$("#main_content").resize();
	if (currentPage == "scanner") {
		showPage("control");
	}

	// Print Status
	$(".row-progress").addClass("hidden");
	setProgress(100, "", "");
	$("#div_print_another").addClass("hidden");
	$("#override_fan, #auto_sleep").prop("checked", false);
	$("#span_babystepping, #page_print dd, #panel_print_info table td, #table_estimations td").html(T("n/a"));

	// Fan Sliders
	setFanVisibility(0, settings.showFan1);
	setFanVisibility(1, settings.showFan2);
	setFanVisibility(2, settings.showFan3);
	numFans = undefined;						// let the next status response callback hide fans that are not available
	$('#slider_fan_print').slider("setValue", 35);
	
	$('#slider_speed').slider("setValue", 100);
	for(var extr = 1; extr <= maxExtruders; extr++) {
		$("#slider_extr_" + extr).slider("setValue", 100);
	}

	// G-Code Console is not cleared automatically

	// G-Code Files
	updateGCodeFiles();

	// Macro Files
	updateMacroFiles();

	// Filaments
	updateFilaments();

	// Settings
	$("#tr_firmware_electronics").addClass("hidden");
	$("#firmware_name, #firmware_electronics, #firmware_version, #dws_version").html(T("n/a"));
	$("#page_machine td:not(:first-child), #page_machine dd").html(T("n/a"));

	updateSysFiles();

	// Modal dialogs
	closeMessageBox();
	$(".modal").modal("hide");

	// Upload prompt
	$("#input_file_upload").val("");
}

function updateWebcam(externalTrigger) {
	if (externalTrigger && webcamUpdating) {
		// When the settings are applied, make sure this only runs once
		return;
	}

	if (settings.webcamURL == "") {
		webcamUpdating = false;
	} else if (settings.webcamEmbedded) {
		webcamUpdating = false;
		$("#ifm_webcam").attr("src", settings.webcamURL);
	} else if (settings.webcamInterval == 0) {
		webcamUpdating = false;
		$("#img_webcam").attr("src", settings.webcamURL);
	} else {
		var newURL = settings.webcamURL;
		if (settings.webcamFix) {
			newURL += "_" + Math.random();
		} else {
			if (newURL.indexOf("?") == -1) {
				newURL += "?dummy=" + Math.random();
			} else {
				newURL += "&dummy=" + Math.random();
			}
		}
		$("#img_webcam").attr("src", newURL);

		webcamUpdating = true;
		setTimeout(function() {
			updateWebcam(false);
		}, settings.webcamInterval);
	}
}


/* Dynamic GUI Events */

$("body").on("focus", "input[type='number']", function() {
	var input = $(this);
	setTimeout(function() {
		input.select();
	}, 10);
});

$("#div_tools_heaters").on("click", ".bed-temp", function(e) {
	if ($(this).closest("tr").data("heater") == "bed") {
		sendGCode("M140 S" + $(this).data("temp"));		// Set bed temperature
	} else {
		sendGCode("M141 S" + $(this).data("temp"));		// Set chamber temperature
	}
	e.preventDefault();
});

$("#div_tools_heaters div.panel-heading div.dropdown").on("click", ".heater-temp", function(e) {
	if (toolMapping != undefined) {
		var inputElement = $(this).closest("div.input-group").find("input");
		var activeOrStandby = (inputElement.data("type") == "active") ? "S" : "R";
		var temperature = $(this).data("temp");

		var gcode = "";
		for(var i = 0; i < toolMapping.length; i++) {
			var temps = [];
			toolMapping[i].heaters.forEach(function() { temps.push(temperature); });
			if (temps.length > 0) {
				var tempString = temps.reduce(function(a, b) { return a + ":" + b; });
				gcode += "G10 P" + toolMapping[i].number + " " + activeOrStandby + tempString + "\n";
			}
		}
		sendGCode(gcode);
	}

	e.preventDefault();
});

$("#page_settings").on("click", ".btn-select-tool", function(e) {
	var tool = $(this).closest("div.panel-body").data("tool");
	if (lastStatusResponse != undefined && lastStatusResponse.currentTool == tool) {
		changeTool(-1);
	} else {
		changeTool(tool);
	}
	e.preventDefault();
});

$("#page_settings").on("click", ".btn-remove-tool", function(e) {
	var tool = $(this).closest("div.panel-body").data("tool");
	showConfirmationDialog(T("Delete Tool"), T("Are you sure you wish to remove tool {0}?", tool), function() {
		sendGCode("M563 P" + tool + " D-1 H-1");
		extendedStatusCounter = settings.extendedStatusInterval;
	});
	e.preventDefault();
});

$("#table_extra input[type='checkbox']").change(function() {
	setExtraTemperatureVisibility($(this).closest("tr").data("sensor"), $(this).prop("checked"));
});

$("#table_heaters").on("click", ".heater-temp", function(e) {
	var inputElement = $(this).closest("div.input-group").find("input");
	var activeOrStandby = (inputElement.data("type") == "active") ? "S" : "R";
	var temperature = $(this).data("temp");
	var gcode = "";
	var heater = inputElement.closest("tr").data("heater");
	var currentTool = (lastStatusResponse == undefined) ? -1 : lastStatusResponse.currentTool;

	// 1. Is the active tool mapped to this heater?
	if (currentTool >= 0 && $.inArray(heater, getTool(currentTool).heaters) != -1) {
		// Yes - generate only one G10 code for it
		var type = inputElement.data("type");
		var temps = [];
		getTool(currentTool).heaters.forEach(function(h) {
			if (h == heater) {
				temps.push(temperature);
			} else {
				temps.push($("#table_heaters > tbody > tr[data-heater='" + h + "'] > td > input[data-type='" + type + "']").val());
			}
		});

		gcode = "G10 P" + currentTool + " " + activeOrStandby + temps.reduce(function(a, b) { return a + ":" + b; });
	} else {
		// 2. Is there a tool that is only mapped to this heater?
		var toolFound = false;
		getToolsByHeater(heater).forEach(function(tool) {
			var toolHeaters = getTool(tool).heaters;
			if (!toolFound && toolHeaters.length == 1) {
				// Yes - generate only one G10 code for this tool
				gcode = "G10 P" + tool + " " + activeOrStandby + temperature;
				toolFound = true;
			}
		});

		// 3. Is there at least one tool that is assigned to this heater at all?
		if (!toolFound) {
			var tools = getToolsByHeater(heater);
			if (tools.length > 0) {
				// Yes - use the first one to set the target temperature(s)
				var type = inputElement.data("type");
				var temps = [];
				getTool(tools[0]).heaters.forEach(function(h) {
					if (h == heater) {
						temps.push(temperature);
					} else {
						temps.push($("#table_heaters > tbody > tr[data-heater='" + h + "'] > td > input[data-type='" + type + "']").val());
					}
				});

				gcode = "G10 P" + tools[0] + " " + activeOrStandby + temps.reduce(function(a, b) { return a + ":" + b; });
			}
		}
	}

	sendGCode(gcode);
	e.preventDefault();
});

$("#table_tools").on("click", ".heater-temp", function(e) {
	var tool = $(this).closest("tr").data("tool");
	var heater = $(this).closest("tr").data("heater");
	var type = $(this).closest("div.input-group").find("input").data("type");
	var temperature = $(this).data("temp");

	var temps = [];
	getTool(tool).heaters.forEach(function(h) {
		if (h == heater) {
			temps.push(temperature);
		} else {
			var cell = $("#table_tools > tbody > tr[data-tool='" + tool + "'][data-heater='" + h + "'] > td");
			temps.push(cell.find("div > input[data-type='" + type + "']").val());
		}
	});

	var gcode = "G10 P" + tool  + " " + (type == "active" ? "S" : "R");
	gcode += temps.reduce(function(a, b) { return a + ":" + b; });
	sendGCode(gcode);

	$(this).select();
	e.preventDefault();
});

$("#table_tools").on("click", "tr > th:nth-child(2) > a", cbHeaterClick);

$("#table_tools").on("keydown", "tr > td > div > input", function(e) {
	// Ignore bed and chamber heaters. They're handled by a static event callback
	var heater = $(this).closest("tr").data("heater");
	if (heater == "bed" || heater == "chamber") {
		return;
	}

	// Has the user pressed enter or tab (on Android)?
	var enterKeyPressed = (e.which == 13);
	enterKeyPressed |= (e.which == 9 && windowIsXsSm());
	if (isConnected && enterKeyPressed) {
		var tool = $(this).closest("tr").data("tool");
		var type = $(this).data("type");

		var temps = [];
		getTool(tool).heaters.forEach(function(h) {
			var cell = $("#table_tools > tbody > tr[data-tool='" + tool + "'][data-heater='" + h + "'] > td");
			temps.push(cell.find("div > input[data-type='" + type + "']").val());
		});

		var gcode = "G10 P" + tool  + " " + (type == "active" ? "S" : "R");
		gcode += temps.reduce(function(a, b) { return a + ":" + b; });
		sendGCode(gcode);

		$(this).select();
		e.preventDefault();
	}
});

$("#table_tools").on("click", "tr > th:first-child > a", function(e) {
	// Ignore bed and chamber heaters. They're handled by a static event callback
	var heater = $(this).closest("tr").data("heater");
	if (heater == "bed" || heater == "chamber") {
		return;
	}

	// Ignore this if we're not connected
	if (!isConnected) {
		e.preventDefault();
		return;
	}

	// Get the associated tool and check if it allows the filament to be changed
	var currentTool = (lastStatusResponse == undefined) ? -1 : lastStatusResponse.currentTool;
	var tool = $(this).closest("tr").data("tool");
	if (getTool(tool).hasOwnProperty("filament")) {
		// Show popover for tools that are assigned to exactly one extruder and let the user decide what to do
		var popover = $(this).parent().children("div.popover");
		if (popover.length > 0) {
			$(this).popover("hide");
			$(this).blur();
		} else {
			if (lastPopover != undefined) {
				$(lastPopover).popover("hide");
				lastPopover = undefined;
			}
			var toolObj = getTool(tool);

			// make popover content
			var content = '';
			if (tool == currentTool) {
				content += '<a href="#" class="tool" data-tool="-1"><span class="glyphicon glyphicon-pause"></span> ' + T("Deselect Tool") + '</a>';
			} else {
				content += '<a href="#" class="tool" data-tool="' + tool + '"><span class="glyphicon glyphicon-play"></span> ' + T("Select Tool") + '</a>';
			}
			content += "<hr>";
			if (toolObj != undefined && toolObj.filament == "") {
				content += '<a href="#" class="load-filament"><span class="glyphicon glyphicon glyphicon-arrow-down"></span> Load Filament</a>';
			} else {
				content += '<a href="#" class="change-filament"><span class="glyphicon glyphicon-transfer"></span> Change Filament</a>';
				content += '<br/><a href="#" class="unload-filament"><span class="glyphicon glyphicon-arrow-up"></span> Unload Filament</a>';
			}

			// show it
			$(this).popover({
				content: content,
				html: true,
				trigger: "manual",
				placement: "bottom",
			}).popover("show");
		}
	} else {
		// Either activate or deactivate tool
		if (tool == currentTool) {
			changeTool(-1);
		} else {
			changeTool(tool);
		}

		$(this).blur();
	}
	e.preventDefault();
});

$("body").on("click", ".load-filament", function(e) {
	showFilamentDialog($(this).closest("tr").data("tool"), false);
	e.preventDefault();
});

$("body").on("click", ".change-filament", function(e) {
	showFilamentDialog($(this).closest("tr").data("tool"), true);
	e.preventDefault();
});

$("body").on("click", ".unload-filament", function(e) {
	var tool = $(this).closest("tr").data("tool"), gcode = "";
	if (lastStatusResponse != undefined && lastStatusResponse.currentTool != tool) {
		gcode = "T" + tool + "\n";
	}
	gcode += "M702";
	sendGCode(gcode);

	e.preventDefault();
});

$("body").on("click", ".tool", function(e) {
	changeTool($(this).data("tool"));
	e.preventDefault();
});

$("body").on("click", ".filament-usage", function(e) {
	if (windowIsXsSm()) {
		// Display filament usage for small devices on click
		showMessage("info", T("Filament usage"), $(this).attr("title"));
	}
	e.preventDefault();
});

$("body").on("click", "[data-gcode]", function(e) {
	if (isConnected && !$(this).hasClass("disabled")) {
		// If this G-Code isn't performed by a button, treat it as a manual input
		sendGCode($(this).data("gcode"), !($(this).is(".btn")));
	}
	e.preventDefault();
});

var lastPopover = undefined;
$("body").on("shown.bs.popover", function(e) {
	lastPopover = $(".popover");
});

$("body").on("blur", "#div_tools_heaters tr > th > a", function() {
	if (lastPopover != undefined) {
		lastPopover.popover("hide");
	}
});

$("body").on("hidden.bs.popover", function(e) {
	if (lastPopover != undefined) {
		$(lastPopover).popover("destroy");
		lastPopover = undefined;
	}
});


/* Static GUI Events */

$(".a-tools, .a-heaters, .a-extra").click(function(e) {
	var showTools = $(this).hasClass("a-tools");
	var showHeaters = $(this).hasClass("a-heaters");
	var showExtra = $(this).hasClass("a-extra");
	$("#div_tools").toggleClass("hidden", !showTools);
	$("#div_heaters").toggleClass("hidden", !showHeaters);
	$("#div_extra").toggleClass("hidden", !showExtra);
	resizeCharts();
	e.preventDefault();
});

$(".heaters-off").click(function(e) {
	if (isConnected) {
		var gcode = "";

		// Turn off nozzle heaters
		if (toolMapping != undefined) {
			for(var i = 0; i < toolMapping.length; i++) {
				var temps = [];
				toolMapping[i].heaters.forEach(function() { temps.push("-273.15"); });
				if (temps.length > 0) {
					var tempString = temps.reduce(function(a, b) { return a + ":" + b; });
					gcode += "G10 P" + toolMapping[i].number + " R" + tempString + " S" + tempString + "\n";
				}
			}
		}

		// Turn off bed
		if (bedHeater != -1) {
			gcode += "M140 S-273.15\n";
		}

		// Turn off chamber
		if (chamberHeater != -1) {
			gcode += "M141 S-273.15\n";
		}

		sendGCode(gcode);
	}
	e.preventDefault();
});

$("#a_webcam").click(function(e) {
	var panelContent= $("#panel_webcam > div.panel-body");
	if (panelContent.hasClass("hidden")) {
		$("#span_webcam").removeClass("glyphicon-menu-up").addClass("glyphicon-menu-down");
		panelContent.removeClass("hidden");
	} else {
		$("#span_webcam").removeClass("glyphicon-menu-down").addClass("glyphicon-menu-up");
		panelContent.addClass("hidden");
	}
	$(this).blur();
	e.preventDefault();
});

$("#img_webcam").click(function(){
	updateWebcam(true);
});

$("#btn_baby_down").click(function() {
	if (isConnected) {
		sendGCode("M290 S" + (-settings.babysteppingZ));
	}
});

$("#btn_baby_up").click(function() {
	if (isConnected) {
		sendGCode("M290 S" + (settings.babysteppingZ));
	}
});

$("#btn_cancel").click(function() {
	sendGCode("M0 H1");	// Stop / Cancel Print, but leave all the heaters on
	$(this).addClass("disabled");
});

$(".btn-emergency-stop").click(function() {
	if (settings.confirmStop) {
		showConfirmationDialog(T("Emergency STOP"), T("This will turn off everything and perform a software reset.<br/><br/>Are you REALLY sure you want to do this?"), function() {
			sendGCode("M112\nM999");
		});
	} else {
		sendGCode("M112\nM999");
	}
});

$("#btn_clear_log").click(function(e) {
	$("#console_log").html("");
	log("info", "<strong>" + T("Message Log cleared!") + "</strong>");
	e.preventDefault();
});

$("#btn_extrude").click(function(e) {
	var feedrate = $("#panel_extrude input[name=feedrate]:checked").val() * 60;
	var amount = $("#panel_extrude input[name=feed]:checked").val();
	var drive = $('input[name="extruder"]:checked').val();

	if (drive != "mix" && lastStatusResponse != undefined && !$("#div_extrude").hasClass("hidden")) {
		var amounts = [];
		var toolDrives = getTool(lastStatusResponse.currentTool).drives;
		for(var i = 0; i < toolDrives.length; i++) {
			if (drive == "all" || drive == toolDrives[i]) {
				amounts.push(amount);
			} else {
				amounts.push("0");
			}
		}
		amount = amounts.join(":");
	}

	sendGCode("M120\nM83\nG1 E" + amount + " F" + feedrate + "\nM121");
});

$("#btn_retract").click(function(e) {
	var feedrate = $("#panel_extrude input[name=feedrate]:checked").val() * 60;
	var amount = -$("#panel_extrude input[name=feed]:checked").val();
	var drive = $('input[name="extruder"]:checked').val();

	if (drive != "mix" && lastStatusResponse != undefined && !$("#div_extrude").hasClass("hidden")) {
		var amounts = [];
		var toolDrives = getTool(lastStatusResponse.currentTool).drives;
		for(var i = 0; i < toolDrives.length; i++) {
			if (drive == "all" || drive == toolDrives[i]) {
				amounts.push(amount);
			} else {
				amounts.push("0");
			}
		}
		amount = amounts.join(":");
	}

	sendGCode("M120\nM83\nG1 E" + amount + " F" + feedrate + "\nM121");
});

$(".btn-hide-info").click(function() {
	if ($(this).hasClass("active")) {
		$("#row_info").addClass("hidden-xs hidden-sm");
		$("#main_content").addClass("content-collapsed-padding");
		setTimeout(function() {
			$(".btn-hide-info").removeClass("active");
		}, 100);
	} else {
		$("#row_info").removeClass("hidden-xs hidden-sm");
		$("#main_content").removeClass("content-collapsed-padding");
		setTimeout(function() {
			$(".btn-hide-info").addClass("active");
		}, 100);
	}
	$(this).blur();
});

$(".btn-home-x").resize(function() {
	if (geometry != "delta") {
		var width = $(this).parent().width();
		if (width > 0) {
			$("#btn_homeall").css("min-width", width);
		}
	}
}).resize();

$("#mobile_home_buttons button, #btn_homeall, #mobile_extra_home_buttons, .table-move a, " +
	"#div_x_controls button[data-x], #div_y_controls button[data-y], #div_z_controls button[data-z]").click(function(e) {
	if ($(this).data("home") != undefined) {
		if ($(this).data("home") == "all") {
			sendGCode("G28");
		} else {
			sendGCode("G28 " + $(this).data("home"));
		}
	} else {
		var moveString = "M120\nG91\nG1";
		if ($(this).data("x") != undefined) {
			moveString += " X" + $(this).data("x");
		}
		if ($(this).data("y") != undefined) {
			moveString += " Y" + $(this).data("y");
		}
		if ($(this).data("z") != undefined) {
			moveString += " Z" + $(this).data("z");
		}
		if ($(this).data("u") != undefined) {
			moveString += " U" + $(this).data("u");
		}
		if ($(this).data("v") != undefined) {
			moveString += " V" + $(this).data("v");
		}
		if ($(this).data("w") != undefined) {
			moveString += " W" + $(this).data("w");
		}
		if ($(this).data("a") != undefined) {
			moveString += " A" + $(this).data("a");
		}
		if ($(this).data("b") != undefined) {
			moveString += " B" + $(this).data("b");
		}
		if ($(this).data("c") != undefined) {
			moveString += " C" + $(this).data("c");
		}
		moveString += " F" + settings.moveFeedrate + "\nM121";
		sendGCode(moveString);
	}
	e.preventDefault();
});

$("#btn_pause").click(function() {
	if (isPaused) {
		sendGCode("M24");	// Resume
	} else if (isPrinting) {
		sendGCode("M25");	// Pause
	}
	$(this).addClass("disabled");
});

$("#btn_print_another").click(function() {
	if (isConnected) {
		sendGCode("M32 " + $(this).data("file"));
		$("#div_print_another").addClass("hidden");
	}
});

$(".gcode-input").submit(function(e) {
	if (isConnected) {
		var gcode = $(this).find("input").val();
		if (settings.uppercaseGCode) {
			var gcodeToSend = "", inString = false;
			for(var i = 0; i < gcode.length; i++) {
				var chr = gcode[i];
				if (inString) {
					if (i < gcode.length - 1 && chr == '\\' && gcode[i + 1] == '"') {
						gcodeToSend += '\\"';
						i++;
					} else {
						if (chr == '"') {
							inString = false;
						}
						gcodeToSend += chr;
					}
				} else {
					if (chr == '"') {
						inString = true;
					}
					gcodeToSend += chr.toUpperCase();
				}
			}
			gcode = gcodeToSend;
		}
		sendGCode(gcode, true);
		$(this).find("input").select();
	}
	e.preventDefault();
});

// Make the auto-complete dropdown items look nice.
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

$("#table_heaters > tbody > tr > td > div > input," +
  "#table_tools > tbody > tr[data-heater='bed'] > td > div > input," +
  "#table_tools > tbody > tr[data-heater='chamber'] > td > div > input").keydown(function(e) {
	var enterKeyPressed = (e.which == 13);
	enterKeyPressed |= (e.which == 9 && windowIsXsSm()); // need this for Android
	if (isConnected && enterKeyPressed) {
		var heater = $(this).closest("tr").data("heater");
		var temperature = $(this).val();
		var gcode = "";

		// 1. Are we dealing with a bed or chamber heater?
		if (heater == "bed") {
			gcode = "M140 S" + temperature;
		} else if (heater == "chamber") {
			gcode = "M141 S" + temperature;
		} else {
			// 2. Is the active tool mapped to this heater?
			var activeOrStandby = ($(this).data("type") == "active") ? "S" : "R";
			var currentTool = (lastStatusResponse == undefined) ? -1 : lastStatusResponse.currentTool;
			if (currentTool >= 0 && $.inArray(heater, getTool(currentTool).heaters) != -1) {
				// Yes - generate only one G10 code for it
				var type = $(this).data("type");
				var temps = [];
				getTool(currentTool).heaters.forEach(function(h) {
					if (h == heater) {
						temps.push(temperature);
					} else {
						temps.push($("#table_heaters > tbody > tr[data-heater='" + h + "'] > td > input[data-type='" + type + "']").val());
					}
				});

				gcode = "G10 P" + currentTool + " " + activeOrStandby + temps.reduce(function(a, b) { return a + ":" + b; });
			} else {
				// 3. Is there a tool that is only mapped to this heater?
				var toolFound = false;
				getToolsByHeater(heater).forEach(function(tool) {
					var toolHeaters = getTool(tool).heaters;
					if (!toolFound && toolHeaters.length == 1) {
						// Yes - generate only one G10 code for this tool
						gcode = "G10 P" + tool + " " + activeOrStandby + temperature;
						toolFound = true;
					}
				});

				// 4. Is there at least one tool that is assigned to this heater at all?
				if (!toolFound) {
					var tools = getToolsByHeater(heater);
					if (tools.length > 0) {
						// Yes - use the first one to set the target temperature(s)
						var type = $(this).data("type");
						var temps = [];
						getTool(tools[0]).heaters.forEach(function(h) {
							if (h == heater) {
								temps.push(temperature);
							} else {
								temps.push($("#table_heaters > tbody > tr[data-heater='" + h + "'] > td > input[data-type='" + type + "']").val());
							}
						});

						gcode = "G10 P" + tools[0] + " " + activeOrStandby + temps.reduce(function(a, b) { return a + ":" + b; });
					}
				}
			}
		}
		sendGCode(gcode);

		$(this).select();
		e.preventDefault();
	}
});

$(".all-temp-input").keydown(function(e) {
	if (isConnected && e.which == 13) {
		if (toolMapping != undefined) {
			var activeOrStandby = ($(this).data("type") == "active") ? "S" : "R";
			var temperature = $(this).val();

			var gcode = "";
			for(var i = 0; i < toolMapping.length; i++) {
				if ($.inArray(0, toolMapping[i].heaters) == -1) {
					// Make sure we don't set temperatures for the heated bed
					gcode += "G10 P" + toolMapping[i].number + " " + activeOrStandby + $(this).val() + "\n";
				}
			}
			sendGCode(gcode);
		}

		e.preventDefault();
	}
});

$("#main_content").resize(function() {
	// It doesn't always make sense to make the main content scrollable. Hence check if
	// a) this option is explicitly enabled
	// b) DWC is not running in a small window
	// c) the sidebar has enough space to be fully displayed
	if (!settings.scrollContent || windowIsXsSm() || $(".sidebar").first().offset().top + $(".sidebar").first().height() > $(window).height()) {
		$(this).css("height", "").css("min-height", "");
	} else {
		var height = "calc(100vh - " + $(this).offset().top + "px)";
		var minHeight = $(".sidebar:not(.sidebar-continuation)").height() + "px";
		$(this).css("height", height).css("min-height", minHeight);

		if ($("body").height() > $(window).height()) {
			$(this).css("height", "").css("min-height", "");
		}
	}
});

$(".navbar-brand").click(function(e) { e.preventDefault(); });
$(".navbar-brand.visible-xs > abbr").click(function(e) {
	showMessage("warning", T("Warning"), T("Some axes are not homed"));
	e.preventDefault();
});

$(".navlink").click(function(e) {
	$(this).blur();
	showPage($(this).data("target"));
	e.preventDefault();
});

$("#panel_control_misc label.btn").click(function() {
	if ($(this).find("input").val() == 1) {		// ATX on
		sendGCode("M80");
	} else {									// ATX off
		showConfirmationDialog(T("ATX Power"), T("Do you really want to turn off ATX power?<br/><br/>This will turn off all drives, heaters and fans."), function() {
			sendGCode("M81");
		});
	}
});

$("#panel_extrude label.btn").click(function() {
	$(this).parent().find("label.btn").removeClass("btn-primary").addClass("btn-default");
	$(this).removeClass("btn-default").addClass("btn-primary");
});

$("#table_heaters > tbody > tr > th > a," +
	"#table_tools > tbody > tr[data-heater='bed'] > th:first-child > a," +
	"#table_tools > tbody > tr[data-heater='chamber'] > th:first-child > a").click(cbHeaterClick);


$("#check_heaters input[type='checkbox'], #check_drives input[type='checkbox']").change(function() {
	var isChecked = $(this).is(":checked");
	$(this).closest("label").toggleClass("btn-primary", isChecked).toggleClass("btn-default", !isChecked);

	validateAddTool();
});

$("#div_add_tool input[type='number']").on("input", function() {
	validateAddTool();
});

function validateAddTool() {
	var toolNumber = parseInt($("#input_tool_number").val());
	var disableButton =	(!isConnected) ||
		(isNaN(toolNumber) || toolNumber < 0 || toolNumber > 255) ||
		(toolMapping != undefined && getTool(toolNumber) != undefined);
	$("#btn_add_tool").toggleClass("disabled", disableButton);
}

$("#div_add_tool input[type='number']").keydown(function(e) {
	if (e.which == 13) {
		if (!$("#btn_add_tool").hasClass("disabled")) {
			$("#btn_add_tool").click();
		}
		e.preventDefault();
	}
});

$("#ul_control_dropdown_tools, #ul_control_dropdown_heaters").click(function(e) {
	$(this).find(".dropdown").removeClass("open");
	if ($(e.target).is("a")) {
		$(this).closest(".dropdown").removeClass("open");
	} else {
		e.stopPropagation();
	}
});

$("#ul_control_dropdown_tools .btn-active-temp, #ul_control_dropdown_tools .btn-standby-temp," +
	"#ul_control_dropdown_heaters .btn-active-temp, #ul_control_dropdown_heaters .btn-standby-temp").click(function(e) {
	$(this).parent().toggleClass("open");
	e.stopPropagation();
});

window.onerror = function (msg, url, lineNo, columnNo, error) {
	var errorMessage;
	if (msg.toLowerCase().indexOf("script error") == -1){
		errorMessage = [
			'Message: ' + msg,
			'URL: ' + url,
			'Line: ' + lineNo + ":" + columnNo,
			'Error object: ' + JSON.stringify(error)
		].join("<br/>");
	} else {
		errorMessage = 'Script Error: See Browser Console for Detail';
	}

	if (isConnected) {
		disconnect();
		showMessage("danger", T("JavaScript Error"), T("A JavaScript error has occurred so the web interface has closed the connection to your board. It is recommended to reload the web interface now. If this happens again, please contact the author and share this error message:") + "<br/><br/>" + errorMessage, 0);
	}

	return false;
};


/* Mixed events */

function cbHeaterClick(e) {
	if (isConnected && !$(this).hasClass("disabled") && lastStatusResponse != undefined) {
		var tool = $(this).closest("tr").data("tool");
		if (tool != undefined) {
			// Heater clicked on Tools panel. Change the associated tool
			if (tool == lastStatusResponse.currentTool) {
				changeTool(-1);
			} else {
				changeTool(tool);
			}
			$(this).blur();
		} else {
			// Heater clicked on Heaters panel. Work out what to do
			var heater = $(this).closest("tr").data("heater");
			if (heater == "bed") {
				var bedState = lastStatusResponse.temps.bed.state;
				if (bedState == 3) {
					showMessage("danger", T("Heater Fault"), T("<strong>Error:</strong> A heater fault has occured on this particular heater.<br/><br/>Please turn off your machine and check your wiring for loose connections."));
				} else if (bedState == 2) {
					// Put bed into standby mode
					sendGCode("M144");
				} else {
					// Bed is either off or in standby mode, send M140 to turn it back on
					sendGCode("M140 S" + lastStatusResponse.temps.bed.active);
				}
				$(this).blur();
			} else if (heater == "chamber") {
				var chamberState = lastStatusResponse.temps.chamber.state;
				if (chamberState == 3) {
					showMessage("danger", T("Heater Fault"), T("<strong>Error:</strong> A heater fault has occured on this particular heater.<br/><br/>Please turn off your machine and check your wiring for loose connections."));
				} else if (chamberState == 2) {
					// Put chamber into off mode
					sendGCode("M141 S-273.15");
				} else {
					// Bed is either off or in standby mode, send M140 to turn it back on
					sendGCode("M141 S" + lastStatusResponse.temps.chamber.active);
				}
				$(this).blur();
			} else {
				var heaterState = lastStatusResponse.temps.heads.state[heater - 1];
				if (heaterState == 3) {
					showMessage("danger", T("Heater Fault"), T("<strong>Error:</strong> A heater fault has occured on this particular heater.<br/><br/>Please turn off your machine and check your wiring for loose connections."));
				} else {
					var tools = getToolsByHeater(heater), hasToolSelected = false;
					tools.forEach(function(tool) {
						if (tool == lastStatusResponse.currentTool) {
							hasToolSelected = true;
						}
					});

					if (hasToolSelected) {
						changeTool(-1);
						$(this).blur();
					} else if (tools.length == 1) {
						changeTool(tools[0]);
						$(this).blur();
					} else if (tools.length > 0) {
						var popover = $(this).parent().children("div.popover");
						if (popover.length > 0) {
							$(this).popover("hide");
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
								title: T("Select Tool"),
								trigger: "manual",
								placement: "bottom",
							}).popover("show");
						}
					}
				}
			}
		}
	}
	e.preventDefault();
}


/* GUI Helpers */

function addBedTemperature(temperature) {
	// Drop-Down item
	$(".ul-bed-temp").append('<li><a href="#" class="bed-temp" data-temp="' + temperature + '">' + T("{0} °C", temperature) + '</a></li>');
	$(".btn-bed-temp").removeClass("disabled");

	// Entry on Settings page
	var item =	'<li class="list-group-item col-md-6" data-temperature="' + temperature + '">' + T("{0} °C", temperature);
	item +=		'<button class="btn btn-danger btn-sm btn-delete-parent pull-right" title="' + T("Delete this temperature item") + '">';
	item +=		'<span class="glyphicon glyphicon-trash"></span></button></li>';
	$("#ul_bed_temps").append(item);
}

function addDefaultGCode(label, gcode) {
	// Drop-Down item
	var item =	'<li><a href="#" class="gcode" data-gcode="' + gcode + '">';
	item +=		'<span>' + label + '</span>';
	item +=		'<span class="label label-primary">' + gcode + '</span>';
	item +=		'</a></li>';

	$(".ul-gcodes").append(item);
	$(".btn-gcodes").removeClass("disabled");

	// Entry on Settings page
	item =	'<tr><td><label class="label label-primary">' + gcode + '</label></td><td>' + label + '</td><td>';
	item +=	'<button class="btn btn-sm btn-danger btn-delete-parent" title="' + T("Delete this G-Code item") + '">';
	item += '<span class="glyphicon glyphicon-trash"></span></button></td></tr>';
	$("#table_gcodes > tbody").append(item);
}

function addHeadTemperature(temperature, type) {
	// Drop-Down item
	$(".ul-" + type + "-temp").append('<li><a href="#" class="heater-temp" data-temp="' + temperature + '">' + T("{0} °C", temperature) + '</a></li>');
	$(".btn-" + type + "-temp").removeClass("disabled");

	// Entry on Settings page
	var item =	'<li class="list-group-item col-xs-6 col-lg-3" data-temperature="' + temperature + '">' + T("{0} °C", temperature);
	item +=		'<button class="btn btn-danger btn-sm btn-delete-parent pull-right" title="' + T("Delete this temperature item") + '">';
	item +=		'<span class="glyphicon glyphicon-trash"></span></button></li>';
	$("#ul_" + type + "_temps").append(item);
}

function changeTool(tool) {
	// Check if any tool change macros can be skipped
	var param = 7;
	if (!settings.doTfree) { param &= ~1; }
	if (!settings.doTpre) { param &= ~2; }
	if (!settings.doTpost) { param &= ~4; }

	// If all the macros shall be run, send only the T-code
	if (param == 7) {
		sendGCode("T" + tool);
	} else {
		sendGCode("T" + tool + " P" + param);
	}
}

function clearBedTemperatures() {
	$(".ul-bed-temp, #ul_bed_temps").html("");
	$(".btn-bed-temp").addClass("disabled");
}

function clearDefaultGCodes() {
	$(".ul-gcodes").html("");
	$("#table_gcodes > tbody").children().remove();
	$(".btn-gcodes").addClass("disabled");
}

function clearHeadTemperatures() {
	$(".ul-active-temp, .ul-standby-temp, #ul_active_temps, #ul_standby_temps").html("");
	$(".btn-active-temp, .btn-standby-temp").addClass("disabled");
}

function setAxesHomed(axes) {
	// Set button colors and prepare list of unhomed axes
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
	if (axes.length > 3) {
		if (axes[3]) {
			$(".btn-home-u").removeClass("btn-warning").addClass("btn-primary");
		} else {
			unhomedAxes += ", U";
			$(".btn-home-u").removeClass("btn-primary").addClass("btn-warning");
		}
	}
	if (axes.length > 4) {
		if (axes[4]) {
			$(".btn-home-v").removeClass("btn-warning").addClass("btn-primary");
		} else {
			unhomedAxes += ", V";
			$(".btn-home-v").removeClass("btn-primary").addClass("btn-warning");
		}
	}
	if (axes.length > 5) {
		if (axes[5]) {
			$(".btn-home-w").removeClass("btn-warning").addClass("btn-primary");
		} else {
			unhomedAxes += ", W";
			$(".btn-home-w").removeClass("btn-primary").addClass("btn-warning");
		}
	}
	if (axes.length > 6) {
		if (axes[6]) {
			$(".btn-home-a").removeClass("btn-warning").addClass("btn-primary");
		} else {
			unhomedAxes += ", A";
			$(".btn-home-a").removeClass("btn-primary").addClass("btn-warning");
		}
	}
	if (axes.length > 7) {
		if (axes[7]) {
			$(".btn-home-b").removeClass("btn-warning").addClass("btn-primary");
		} else {
			unhomedAxes += ", B";
			$(".btn-home-b").removeClass("btn-primary").addClass("btn-warning");
		}
	}
	if (axes.length > 8) {
		if (axes[8]) {
			$(".btn-home-c").removeClass("btn-warning").addClass("btn-primary");
		} else {
			unhomedAxes += ", C";
			$(".btn-home-c").removeClass("btn-primary").addClass("btn-warning");
		}
	}

	// Set home alert visibility
	if (unhomedAxes == "") {
		$(".home-warning").addClass("hidden");
	} else {
		if (unhomedAxes.length > 3) {
			$("#unhomed_warning").html(T("The following axes are not homed: <strong>{0}</strong>", unhomedAxes.substring(2)));
		} else {
			$("#unhomed_warning").html(T("The following axis is not homed: <strong>{0}</strong>", unhomedAxes.substring(2)));
		}
		$(".home-warning").removeClass("hidden");
	}
}

function setATXPower(value) {
	$("input[name='atxPower']").prop("checked", false).parent().removeClass("active");
	$("input[name='atxPower'][value='" + (value ? "1" : "0") + "']").prop("checked", true).parent().addClass("active");
}

function setBoardType(type) {
	var isWiFi = false;
	var show7Extruders = false, show7Heaters = false;

	if (type.indexOf("duetwifi") == 0) {
		firmwareFileName = "DuetWiFiFirmware";
		isWiFi = show7Extruders = show7Heaters = true;
	} else if (type.indexOf("duetethernet") == 0) {
		firmwareFileName = "DuetEthernetFirmware";
		show7Extruders = show7Heaters = true;
	} else {
		firmwareFileName = "RepRapFirmware";
	}

	$(".7-extruders").toggleClass("hidden", !show7Extruders);
	$(".7-heaters").toggleClass("hidden", !show7Heaters);
	$(".wifi-setting").toggleClass("hidden", !isWiFi);

	boardType = type;
}

function setCurrentTemperature(heater, temperature) {
	// Set current heater temperature
	var tempCell = $("#div_tools_heaters tr[data-heater='" + heater + "'] > td.current");
	if (temperature == undefined) {
		tempCell.html(T("n/a"));
	} else if (temperature < -270) {
		tempCell.html(T("error"));
	} else {
		tempCell.html(T("{0} °C", temperature.toFixed(1)));
	}

	// Update Extrude+Retract buttons
	if (heater != "bed" && heater != "chamber" && lastStatusResponse != undefined) {
		if (lastStatusResponse.currentTool != -1) {
			var isActiveHead = false;
			getToolsByHeater(heater).forEach(function(tool) { if (tool == lastStatusResponse.currentTool) { isActiveHead = true; } });
			if (isActiveHead) {
				if (temperature >= coldRetractTemp) {
					$(".btn-retract").removeClass("disabled");
				} else {
					$(".btn-retract").addClass("disabled");
				}

				if (temperature >= coldExtrudeTemp) {
					$(".btn-extrude").removeClass("disabled");
				} else {
					$(".btn-extrude").addClass("disabled");
				}
			}
		} else {
			$(".btn-retract, .btn-extrude").addClass("disabled");
		}
	}
}

function setCurrentToolTemperature(tool, heater, temperature) {
	var tempCell = $("#table_tools tr[data-tool='" + tool + "'][data-heater='" + heater + "'] > td.current");
	if (temperature == undefined) {
		tempCell.html(T("n/a"));
	} else if (temperature < -270) {
		tempCell.html(T("error"));
	} else {
		tempCell.html(T("{0} °C", temperature.toFixed(1)));
	}
}

function setGeometry(g) {
	// The following may be extended in future versions
	if (g == "delta") {
		$("#btn_bed_compensation").text(T("Auto Delta Calibration"));
		$("#panel_head_movement .home-buttons div, #panel_head_movement div.home-buttons").addClass("hidden");
		$("#panel_head_movement td.home-buttons").css("padding-right", "0px");
		$("#btn_homeall").css("min-width", "");
	} else {
		$("#btn_bed_compensation").text(T("Auto Bed Compensation"));
		$("#panel_head_movement .home-buttons div, #panel_head_movement div.home-buttons").removeClass("hidden");
		$("#panel_head_movement td.home-buttons").css("padding-right", "");
		$("#btn_homeall").resize();
	}
	$("#dd_geometry").text(T(g.charAt(0).toUpperCase() + g.slice(1)));
	geometry = g;
}

function setHeaterState(heater, state, currentTool) {
	var statusText = getHeaterStateText(state);
	if (heater == "bed" || heater == "chamber") {
		$("#div_tools_heaters tr[data-heater='" + heater + "'] > th > span:last-child").text(statusText);
	} else {
		// Set status texts on Tools panel
		$("#table_tools > tbody > tr[data-heater='" + heater + "']").each(function() {
			$(this).find("span.heater-state").html(statusText);
		});

		// Set status texts on Heaters panel
		var tools = getToolsByHeater(heater);
		if (tools.length != 0) {
			var toolList = [];
			for(var i = 0; i < tools.length; i++) {
				toolList.push((tools[i] == currentTool) ? ("<u>T" + tools[i] + "</u>") : ("T" + tools[i]));
			}
			statusText += " (" + toolList.reduce(function(a, b) { return a + ", " + b; }) + ")";

			if (tools.length > 1) {
				$("#table_heaters > tbody > tr[data-heater='" + heater + "'] > th").find(".caret").removeClass("hidden");
			} else {
				$("#table_heaters > tbody > tr[data-heater='" + heater + "'] > th").find(".caret").addClass("hidden");
			}
		} else {
			$("#table_heaters tr > th:first-child").eq(heater).find(".caret").addClass("hidden");
		}
		$("#table_heaters > tbody > tr[data-heater='" + heater + "'] span.heater-state").html(statusText);
	}
}

function setPauseStatus(paused) {
	if (paused == isPaused) {
		return;
	}

	$("#div_cancel").toggleClass("hidden", !paused);
	if (paused) {
		$("#btn_cancel").removeClass("disabled");
		$("#btn_pause").removeClass("btn-warning disabled").addClass("btn-success").attr("title", T("Resume paused print (M24)"));
		$("#btn_pause > span.glyphicon").removeClass("glyphicon-pause").addClass("glyphicon-play");
		$("#btn_pause > span:last-child").text(T("Resume"));
	} else {
		$("#btn_pause").removeClass("btn-success").addClass("btn-warning").attr("title", T("Pause current print (M25)"));
		$("#btn_pause > span.glyphicon").removeClass("glyphicon-play").addClass("glyphicon-pause");
		$("#btn_pause > span:last-child").text(T("Pause Print"));
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

		layerData = [];
		currentLayerTime = maxLayerTime = lastLayerPrintDuration = 0;
		drawPrintChart();
		printHasFinished = false;

		// Progress is set in the status response callback

		$(".btn-upload").addClass("disabled");
		$("#page_general .btn-upload").removeClass("disabled");

		$("#btn_pause").removeClass("disabled");
		$("#div_print_another").addClass("hidden");
		$(".row-progress").removeClass("hidden");
		$("#td_last_layertime").html(T("n/a"));

		requestFileInfo();
	} else {
		$("#btn_pause").addClass("disabled");
		$(".btn-upload").toggleClass("disabled", !isConnected);

		if (!isConnected || fileInfo == undefined) {
			$(".row-progress").addClass("hidden");
		}

		if (isConnected) {
			if ($("#auto_sleep").is(":checked")) {
				sendGCode("M1");
				$("#auto_sleep").prop("checked", false);
			}

			if (!printHasFinished && currentLayerTime > 0) {
				addLayerData(currentLayerTime, true);
				$("#td_layertime").html(T("n/a"));
			}
			printHasFinished = true;

			if (fileInfo != undefined) {
				$("#div_print_another").removeClass("hidden");
				$("#btn_print_another").data("file", fileInfo.fileName);

				setProgress(100, T("Printed {0}, 100% Complete", fileInfo.fileName), undefined);
			} else {
				setProgress(100, T("Print Complete!"), undefined);
			}

			["filament", "layer", "file"].forEach(function(id) {
				if ($("#tl_" + id).html() != T("n/a")) {
					$("#tl_" + id).html("00s");
					$("#et_" + id).html((new Date()).toLocaleTimeString());
				}
			});
		}

		fileInfo = undefined;
	}

	isPrinting = printing;

	if (waitingForPrintStart && printing) {
		$("#modal_upload").modal("hide");
		showPage("print");
		waitingForPrintStart = false;
	}
}

function setProbeValue(value, secondaryValue) {
	if (value < 0) {
		$("#td_probe").html(T("n/a"));
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

	if (progress == 100) {
		Piecon.reset();
	} else {
		Piecon.setProgress(progress);
	}
}

function setStatusLabel(text, style) {
	text = T(text);
	$(".label-status").removeClass("label-default label-danger label-info label-warning label-success label-primary").addClass("label-" + style).text(text);
}

function setTemperatureInput(heater, value, active, setToolHeaters) {
	var prefix = (setToolHeaters) ? "" : "#table_heaters ";

	var tempInput = undefined;
	if (heater == "bed") {
		tempInput = $(prefix + "tr[data-heater='bed'] input");
	} else if (heater == "chamber") {
		tempInput = $(prefix + "tr[data-heater='chamber'] input");
	} else {
		var activeOrStandby = (active) ? "active": "standby";
		tempInput = $(prefix + "tr[data-heater='" + heater + "'] input[data-type='" + activeOrStandby + "']");
	}

	if (tempInput != undefined) {
		// FIXME: This limits inputs to 0C. Maybe it should be configurable instead?
		tempInput.filter(":not(:focus)").val((value < 0) ? 0 : value);
	}
}

function setToolTemperatureInput(tool, heater, value, active) {
	// Update Heaters panel as well
	setTemperatureInput(heater, value, active, false);

	var tempInput = undefined;
	if (heater == "bed") {
		tempInput = $("#table_tools tr[data-heater='bed'] input");
	} else if (heater == "chamber") {
		tempInput = $("#table_tools tr[data-heater='chamber'] input");
	} else {
		var activeOrStandby = (active) ? "active": "standby";
		tempInput = $("#table_tools tr[data-tool='" + tool + "'][data-heater='" + heater + "'] input[data-type='" + activeOrStandby + "']");
	}

	if (tempInput != undefined) {
		// FIXME: This limits inputs to 0C. Maybe it should be configurable instead?
		tempInput.filter(":not(:focus)").val((value < 0) ? 0 : value);
	}
}

function setTimeLeft(field, value) {
	if (value == undefined || (value == 0 && isPrinting)) {
		$("#et_" + field + ", #tl_" + field).html(T("n/a"));
	} else {
		// Estimate end time
		var now = new Date();
		var estEndTime = new Date(now.getTime() + value * 1000); // Date uses ms
		$("#et_" + field).html(estEndTime.toLocaleTimeString());

		// Estimate time left
		$("#tl_" + field).html(formatTime(value));
	}
}

function setMachineName(name) {
	if (name == machineName) {
		return;
	}

	$("#title, .machine-name").text(name);
	machineName = name;
}

function showPage(name) {
	$(".navitem, .page").removeClass("active");
	$(".navitem-" + name + ", #page_" + name).addClass("active");

	if (name != currentPage) {
		if (name == "control") {
			$("#slider_fan_control").slider("relayout");
			if (currentMacroDirectory == "0:/macros" && !macrosLoaded) {
				updateMacroFiles();
			}
		}

		if (name == "print") {
			$("#slider_speed").slider("relayout");
			$("#slider_fan_print").slider("relayout");
			for(var extr = 1; extr <= maxExtruders; extr++) {
				$("#slider_extr_" + extr).slider("relayout");
			}
			if (refreshPrintChart) {
				drawPrintChart();
			}
			waitingForPrintStart = false;
		}

		if (name == "scanner") {
			if (scansLoaded) {
				$(".span-refresh-scans").removeClass("hidden");
			} else {
				updateScanFiles();
			}
		} else {
			$(".span-refresh-scans").addClass("hidden");
		}

		if (name == "console") {
			currentPage = "console";
			if (windowIsMdLg()) {
				$("#page_console input").focus();
			}
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

		if (name == "macros" && isConnected) {
			if (macrosLoaded) {
				$(".span-refresh-macros").removeClass("hidden");
			} else {
				updateMacroFiles();
			}
		} else {
			$(".span-refresh-macros").addClass("hidden");
		}

		if (name == "filaments" && isConnected) {
			if (filamentsLoaded) {
				$(".span-refresh-filaments").removeClass("hidden");
			} else {
				updateFilaments();
			}
		} else {
			$(".span-refresh-filaments").addClass("hidden");
		}

		if (name == "settings" && isConnected) {
			getConfigResponse();

			if ($("#page_ui").is(".active")) {
				$("#btn_clear_cache").toggleClass("disabled", $.isEmptyObject(cachedFileInfo));
			} else if ($("#page_sysedit").is(".active")) {
				if (sysLoaded) {
					$("#a_refresh_sys").removeClass("hidden");
				} else {
					updateSysFiles();
				}
			}
		}
	}

	// Scroll to top of the main content on small devices
	if (windowIsXsSm() && $(".btn-hide-info").hasClass("active")) {
		$('html, body').animate({
			scrollTop: ($('#main_content').offset().top)
		}, 500);
	}
	currentPage = name;
}


/* Theme support */

function applyThemeColors() {
	// Update temp chart colors and repaint it
	for(var heater = 0; heater < maxHeaters; heater++) {
		tempChartOptions.colors[heater] = $(".heater-" + heater).css("color");
	}
	tempChartOptions.colors[maxHeaters] = $(".chamber").css("color");
	for(var tempSensor = 0; tempSensor < maxTempSensors; tempSensor++) {
		tempChartOptions.colors[maxHeaters + 1 + tempSensor] = $(".temp-sensor-" + tempSensor).css("color");
	}

	if (tempChart != undefined) {
		tempChart.destroy();
		tempChart = undefined;
		drawTemperatureChart();
	}

	// Update layer times chart
	printChartOptions.colors[0] = getColorFromCSS("chart-print-line");
	if (printChart != undefined) {
		printChart.destroy();
		printChart = undefined;
		drawPrintChart();
	}

	// Update background color for print chart tooltip
	if (settings.theme == "dark") {
		$("#layer_tooltip").css("background-color", $("#panel_print_info").css("background-color"));
	} else {
		$("#layer_tooltip").css("background-color", "");
	}

	// Update Z-probe colors
	probeSlowDownColor = getColorFromCSS("probe-slow-down");
	probeTriggerColor = getColorFromCSS("probe-trigger");
}

function getColorFromCSS(classname)
{
	var ghostSpan = $('<span class="hidden ' + classname + '"></span>');
	ghostSpan.appendTo("body");
	var color = ghostSpan.css("color");
	ghostSpan.remove();
	return color;
}
