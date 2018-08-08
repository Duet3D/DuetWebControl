/* Main interface logic for Duet Web Control
 * 
 * written by Christian Hammacher (c) 2016-2018
 * 
 * licensed under the terms of the GPL v3
 * see http://www.gnu.org/licenses/gpl-3.0.html
 */

var machineName = "Duet Web Control";
var boardType = "unknown", allowCombinedFirmware = false;

var maxAxes = 9, maxExtruders = 9, maxDrives = 12, axisOrder = "XYZUVWABC";
var maxHeaters = 8, maxTempSensors = 10, maxFans = 9;
var probeSlowDownColor = "#FFFFE0", probeTriggerColor = "#FFF0F0";

var webcamUpdating = false, calibrationWebcamUpdating = false;

var fileInfo, currentLayerTime, lastLayerPrintDuration;
var isPrinting, isPaused, printHasFinished, waitingForPrintStart;

var geometry, probeSlowDownValue, probeTriggerValue;
var axisNames, numAxes, numExtruderDrives, numVolumes;
var heaterNames, bedHeater = 0, chamberHeater = -1, cabinetHeater = -1, numTempSensors;
var fanNames, controllableFans;
var coldExtrudeTemp, coldRetractTemp, tempLimit;

var toolMapping = undefined;
var spindleTools, spindleCurrents, spindleActives;

var currentPage = "control";


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
	lastGCodeFromInput = false;

	probeSlowDownValue = probeTriggerValue = undefined;

	heaterNames = undefined;
	bedHeater = 0;
	chamberHeater = cabinetHeater = -1;
	numTempSensors = 0;

	axisNames = ["X", "Y", "Z", "U", "V", "W", "A", "B", "C"];
	numAxes = 3;			// only 3 are visible on load
	numExtruderDrives = 2;	// only 2 are visible on load

	fanNames = undefined;
	controllableFans = 0;

	coldExtrudeTemp = 160;
	coldRetractTemp = 90;
	tempLimit = 280;

	spindleTools = [];
	spindleCurrents = [];
	spindleActives = [];

	resetChartData();
	lastLayerPrintDuration = 0;

	setToolMapping([]);

	resetFiles();

	waitingForPrintStart = false;
}

$(document).ready(function() {
	$('[data-min]').each(function() { $(this).attr("min", $(this).data("min")).attr("step", "any"); });
	$('[data-max]').each(function() { $(this).attr("max", $(this).data("max")).attr("step", "any"); });
	$('[data-toggle="popover"]').popover();
	$(".app-control").toggleClass("hidden", typeof app === "undefined");

	disableControls();
	resetGuiData();
	updateGui();

	loadSettings();
	loadFileCache();
	loadTableSorting();
	loadFanVisibility();
	loadGCodes();

	// NB: Recreating the typeahead instances is buggy. Do NOT attempt to do this!
	$(".gcode-input input").typeahead({
		autoSelect: false,
		fitToElement: true,
		source: function(arg, cb) { cb(rememberedGCodes); }
	});
});

function pageLoadComplete() {
	// Add link to GitHub, replace dash in Z-probe and log event
	$("#span_copyright").html($("#span_copyright").html().replace("Christian Hammacher", '<a href="https://github.com/chrishamm/DuetWebControl" target="_blank">Christian Hammacher</a>'));
	$("#th_probe").html(T("Z-Probe").replace("-", "-&#8203;"));
	log("info", "<strong>" + T("Page Load complete!") + "</strong>");

	// Try to connect once the page has been loaded provided this is not running on localhost
	connect(sessionPassword, true);

	// Check if this browser is supported and display a message if it is not
	var userAgent = navigator.userAgent.toLowerCase();
	var browserSupported = true;
	browserSupported &= (String.prototype.startsWith != undefined);
	browserSupported &= (userAgent.indexOf("webkit") != -1 || userAgent.indexOf("gecko") != -1);
	if (!browserSupported) {
		showMessage("warning", T("Unsupported browser"), "<strong>" + T("Warning") + ":</strong> " + T("Your browser is not officially supported. To achieve the best experience it is recommended to use either Mozilla Firefox, Google Chrome or Opera."), 0, true);
	}

	// Make sure the loaded JS matches the HTML version
	if (typeof dwcVersion != "undefined" && dwcVersion != $("#dwc_version").text()) {
		showMessage("warning", T("Version mismatch"), "<strong>" + T("Warning") + ":</strong> " + T("The versions of your HTML and JavaScript files do not match. This can lead to unpredictable behavior and other problems. Please install Duet Web Control once more and clear your browser cache."), 0, false);
	}
}

function updateGui() {
	// Visibility of the Extra temperatures panel
	if (numTempSensors == 0) {
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

				var spindleIndex = -1;
				for(var i = 0; i < spindleTools.length; i++) {
					if (spindleTools[i] == tool.number) {
						spindleIndex = i;
						break;
					}
				}

				if (spindleIndex >= 0) {
					row +=	'<td></td>';
					row +=	'<td><span class="spindle-current">' + T("{0} RPM", spindleCurrents[spindleIndex]) + '</span></td>';
					row +=	'<td class="input-td"><div class="input-group input-group-sm">';
					row +=		'<input type="number" class="form-control spindle-active" value="' + spindleActives[spindleIndex] + '">';
					row +=		'<span class="input-group-addon">RPM</span>';
					row +=	'</div></td>';
					row +=	'<td></td>';
				} else {
					row +=	'<td colspan="4"></td>';
				}
				row +=	'</tr>';
				generatedHTML += row;
			} else {
				var heaterIndex = 0;
				tool.heaters.forEach(function(heater) {
					var heaterName = (heaterNames == undefined || heaterNames[heater] == "") ? T("Heater {0}", heater) : heaterNames[heater];
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
							} else if (heater == cabinetHeater && lastStatusResponse.temps.hasOwnProperty("cabinet")) {
								heaterState = getHeaterStateText(lastStatusResponse.temps.cabinet.state);
								currentTemp = T("{0} °C", lastStatusResponse.temps.cabinet.current.toFixed(1));
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

		// Set current tool again
		if (lastStatusResponse != undefined) {
			setCurrentTool(lastStatusResponse.currentTool);
		}
	} else {
		var toolRows = $(initialTools);
		updateFixedToolTemps(toolRows);
		toolRows.prependTo("#table_tools > tbody");
	}

	// Bed heater
	$("tr[data-heater='bed']").toggleClass("hidden", bedHeater == -1);
	if (bedHeater != -1) {
		var heaterName = (heaterNames == undefined || heaterNames[bedHeater] == "") ? T("Heater {0}", bedHeater) : heaterNames[bedHeater];
		$("#table_tools tr[data-heater='bed'] > th:nth-child(2) > a").text(heaterName);
		$("#table_tools tr[data-heater='bed'] > th:nth-child(2) > a, #table_heaters tr[data-heater='bed'] > th:first-child > a").removeClass().addClass("heater-" + bedHeater);
	}

	// Chamber heater
	$("tr[data-heater='chamber']").toggleClass("hidden", chamberHeater == -1);
	if (chamberHeater != -1) {
		var heaterName = (heaterNames == undefined || heaterNames[chamberHeater] == "") ? T("Heater {0}", chamberHeater) : heaterNames[chamberHeater];
		$("#table_tools tr[data-heater='chamber'] > th:nth-child(2) > a").text(heaterName);
		$("#table_tools tr[data-heater='chamber'] > th:nth-child(2) > a, #table_heaters tr[data-heater='chamber'] > th:first-child > a").removeClass().addClass("heater-" + chamberHeater);
	}

	// Cabinet heater
	$("tr[data-heater='cabinet']").toggleClass("hidden", cabinetHeater == -1);
	if (cabinetHeater != -1) {
		var heaterName = (heaterNames == undefined || heaterNames[cabinetHeater] == "") ? T("Heater {0}", cabinetHeater) : heaterNames[cabinetHeater];
		$("#table_tools tr[data-heater='cabinet'] > th:nth-child(2) > a").text(heaterName);
		$("#table_tools tr[data-heater='cabinet'] > th:nth-child(2) > a, #table_heaters tr[data-heater='cabinet'] > th:first-child > a").removeClass().addClass("heater-" + cabinetHeater);
	}

	// Visibility of heater temperatures (deprecated)
	for(var i = 1; i < maxHeaters; i++) {
		var hideHeater = (i > 2 && !isConnected) || (getToolsByHeater(i).length == 0 && isConnected);
		$("#table_heaters tr[data-heater='" + i + "']").toggleClass("hidden", hideHeater);
	}

	// Update movement steps
	applyMovementSteps();

	// Visibility of axis positions in the Machine Status panel
	for(var i = 0; i < maxAxes; i++) {
		var isHidden = (i >= numAxes); // || (vendor == "diabase" && i < axisNames.length && "UVW".indexOf(axisNames[i]) != -1);

		var cells = $(".table-axis-positions [data-axis='" + i + "']");
		cells.toggleClass("hidden", isHidden);
		cells.css("border-right", (i + 1 < numAxes) ? "1px" : "0px");
	}

	// Visibility of additional axis control buttons
	$("#panel_extra_axes").toggleClass("hidden", numAxes <= 3);

	for(var i = 3; i < maxAxes; i++) {
		var isHidden = (i >= numAxes); // || (vendor == "diabase" && i < axisNames.length && "UVW".indexOf(axisNames[i]) != -1);

		var row = $("#table_move_axes > tbody > tr").eq(i - 3);
		if (isHidden) {
			row.addClass("hidden");
		} else {
			row.removeClass("hidden");
			if (i + 1 == numAxes) {
				row.find("div.btn-group").css("padding-bottom", "0px");
			} else {
				row.find("div.btn-group").removeAttr("style");
			}
		}
		$(".mobile-home-buttons [data-axis='" + i + "']").parent().toggleClass("hidden", isHidden);
	}

	// Update homed axes once more
	if (lastStatusResponse != undefined) {
		setAxesHomed(lastStatusResponse.coords.axesHomed);
	}

	// Fan Names
	for(var fan = 0; fan < maxFans; fan++) {
		var fanName = (fanNames == undefined || fanNames.length <= fan || fanNames[fan] == "") ? T("Fan {0}", fan) : fanNames[fan];
		$("tr[data-fan=" + fan + "] > td:first-child > button").text(fanName);
	}

	// Visibility of extrusion factor sliders
	var numExtrudersToShow = (isConnected && hideLastExtruderDrive) ? Math.max(numExtruderDrives - 1, 0) : numExtruderDrives;
	for(var i = 0; i < maxExtruders; i++) {
		if (i < numExtrudersToShow) {
			$(".extr-" + i).removeClass("hidden");
			$("#slider_extr_" + i).slider("relayout");
		} else {
			$(".extr-" + i).addClass("hidden");
		}
	}

	// Appearance of extruder drive cells + extrusion factor slider panel
	$("#th_extruder_drives, #panel_extrusion_factors").toggleClass("hidden", numExtruderDrives <= 0);
	for(var i = 0; i < maxExtruders; i++) {
		var cells = $("#table_extruder_positions [data-extruder='" + i + "']");
		cells.toggleClass("hidden", i >= numExtrudersToShow);
		cells.css("border-right", (i + 1 < numExtrudersToShow) ? "1px" : "0px");
	}

	// Rearrange extruder drive cells if neccessary. Only show total usage on md desktop if more than three extruders are in use
	if (numExtruderDrives <= 3) {
		$("#table_extruder_positions [data-extruder='total']").addClass("hidden-md");
		for(var i = 0; i < 3; i++) {
			$("#table_extruder_positions th[data-extruder='" + i + "']").removeClass("hidden-md").html(T("Drive {0}", i));
			$("#table_extruder_positions td[data-extruder='" + i + "']").removeClass("hidden-md");
		}
	} else {
		$("#table_extruder_positions [data-extruder='total']").removeClass("hidden-md");
		for(var i = 0; i < maxExtruders; i++) {
			$("#table_extruder_positions th[data-extruder='" + i + "']").addClass("hidden-md").html(T("D{0}", i));
			$("#table_extruder_positions td[data-extruder='" + i + "']").addClass("hidden-md");
		}
	}

	// Do some rearrangement if we have fewer than four extruders and fewer than five axes
	if ((numExtruderDrives <= 3 && numAxes <= 4) || vendor == "diabase") {
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

	// Tool list on Calibration page (OEM)
	if (vendor == "diabase") {
		$("#table_calibration_tools > tbody").children().remove();
		for(var i = 0 ; i < toolMapping.length; i++) {
			var tool = toolMapping[i];
			if (!tool.hasOwnProperty("offsets")) {
				tool.offsets = [ 0.0, 0.0, 0.0 ];
			}

			var row = '<tr data-tool="' + tool.number + '">';
			row += '<td>' + ((tool.name == "") ? T("Tool {0}", tool.number) : tool.name) + '</td><td>';
			row += '<button class="btn btn-default tool-offset-up" data-axis="X"><span class="glyphicon glyphicon-arrow-left"></span> Left</button>';
			row += '<span>' + T("{0} mm", tool.offsets[0].toFixed(2)) + '</span>';
			row += '<button class="btn btn-default tool-offset-down" data-axis="X"><span class="glyphicon glyphicon-arrow-right"></span> Right</button>';
			row += '</td><td>';
			row += '<button class="btn btn-default tool-offset-up" data-axis="Y"><span class="glyphicon glyphicon-arrow-down"></span> Front</button>';
			row += '<span>' + T("{0} mm", tool.offsets[1].toFixed(2)) + '</span>';
			row += '<button class="btn btn-default tool-offset-down" data-axis="Y"><span class="glyphicon glyphicon-arrow-up"></span> Back</button>';
			row += '</td><td>';
			row += '<button class="btn btn-default tool-offset-up" data-axis="Z"><span class="glyphicon glyphicon-arrow-up"></span> Up</button>';
			if (i == 0) {
				row += '<span id="span_probe_height">' + T("{0} mm", zTriggerHeight.toFixed(2)) + '</span>';
			} else {
				row += '<span>' + T("{0} mm", tool.offsets[2].toFixed(2)) + '</span>';
			}
			row += '<button class="btn btn-default tool-offset-down" data-axis="Z"><span class="glyphicon glyphicon-arrow-down"></span> Down</button>';
			row += '</td><td>';
			row += '<button class="btn btn-success tool-calibrate"><span class="glyphicon glyphicon-screenshot"></span> ' + T("Calibrate") + '</button>';
			row += '</td><td>';
			row += '<button class="btn btn-info tool-set-offset"><span class="glyphicon glyphicon-ok"></span> ' + T("Set Offset") + '</button>';
			row += '</td></tr>';

			var rowElem = $("#table_calibration_tools > tbody").append(row);
			if (i == 0) {
				rowElem.find('button[data-axis="X"]').addClass("disabled");
				rowElem.find('button[data-axis="Y"]').addClass("disabled");
				rowElem.find('button.tool-calibrate').addClass("disabled");
			}
		}
	}

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
	// Navbar
	setMachineName("Duet Web Control");
	setStatusLabel("Disconnected", "default");

	// Heater Temperatures
	$("#div_tools_heaters span.heater-state").text("");
	setCurrentTemperature("bed",  undefined);
	setTemperatureInput("bed", 0, true, false);
	setCurrentTemperature("chamber",  undefined);
	setTemperatureInput("chamber", 0, true, false);
	setCurrentTemperature("cabinet",  undefined);
	setTemperatureInput("cabinet", 0, true, false);
	for(var i = 1; i < maxHeaters; i++) {
		setCurrentTemperature(i, undefined);
		setTemperatureInput(i, 0, true, false);
		setTemperatureInput(i, 0, false, false);
	}

	// Status fields
	$("#span_mode").addClass("hidden");
	$("td[data-axis], td[data-extruder], .table-status td").text(T("n/a"));
	setProbeValue(-1, undefined);

	// Control page
	clearBedPoints();
	setAxesHomed([1, 1, 1]);
	setATXPower(false);
	$('#slider_fan_control_print').slider("setValue", 35);
	$(".compensation").addClass("hidden");

	// Hide Scanner and Calibration pages
	$(".scan-control").addClass("hidden");
	$("#div_content").resize();
	if (currentPage == "scanner" || currentPage == "calibration") {
		showPage("control");
	}

	// Print Status
	$(".row-progress").addClass("hidden");
	setProgress(100, "", "");
	$("#div_print_another").addClass("hidden");
	$("#override_fan, #auto_sleep").prop("checked", false);
	$("#span_babystepping, #page_print dd, #panel_print_info table td, #table_estimations td").html(T("n/a"));

	// Fan Sliders
	for(var i = 0; i < maxFans; i++) {
		setFanVisibility(i, controllableFans & (1 << i));
	}
	$('#slider_fan_print_print').slider("setValue", 35);
	
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
	$("#table_drives > tbody > tr > td:not(:first-child), #page_machine dd").html(T("n/a"));
	$("#table_drives > tbody > tr").removeClass("hidden");

	updateSysFiles();
	updateDisplayFiles();

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

function updateCalibrationWebcam(externalTrigger, id) {
	if ((externalTrigger && calibrationWebcamUpdating) || calibrationWebcamSource == "") {
		return;
	}

	if (calibrationWebcamSource == "") {
		calibrationWebcamUpdating = false;
		$("#div_calibration_webcam").addClass("hidden");
	} else {
		$("#div_webcam_calibration").removeClass("hidden");
		$("#img_webcam_calibration").toggleClass("hidden", calibrationWebcamEmbedded);
		$("#div_ifm_webcam_calibration").toggleClass("hidden", !calibrationWebcamEmbedded);

		if (calibrationWebcamEmbedded) {
			$("#ifm_webcam_calibration").attr("src", calibrationWebcamSource);
		} else {
			var newURL = (id == undefined) ? calibrationWebcamSource : calibrationWebcamSource.replace(".", id + ".");
			if (settings.webcamInterval > 0) {
				if (settings.webcamFix) {
					newURL += "_" + Math.random();
				} else {
					if (newURL.indexOf("?") == -1) {
						newURL += "?dummy=" + Math.random();
					} else {
						newURL += "&dummy=" + Math.random();
					}
				}

				calibrationWebcamUpdating = true;
				setTimeout(function() {
					updateCalibrationWebcam(false);
				}, settings.webcamInterval);
			}
			$("#img_webcam_calibration").attr("src", newURL);
		}
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
	var heater = $(this).closest("tr").data("heater");
	if (heater == "bed") {
		sendGCode("M140 S" + $(this).data("temp"));		// Set bed temperature
	} else if (heater == "chamber") {
		sendGCode("M141 S" + $(this).data("temp"));		// Set chamber temperature
	} else if (heater == "cabinet") {
		sendGCode("M141 P1 S" + $(this).data("temp"));	// Set cabinet temperature
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
	if (heater == "bed" || heater == "chamber" || heater == "cabinet") {
		return;
	}

	// Has the user pressed enter or tab (on Android)?
	var enterKeyPressed = (e.which == 13);
	enterKeyPressed |= (e.which == 9 && windowIsXsSm());
	if (isConnected && enterKeyPressed) {
		var tool = $(this).closest("tr").data("tool");
		if ($(this).hasClass("spindle-active")) {
			// Call M3 to set the spindle RPM
			for(var i = 0; i < spindleTools.length; i++) {
				if (spindleTools[i] == tool) {
					if ($(this).val() >= 0) {
						sendGCode("M3 P" + i + " S" + $(this).val());
					} else {
						sendGCode("M4 P" + i + " S" + -$(this).val());
					}
				}
			}
		} else {
			// Set active or standby temperature
			var type = $(this).data("type");

			var temps = [];
			getTool(tool).heaters.forEach(function(h) {
				var cell = $("#table_tools > tbody > tr[data-tool='" + tool + "'][data-heater='" + h + "'] > td");
				temps.push(cell.find("div > input[data-type='" + type + "']").val());
			});

			var gcode = "G10 P" + tool  + " " + (type == "active" ? "S" : "R");
			gcode += temps.reduce(function(a, b) { return a + ":" + b; });
			sendGCode(gcode);
		}

		$(this).select();
		e.preventDefault();
	}
});

$("#table_tools").on("click", "tr > th:first-child > a", function(e) {
	// Ignore bed and chamber heaters. They're handled by a static event callback
	var heater = $(this).closest("tr").data("heater");
	if (heater == "bed" || heater == "chamber" || heater == "cabinet") {
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
				content += '<a href="#" class="load-filament"><span class="glyphicon glyphicon glyphicon-arrow-down"></span> ' + T("Load Filament") + '</a>';
			} else {
				content += '<a href="#" class="change-filament"><span class="glyphicon glyphicon-transfer"></span> ' + T("Change Filament") + '</a>';
				content += '</br>';
				content += '<a href="#" class="unload-filament"><span class="glyphicon glyphicon-arrow-up"></span> ' + T("Unload Filament") + '</a>';
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

$("#table_calibration_tools").on("click", ".tool-offset-up", function(e) {
	if (!$(this).hasClass("disabled")) {
		var axis = $(this).data("axis");
		var changeTriggerHeight = (axis == "Z" && $(this).parents("tr").prop("rowIndex") == 1);
		if (changeTriggerHeight)
		{
			zTriggerHeight -= 0.01;
			sendGCode("G31 Z" + zTriggerHeight + "\nM290 S-0.01\nM500 P31");
			$(this).parents("td").children("span").text(T("{0} mm", zTriggerHeight.toFixed(2)));
		}
		else
		{
			var toolNumber = $(this).parents("tr").data("tool");
			var tool = getTool($(this).parents("tr").data("tool"));
			if (tool.hasOwnProperty("offsets")) {
				var axisIndex = ((axis == "X") ? 0 : ((axis == "Y") ? 1 : 2));
				tool.offsets[axisIndex] = Math.round((tool.offsets[axisIndex] + 0.01) * 100) / 100;
				sendGCode("G10 P" + toolNumber + " " + axis + tool.offsets[axisIndex] + "\nM500 P31");
				$(this).parents("td").children("span").text(T("{0} mm", tool.offsets[axisIndex].toFixed(2)));
			}
		}
	}
});

$("#table_calibration_tools").on("click", ".tool-offset-down", function(e) {
	if (!$(this).hasClass("disabled")) {
		var axis = $(this).data("axis");
		var changeTriggerHeight = (axis == "Z" && $(this).parents("tr").prop("rowIndex") == 1);
		if (changeTriggerHeight)
		{
			zTriggerHeight += 0.01;
			sendGCode("G31 Z" + zTriggerHeight + "\nM290 S0.01\nM500 P31");
			$(this).parents("td").children("span").text(T("{0} mm", zTriggerHeight.toFixed(2)));
		}
		else
		{
			var toolNumber = $(this).parents("tr").data("tool");
			var tool = getTool(toolNumber);
			if (tool.hasOwnProperty("offsets")) {
				var axisIndex = ((axis == "X") ? 0 : ((axis == "Y") ? 1 : 2));
				tool.offsets[axisIndex] = Math.round((tool.offsets[axisIndex] - 0.01) * 100) / 100;
				sendGCode("G10 P" + toolNumber + " " + axis + tool.offsets[axisIndex] + "\nM500 P31");
				$(this).parents("td").children("span").text(T("{0} mm", tool.offsets[axisIndex].toFixed(2)));
			}
		}
	}
});

$("#table_calibration_tools").on("click", ".tool-calibrate", function(e) {
	var toolNumber = $(this).parents("tr").data("tool");
	showConfirmationDialog(T("Calibrate Tool"), T("Before you proceed please make sure that the calibration tool is installed. Continue?"),
		function() {
			sendGCode('M98 P"tcalibrate' + toolNumber + '.g"');
		}
	);
});

$("#table_calibration_tools").on("click", ".tool-set-offset", function(e) {
	if (lastStatusResponse != undefined) {
		var toolNumber = $(this).parents("tr").data("tool");
		sendGCode("G10 P" + toolNumber + " X" + lastStatusResponse.coords.xyz[0] + " Y" + lastStatusResponse.coords.xyz[1] + "\nM500");

		$(this).closest("tr").find("td:nth-child(2) > span").text(T("{0} mm", lastStatusResponse.coords.xyz[0].toFixed(2)));
		$(this).closest("tr").find("td:nth-child(3) > span").text(T("{0} mm", lastStatusResponse.coords.xyz[1].toFixed(2)));
	}
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

$("#a_list_devices").click(function(e) {
	app.listDevices();
	e.preventDefault();
});

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

		// Turn off cabinet
		if (cabinetHeater != -1) {
			gcode += "M141 P1 S-273.15\n";
		}

		sendGCode(gcode);
	}
	e.preventDefault();
});

$("#a_download_text").click(function(e) {
	var textContent = "";
	$("#console_log > div.row").each(function() {
		var time = $(this).children().eq(0).text();
		var event = $(this).children().eq(1).children("strong").text();
		var response = $(this).children().eq(1).children("span").text();
		event = event.replace(/"/g,'""');
		response = response.replace(/"/g,'""');
		textContent += time + ": " + (response == "" ? event : (event + ": " + response)) + "\r\n";
	});

	var file = new File([textContent], "console.txt", {type: "text/plain;charset=utf-8"});
	saveAs(file);
	e.preventDefault();
});

$("#a_download_csv").click(function(e) {
	var csvContent = '"time","event","response"\r\n';
	$("#console_log > div.row").each(function() {
		var time = $(this).children().eq(0).text();
		var event = $(this).children().eq(1).children("strong").text();
		var response = $(this).children().eq(1).children("span").text();
		event = event.replace(/"/g,'""');
		response = response.replace(/"/g,'""');
		csvContent += '"' + time + '","' + event + '","' + response + '"\r\n';
	});

	var file = new File([csvContent], "console.csv", {type: "text/csv;charset=utf-8"});
	saveAs(file);
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

$("#img_webcam").click(function() {
	updateWebcam(true);
});

$("#img_webcam_calibration").click(function() {
	updateCalibrationWebcam(true);
});

$("#img_webcam_calibration").resize(function() {
	if (!calibrationWebcamEmbedded) {
		$("#img_crosshair").css("left", $(this).position().left + $(this).width() / 2 - $("#img_crosshair").width() / 2);
		$("#img_crosshair").css("top", $(this).position().top + $(this).height() / 2 - $("#img_crosshair").height() / 2);
	}
});

$("#ifm_webcam_calibration").resize(function() {
	if (calibrationWebcamEmbedded) {
		$("#img_crosshair").css("left", $("#div_ifm_webcam_calibration").position().left + $(this).width() / 2 - $("#img_crosshair").width() / 2);
		$("#img_crosshair").css("top", $("#div_ifm_webcam_calibration").position().top + $(this).height() / 2 - $("#img_crosshair").height() / 2);
	}
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

$("#btn_calibrate_all").click(function() {
	showConfirmationDialog(T("Calibrate Tool"), T("Before you proceed please make sure that the calibration tool is installed. Continue?"),
		function() {
			sendGCode('M98 P"calibrate_all.g"');
		}
	);
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

$('input[name="feed"]').parent().contextmenu(function(e) {
	showStepDialog("amount", $(this).index(), Math.abs($(this).children("input").prop("value")));
	e.preventDefault();
});

$('input[name="feedrate"]').parent().contextmenu(function(e) {
	showStepDialog("feedrate", $(this).index(), Math.abs($(this).children("input").prop("value")));
	e.preventDefault();
});

$("#btn_extrude").click(function(e) {
	var feedrate = $("#panel_extrude input[name=feedrate]:checked").val() * 60;
	var amount = $("#panel_extrude input[name=feed]:checked").val();
	var drive = $("#panel_extrude input[name='extruder']:checked").val();

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
		$("#div_info_panels").addClass("hidden-sm");
		$("#div_content, #div_static_sidebar").addClass("content-collapsed-padding");
		setTimeout(function() {
			$(".btn-hide-info").removeClass("active");
		}, 100);
	} else {
		$("#div_info_panels").removeClass("hidden-sm");
		$("#div_content, #div_static_sidebar").removeClass("content-collapsed-padding");
		setTimeout(function() {
			$(".btn-hide-info").addClass("active");
		}, 100);
	}
	$(this).blur();
});

$("#table_move_head .btn-home[data-axis='0']").resize(function() {
	if (geometry != "delta") {
		var width = $(this).parent().width();
		if (width > 0) {
			$("#btn_homeall").css("min-width", width);
		}
	}
}).resize();

$("#btn_homeall").resize(function() {
	if (currentPage == "control") {
		// Ensure the Head Movement title is properly aligned in the center
		$(this).css("margin-right", $("#btn_bed_compensation").parent().width() - $(this).width() - 12);
	}
});

$(".btn-home").click(function(e) {
	if ($(this).data("axis") == "all") {
		sendGCode("G28");
	} else {
		var axisNumber = parseInt($(this).data("axis"));
		sendGCode("G28 " + axisNames[axisNumber]);
	}
	e.preventDefault();
});

$(".btn-move").click(function(e) {
	// Get the axis to move
	var axis = $(this).data("axis-letter");
	if (axis == undefined) {
		var axisNumber = parseInt($(this).data("axis"));
		axis = axisNames[axisNumber];
	}

	// Send a G-code
	var moveString = "M120\nG91\nG1 ";
	moveString += axis + $(this).data("amount");
	moveString += " F" + settings.moveFeedrate + "\nM121";
	sendGCode(moveString);
	e.preventDefault();
});

$("#page_control .btn-move").contextmenu(function(e) {
	var axis = axisOrder[$(this).data("axis")];
	var axisIndex = axisOrder.indexOf(axis);
	var cellIndex = ($(this).data("amount") < 0) ? $(this).index() : $(this).parent().children().length - $(this).index() - 1;
	showStepDialog("axis", cellIndex, Math.abs($(this).data("amount")), axisIndex);
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
		sendGCode('M32 "' + $(this).data("file") + '"');
		$("#div_print_another").addClass("hidden");
	}
});

$(".gcode-input input").keydown(function(e) {
	var enterKeyPressed = (e.which == 13);
	enterKeyPressed |= (e.which == 9 && windowIsXsSm()); // need this for Android
	if (enterKeyPressed && $(this).typeahead("getActive") == $(this).val()) {
		$(this).closest("form").submit();
		e.preventDefault();
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

$("#table_heaters > tbody > tr > td > div > input," +
  "#table_tools > tbody > tr[data-heater='bed'] > td > div > input," +
  "#table_tools > tbody > tr[data-heater='chamber'] > td > div > input," +
  "#table_tools > tbody > tr[data-heater='cabinet'] > td > div > input").keydown(function(e) {
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
		} else if (heater == "cabinet") {
			gcode = "M141 P1 S" + temperature;
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

$(".table-axis-positions td").click(function() {
	if (isConnected) {
		var axis = axisNames[$(this).data("axis")];
		showTextInput(T("Set {0} position", axis), T("Please enter a new position for the {0} axis:", axis), function(value) {
			if (!isNaN(value)) {
				sendGCode("G92 " + axis + value);
			}
		}, $(this).text());
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

$("#div_content").resize(function() {
	// It doesn't always make sense to make the main content scrollable. Hence check if
	// a) this option is explicitly enabled
	// b) DWC is not running in a small window
	// c) the sidebar has enough space to be fully displayed
	if (!settings.scrollContent || windowIsXsSm() || $("#div_static_sidebar").first().offset().top + $("#div_static_sidebar").first().height() > $(window).height()) {
		$(this).css("height", "").css("min-height", "");
	} else {
		var height = "calc(100vh - " + $(this).offset().top + "px)";
		var minHeight = $("#div_static_sidebar").height() + "px";
		$(this).css("height", height).css("min-height", minHeight);

		if ($("body").height() > $(window).height()) {
			$(this).css("height", "").css("min-height", "");
		}
	}
});

$(".navbar-brand").click(function(e) {
	if ($(this).prop("href") == "#") {
		e.preventDefault();
	}
});

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
	"#table_tools > tbody > tr[data-heater='chamber'] > th:first-child > a," +
	"#table_tools > tbody > tr[data-heater='cabinet'] > th:first-child > a").click(cbHeaterClick);


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
			'Version: ' + $("#dwc_version").text(),
			'Message: ' + msg,
			'URL: ' + url,
			'Line: ' + lineNo + ":" + columnNo,
			'Error object: ' + JSON.stringify(error)
		].join("<br/>");
	} else {
		errorMessage = 'Script Error: See Browser Console for Detail (Version: ' + $("#dwc_version").text() + ')';
	}

	if (isConnected) {
		disconnect(true);
		showMessage("danger", T("JavaScript Error"), T("A JavaScript error has occurred so the web interface has closed the connection to your board. It is recommended to reload the web interface now. If this happens again, please contact the author and share this error message:") + "<br/><br/>" + errorMessage, 0, true, false);
	}

	return false;
};


/* Mixed events */

function cbHeaterClick(e) {
	if (isConnected && !$(this).hasClass("disabled") && lastStatusResponse != undefined) {
		var tool = $(this).closest("tr").data("tool");
		var heater = $(this).closest("tr").data("heater");
		if (tool != undefined) {
			// Heater clicked on Tools panel
			switch (lastStatusResponse.temps.state[heater])
			{
				case 0:	// Off
					changeTool(tool);													// Select associated tool
					break;
				case 1:	// Standby
					var active = [], standby = [], heaters = getTool(tool).heaters;
					for(var i = 0; i < heaters.length; i++) {
						active.push((heaters[i] == heater) ? -273.15 : $("#table_tools tr[data-tool=" + tool + "] input[data-type=\"active\"]").val());
						standby.push((heaters[i] == heater) ? -273.15 : $("#table_tools tr[data-tool=" + tool + "] input[data-type=\"standby\"]").val());
					}

					var sParam = active.join(function(a, b) { return a + ":" + b; });
					var rParam = standby.join(function(a, b) { return a + ":" + b; });
					sendGCode("G10 P" + tool + "S" + sParam + " R" + rParam);			// Turn off clicked heater
					break;
				case 2:	// Active
					changeTool(-1);														// Deselect current tool
					break;
				case 3:	// Fault
					showMessage("danger", T("Heater Fault"), T("<strong>Error:</strong> A heater fault has occured on this particular heater.<br/><br/>Please turn off your machine and check your wiring for loose connections."));
					break;
			}
		} else {
			// Heater clicked on Heaters panel
			if (heater == "bed") {
				switch (lastStatusResponse.temps.bed.state)
				{
					case 0:	// Off
						sendGCode("M140 S" + lastStatusResponse.temps.bed.active);		// Turn on bed heater
						break;
					case 1: // Standby
						sendGCode("M140 S-273.15");										// Turn off bed completely
						break;
					case 2: // Active
						sendGCode("M144");												// Put bed into standby mode
						break;
					case 3:	// Fault
						showMessage("danger", T("Heater Fault"), T("<strong>Error:</strong> A heater fault has occured on this particular heater.<br/><br/>Please turn off your machine and check your wiring for loose connections."));
						break;
				}
				$(this).blur();
			} else if (heater == "chamber") {
				var chamberState = lastStatusResponse.temps.chamber.state;
				if (chamberState == 3) {
					showMessage("danger", T("Heater Fault"), T("<strong>Error:</strong> A heater fault has occured on this particular heater.<br/><br/>Please turn off your machine and check your wiring for loose connections."));
				} else if (chamberState == 2) {
					sendGCode("M141 P0 S-273.15");										// Turn off chamber
				} else {
					sendGCode("M141 P0 S" + lastStatusResponse.temps.chamber.active);	// Turn on chamber
				}
				$(this).blur();
			} else if (heater == "cabinet") {
				var cabinetState = lastStatusResponse.temps.cabinet.state;
				if (cabinetState == 3) {
					showMessage("danger", T("Heater Fault"), T("<strong>Error:</strong> A heater fault has occured on this particular heater.<br/><br/>Please turn off your machine and check your wiring for loose connections."));
				} else if (cabinetState == 2) {
					sendGCode("M141 P1 S-273.15");										// Turn off cabinet
				} else {
					sendGCode("M141 P1 S" + lastStatusResponse.temps.cabinet.active);	// Turn on cabinet
				}
				$(this).blur();
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
					if (lastStatusResponse.temps.state[heater] == 1) {
						var active = [], standby = [], heaters = getTool(tools[0]).heaters;
						for(var i = 0; i < heaters.length; i++) {
							active.push((heaters[i] == heater) ? -273.15 : $("#table_tools tr[data-tool=" + tool + "] input[data-type=\"active\"]").val());
							standby.push((heaters[i] == heater) ? -273.15 : $("#table_tools tr[data-tool=" + tool + "] input[data-type=\"standby\"]").val());
						}

						var sParam = active.join(function(a, b) { return a + ":" + b; });
						var rParam = standby.join(function(a, b) { return a + ":" + b; });
						sendGCode("G10 P" + tools[0] + "S" + sParam + " R" + rParam);	// Turn off associated heater
					} else {
						changeTool(tools[0]);											// Select tool
					}
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

			$(this).blur();
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

function clearHeadTemperatures() {
	$(".ul-active-temp, .ul-standby-temp, #ul_active_temps, #ul_standby_temps").html("");
	$(".btn-active-temp, .btn-standby-temp").addClass("disabled");
}

function setAxesHomed(axes) {
	// Set button colors and prepare list of unhomed axes
	var unhomedAxes = "";
	for(var i = 0; i < Math.min(axes.length, axisNames.length); i++) {
		if (axes[i]) {
			$(".btn-home[data-axis='" + i + "']").removeClass("btn-warning").addClass("btn-primary");
		} else {
			unhomedAxes += ", " + axisNames[i];
			$(".btn-home[data-axis='" + i + "']").removeClass("btn-primary").addClass("btn-warning");
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
	boardType = type;
	allowCombinedFirmware = false;
	controllableFans = 7;	// show first three fans

	var isWiFi, isDuetNG, isDuetMaestro;
	if (type.indexOf("duetwifi") == 0) {
		firmwareFileName = "DuetWiFiFirmware";
		allowCombinedFirmware = isWiFi = isDuetNG = true;
		isDuetMaestro = false;
	} else if (type.indexOf("duetethernet") == 0) {
		firmwareFileName = "DuetEthernetFirmware";
		isWiFi = false;
		allowCombinedFirmware = isDuetNG = true;
	} else if (type.indexOf("duetmaestro") == 0) {
		firmwareFileName = "DuetMaestroFirmware";
		isWiFi = isDuetNG = false;
		isDuetMaestro = true;
	} else {
		controllableFans = 1;
		firmwareFileName = "RepRapFirmware";
		isWiFi = isDuetNG = false;
	}

	for(var i = 0; i < maxFans; i++) {
		setFanVisibility(i, controllableFans & (1 << i));
	}

	$(".duet-ng").toggleClass("hidden", !isDuetNG);
	$(".wifi-setting").toggleClass("hidden", !isWiFi);

	$(".li-display").toggleClass("hidden", !isDuetMaestro);
	if (!isDuetMaestro && $("#page_display").hasClass("active")) {
		$("a[href='#page_general']").click();
	}
}

function setCurrentTemperature(heater, temperature) {
	// Set current heater temperature
	var tempCell = $("#div_tools_heaters tr[data-heater='" + heater + "'] > td.current");
	if (temperature == undefined) {
		tempCell.html(T("n/a"));
	} else if (temperature < -270) {
		tempCell.html(T("error"));
	} else if (vendor == "diabase" && heater == "cabinet") {
		tempCell.html(T("{0} %RH", temperature.toFixed(1)));
	} else {
		tempCell.html(T("{0} °C", temperature.toFixed(1)));
	}

	// Update Extrude+Retract buttons
	if (heater != "bed" && heater != "chamber" && heater != "cabinet" && lastStatusResponse != undefined) {
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
	if (heater == "bed" || heater == "chamber" || heater == "cabinet") {
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

		//$(".btn-upload").addClass("disabled");
		$("#page_general .btn-upload").removeClass("disabled");

		$("#btn_pause").removeClass("disabled");
		$("#div_print_another").addClass("hidden");
		$(".row-progress").removeClass("hidden");
		$("#td_last_layertime").html(T("n/a"));

		requestFileInfo();
	} else {
		$("#btn_pause").addClass("disabled");
		//$(".btn-upload").toggleClass("disabled", !isConnected);

		if (!isConnected || fileInfo == undefined) {
			$(".row-progress").addClass("hidden");
		}

		if (isConnected) {
			if ($("#auto_sleep").is(":checked")) {
				sendGCode("M1");
				$("#auto_sleep").prop("checked", false);
			}

			if (!printHasFinished && currentLayerTime > 0) {
				addLayerData(currentLayerTime, lastStatusResponse.coords.extr.reduce(function(a, b) { return a + b; }), true);
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

			// If a file print was simulated, update the file info once again
			if (lastStatusResponse != undefined && lastStatusResponse.status == 'M' && fileInfo != undefined) {
				var path = (fileInfo.fileName.indexOf(":") == -1) ? ("0:/gcodes/" + fileInfo.fileName) : fileInfo.fileName;
				reloadFileCache(path);
			}
		}

		fileInfo = undefined;
	}

	isPrinting = printing;
	$(".disable-printing").toggleClass("disabled", printing);

	if (waitingForPrintStart && printing) {
		$("#modal_upload").modal("hide");
		showPage("print");
		waitingForPrintStart = false;
	}
}

function setProbeValue(value, secondaryValue) {
	if (value < 0) {
		$("#td_probe, #dd_probe_current_value").html(T("n/a"));
	} else if (secondaryValue == undefined) {
		$("#td_probe, #dd_probe_current_value").html(value);
	} else {
		$("#td_probe, #dd_probe_current_value").html(value + " (" + secondaryValue.reduce(function(a, b) { return a + b; }) + ")");
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

function setSpindleCurrent(spindle, current) {
	$("[data-tool=" + spindleTools[spindle] + "] .spindle-current").text(T("{0} RPM", current));
	spindleCurrents[spindle] = current;
}

function setSpindleInput(spindle, rpm) {
	var spindleInput = $("[data-tool=" + spindleTools[spindle] + "] .spindle-active");
	if (spindleInput.length > 0 && !spindleInput.is(":focus")) {
		spindleInput.val(rpm);
	}
	spindleActives[spindle] = rpm;
}

function setTemperatureInput(heater, value, active, setToolHeaters) {
	var prefix = (setToolHeaters) ? "" : "#table_heaters ";

	var tempInput = undefined;
	if (heater == "bed" || heater == "chamber" || heater == "cabinet") {
		tempInput = $(prefix + "tr[data-heater='" + heater + "'] input");
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
	if (heater == "bed" || heater == "chamber" || heater == "cabinet") {
		tempInput = $("#table_tools tr[data-heater='" + heater + "'] input");
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
	$("#layer_tooltip").hide();

	$("#div_static_sidebar a, #section_navigation a, .page").removeClass("active");
	$("#div_static_sidebar a[data-target='" + name + "'], #page_" + name + ", #section_navigation a[data-target='" + name + "']").addClass("active");
	setTimeout(function() {
		if (slideout.isOpen()) {
			slideout.close();
		}
	}, 250);

	if (name != currentPage) {
		if (name == "control") {
			$("#page_control .table-fan-control input").slider("relayout");
			if (currentMacroDirectory == "0:/macros" && !macrosLoaded) {
				updateMacroFiles();
			}

			$("#div_info_panels").removeClass("hidden-xs");
			$("#div_content").removeClass("content-collapsed-padding-xs");
		} else {
			$("#div_info_panels").addClass("hidden-xs");
			$("#div_content").addClass("content-collapsed-padding-xs");
		}

		if (name == "print") {
			$("#slider_speed").slider("relayout");
			$("#page_print .table-fan-control input").slider("relayout");
			for(var extr = 0; extr < maxExtruders; extr++) {
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

		if (name == "calibration" && vendor == "diabase") {
			sendGCode("M118 P1 S\"IP\"");
			lastSentGCode = "";
		}

		if (name == "settings" && isConnected) {
			getConfigResponse();

			if ($("#page_ui").hasClass("active")) {
				$("#btn_clear_cache").toggleClass("disabled", $.isEmptyObject(cachedFileInfo));
			} else if ($("#page_sysedit").hasClass("active")) {
				if (sysLoaded) {
					$("#a_refresh_sys").removeClass("hidden");
				} else {
					updateSysFiles();
				}
			} else if ($("#page_display").hasClass("active")) {
				if (displayLoaded) {
					$("#a_refresh_display").removeClass("hidden");
				} else {
					updateDisplayFiles();
				}
			}
		}
	}

	currentPage = name;
}


/* Dynamic sidebar */

var slideout = new Slideout({
	"panel": document.getElementById("main_content"),
	"menu": document.getElementById("nav_sidebar"),
	"padding": 220,
	"tolerance": 70
});

$("#nav_sidebar").removeClass("hidden");

$("body").resize(function() {
	if (window.matchMedia('(min-width: 768px)').matches) {
		if (slideout.isOpen()) {
			// Close menu if the page width exceeds XS
			slideout.close();
		}
		slideout.disableTouch();
	} else {
		slideout.enableTouch();
	}
}).resize();

$("#btn_toggle_sidebar").click(function() {
	slideout.toggle();
});


/* Theme support */

function applyThemeColors() {
	// Update temp chart colors and repaint it
	for(var heater = 0; heater < maxHeaters; heater++) {
		tempChartOptions.colors[heater] = $(".heater-" + heater).css("color");
	}
	for(var tempSensor = 0; tempSensor < maxTempSensors; tempSensor++) {
		tempChartOptions.colors[maxHeaters + tempSensor] = $(".temp-sensor-" + tempSensor).css("color");
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

/* Piecon dynamic icon support */

Piecon.setOptions({
	color: "#0000ff",		// Pie chart color
	background: "#bbb",		// Empty pie chart color
	shadow: "#fff",			// Outer ring color
	fallback: "force"		// Toggles displaying percentage in the title bar (possible values - true, false, 'force')
});

