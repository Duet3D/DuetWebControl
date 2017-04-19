/* Main interface logic for Duet Web Control
 * 
 * written by Christian Hammacher (c) 2016-2017
 * 
 * licensed under the terms of the GPL v3
 * see http://www.gnu.org/licenses/gpl-3.0.html
 */


var maxAxes = 6, maxExtruders = 6, maxDrives = 9, maxHeaters = 8, maxFans = 3;
var axisNames = ["X", "Y", "Z", "U", "V", "W"];
var probeSlowDownColor = "#FFFFE0", probeTriggerColor = "#FFF0F0";

var webcamUpdating = false;

var fileInfo, currentLayerTime, lastLayerPrintDuration;

var geometry, probeSlowDownValue, probeTriggerValue;
var numAxes, numExtruderDrives, numVolumes, numFans;
var heatedBed, chamber, numHeads, toolMapping;
var coldExtrudeTemp, coldRetractTemp, tempLimit;

var isPrinting, isPaused, printHasFinished;

var currentPage = "control", waitingForPrintStart;
var darkThemeInclude;


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
	heatedBed = 1;
	chamber = 0;
	numHeads = 2;			// only 2 are visible on load
	numAxes = 3;			// only 3 are visible on load
	numExtruderDrives = 2;	// only 2 are visible on load
	numFans = undefined;

	coldExtrudeTemp = 160;
	coldRetractTemp = 90;
	tempLimit = 280;

	resetChartData();
	lastLayerPrintDuration = 0;

	setToolMapping(undefined);

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
	// Visibility of heater temperatures
	if (heatedBed) {						// Heated Bed
		$("#tr_bed").removeClass("hidden");
	} else {
		$("#tr_bed").addClass("hidden");
	}
	if (chamber) {							// Chamber
		$("#tr_chamber").removeClass("hidden");
	} else {
		$("#tr_chamber").addClass("hidden");
	}
	for(var i = 1; i <= maxHeaters; i++) {	// Heads (Heaters)
		if (i <= numHeads) {
			$("#tr_head_" + i).removeClass("hidden");
		} else {
			$("#tr_head_" + i).addClass("hidden");
		}
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
		$(".div-head-temp").removeClass("hidden-sm");
		$("#div_heaters").removeClass("col-sm-5").addClass("col-sm-6");
		$("#div_temp_chart").removeClass("col-lg-3").addClass("col-lg-5");
		$("#div_status").removeClass("col-sm-7 col-lg-5").addClass("col-sm-6 col-lg-3");
	} else {
		$(".div-head-temp").addClass("hidden-sm");
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
	// Charts
	drawTemperatureChart();
	drawPrintChart();

	// Navbar
	setTitle("Duet Web Control");
	setStatusLabel("Disconnected", "default");

	// Heater Temperatures
	$("#table_heaters tr > th:first-child > span").text("");
	setCurrentTemperature("bed",  undefined);
	setTemperatureInput("bed", 0, 1);
	setCurrentTemperature("chamber",  undefined);
	setTemperatureInput("chamber", 0, 1);
	for(var i = 1; i <= maxHeaters; i++) {
		setCurrentTemperature(i, undefined);
		setTemperatureInput(i, 0, 1);
		setTemperatureInput(i, 0, 0);
	}

	// Status fields
	$("#th_x").text(T("X"));
	$("#th_y").text(T("Y"));
	$("#th_z").text(T("Z"));
	$("#td_x, #td_y, #td_z").text(T("n/a"));
	for(var i = 1; i <= numExtruderDrives; i++) {
		$("#td_extr_" + i).text(T("n/a"));
	}
	$("#td_extr_total").text(T("n/a"));
	setProbeValue(-1, undefined);
	$("#td_fanrpm, #td_cputemp").text(T("n/a"));
	$(".cpu-temp").addClass("hidden");

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

	// Settings
	$("#tr_firmware_electronics, #panel_tool_changes").addClass("hidden");
	$("#firmware_name, #firmware_electronics, #firmware_version, #dws_version").html(T("n/a"));
	$("#page_machine td:not(:first-child), #page_machine dd").html(T("n/a"));

	updateSysFiles();

	// Modal dialogs
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

$("body").on("click", ".bed-temp", function(e) {
	if ($(this).parents("#tr_bed").length > 0) {
		sendGCode("M140 S" + $(this).data("temp"));
	} else {
		sendGCode("M141 S" + $(this).data("temp"));
	}
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
	if (isConnected) {
		// If this G-Code isn't performed by a button, treat it as a manual input
		sendGCode($(this).data("gcode"), !($(this).is(".btn")));
	}
	e.preventDefault();
});

$("body").on("click", ".heater-temp", function(e) {
	var inputElement = $(this).parents("div.input-group").find("input");
	var activeOrStandby = (inputElement.prop("id").match("active$")) ? "S" : "R";
	var temperature = $(this).data("temp");
	var gcode = "";

	if (inputElement.prop("id").indexOf("all") == -1) {
		var heater = parseInt(inputElement.prop("id").match("_h(.)_")[1]);
		var currentTool = (lastStatusResponse == undefined) ? -1 : lastStatusResponse.currentTool;

		// 1. Is the active tool mapped to this heater?
		if (currentTool >= 0 && $.inArray(heater, getTool(currentTool).heaters) != -1) {
			// Yes - generate only one G10 code for it
			var temps = [];
			getTool(currentTool).heaters.forEach(function(h) {
				if (h == heater) {
					temps.push(temperature);
				} else {
					temps.push($("#input_temp_h" + h + "_" + ((activeOrStandby == "S") ? "active" : "standby")).val());
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
					var temps = [];
					getTool(tools[0]).heaters.forEach(function(h) {
						if (h == heater) {
							temps.push(temperature);
						} else {
							temps.push($("#input_temp_h" + h + "_" + ((activeOrStandby == "S") ? "active" : "standby")).val());
						}
					});

					gcode = "G10 P" + tools[0] + " " + activeOrStandby + temps.reduce(function(a, b) { return a + ":" + b; });
				}
				// TODO: Report an error if no tool is assigned to this heater?
			}
		}

		sendGCode(gcode);
	} else if (toolMapping != undefined) {
		for(var i = 0; i < toolMapping.length; i++) {
			var number = (toolMapping[i].hasOwnProperty("number") ? toolMapping[i].number : i + 1);
			if ($.inArray(0, toolMapping[i].heaters) == -1) {
				// Make sure we don't set temperatures for the heated bed
				gcode += "G10 P" + number + " " + activeOrStandby + $(this).val() + "\n";
			}
		}
		sendGCode(gcode);
	}

	e.preventDefault();
});

$("body").on("click", ".tool", function(e) {
	changeTool($(this).data("tool"));
	e.preventDefault();
});

$("body").on("hidden.bs.popover", function() {
	$(this).popover("destroy");
});


/* Static GUI Events */

$("#a_heaters_off").click(function(e) {
	if (isConnected) {
		var gcode = "";

		// Turn off nozzle heaters
		if (toolMapping != undefined) {
			for(var i = 0; i < toolMapping.length; i++) {
				var number = (toolMapping[i].hasOwnProperty("number") ? toolMapping[i].number : i + 1);

				var temps = [], tempString = "";
				toolMapping[i].heaters.forEach(function() { temps.push("-273.15"); });
				tempString = temps.reduce(function(a, b) { return a + ":" + b; });

				gcode = "G10 P" + number + " R" + tempString + " S" + tempString + "\n";
			}
		}

		// Turn off bed
		if (heatedBed) {
			gcode += "M140 S-273.15\n";
		}

		// Turn off chamber
		if (chamber) {
			gcode += "M141 S-273.15\n";
		}

		sendGCode(gcode);
	}
	e.preventDefault();
});

$("#a_webcam").click(function(e) {
	if ($("#img_webcam").hasClass("hidden")) {
		$("#span_webcam").removeClass("glyphicon-menu-up").addClass("glyphicon-menu-down");
		$("#img_webcam").removeClass("hidden");
	} else {
		$("#span_webcam").removeClass("glyphicon-menu-down").addClass("glyphicon-menu-up");
		$("#img_webcam").addClass("hidden");
	}
	$(this).blur();
	e.preventDefault();
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

	if (lastStatusResponse != undefined && !$("#div_extrude").hasClass("hidden")) {
		var drive = $('input[name="extruder"]:checked').val();
		if (drive != "all") {
			var amounts = [];
			var toolDrives = getTool(lastStatusResponse.currentTool).drives;
			for(var i = 0; i < toolDrives.length; i++) {
				if (drive == toolDrives[i]) {
					amounts.push(amount);
				} else {
					amounts.push("0");
				}
			}
			amount = amounts.join(":");
		}
	}

	sendGCode("M120\nM83\nG1 E" + amount + " F" + feedrate + "\nM121");
});

$("#btn_retract").click(function(e) {
	var feedrate = $("#panel_extrude input[name=feedrate]:checked").val() * 60;
	var amount = -$("#panel_extrude input[name=feed]:checked").val();

	if (lastStatusResponse != undefined && !$("#div_extrude").hasClass("hidden")) {
		var drive = $('input[name="extruder"]:checked').val();
		if (drive != "all") {
			var amounts = [];
			var toolDrives = getTool(lastStatusResponse.currentTool).drives;
			for(var i = 0; i < toolDrives.length; i++) {
				if (drive == toolDrives[i]) {
					amounts.push(amount);
				} else {
					amounts.push("0");
				}
			}
			amount = amounts.join(":");
		}
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

$("#mobile_home_buttons button, #btn_homeall, #mobile_extra_home_buttons, .table-move a").click(function(e) {
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
			gcode = gcode.toUpperCase();
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

$("#input_temp_bed").keydown(function(e) {
	var enterKeyPressed = (e.which == 13);
	enterKeyPressed |= (e.which == 9 && windowIsXsSm()); // need this for Android
	if (isConnected && enterKeyPressed) {
		sendGCode("M140 S" + $(this).val());
		$(this).select();

		e.preventDefault();
	}
});

$("#input_temp_chamber").keydown(function(e) {
	var enterKeyPressed = (e.which == 13);
	enterKeyPressed |= (e.which == 9 && windowIsXsSm()); // need this for Android
	if (isConnected && enterKeyPressed) {
		sendGCode("M141 S" + $(this).val());
		$(this).select();

		e.preventDefault();
	}
});

$("input[id^='input_temp_h']").keydown(function(e) {
	var enterKeyPressed = (e.which == 13);
	enterKeyPressed |= (e.which == 9 && windowXsSm()); // need this for Android
	if (isConnected && enterKeyPressed) {
		var activeOrStandby = ($(this).prop("id").match("active$")) ? "S" : "R";
		var heater = parseInt($(this).prop("id").match("_h(.)_")[1]);
		var temperature = $(this).val();
		var currentTool = (lastStatusResponse == undefined) ? -1 : lastStatusResponse.currentTool;
		var gcode = "";

		// 1. Is the active tool mapped to this heater?
		if (currentTool >= 0 && $.inArray(heater, getTool(currentTool).heaters) != -1) {
			// Yes - generate only one G10 code for it
			var temps = [];
			getTool(currentTool).heaters.forEach(function(h) {
				if (h == heater) {
					temps.push(temperature);
				} else {
					temps.push($("#input_temp_h" + h + "_" + ((activeOrStandby == "S") ? "active" : "standby")).val());
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
					var temps = [];
					getTool(tools[0]).heaters.forEach(function(h) {
						if (h == heater) {
							temps.push(temperature);
						} else {
							temps.push($("#input_temp_h" + h + "_" + ((activeOrStandby == "S") ? "active" : "standby")).val());
						}
					});

					gcode = "G10 P" + tools[0] + " " + activeOrStandby + temps.reduce(function(a, b) { return a + ":" + b; });
				}
				// TODO: Report an error if no tool is assigned to this heater?
			}
		}

		sendGCode(gcode);

		$(this).select();
		e.preventDefault();
	}
});

$("#input_temp_all_active, #input_temp_all_standby").keydown(function(e) {
	if (isConnected && e.which == 13) {
		if (toolMapping != undefined) {
			var activeOrStandby = ($(this).prop("id").match("active$")) ? "S" : "R";
			var temperature = $(this).val();

			var gcode = "";
			for(var i = 0; i < toolMapping.length; i++) {
				var number = (toolMapping[i].hasOwnProperty("number") ? toolMapping[i].number : i + 1);
				if ($.inArray(0, toolMapping[i].heaters) == -1) {
					// Make sure we don't set temperatures for the heated bed
					gcode += "G10 P" + number + " " + activeOrStandby + $(this).val() + "\n";
				}
			}
			sendGCode(gcode);
		}

		e.preventDefault();
	}
});

$("#main_content").resize(function() {
	if (!settings.scrollContent || windowIsXsSm()) {
		$(this).css("height", "").css("min-height", "");
	} else {
		var height = "calc(100vh - " + $(this).offset().top + "px)";
		var minHeight = $(".sidebar:not(.sidebar-continuation)").height() + "px";
		$(this).css("height", height).css("min-height", minHeight);
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

$("#table_heaters a").click(function(e) {
	if (isConnected && lastStatusResponse != undefined) {
		if ($(this).parents("#tr_bed").length > 0) {
			var bedState = lastStatusResponse.temps.bed.state;
			if (bedState == 3) {
				showMessage("danger", T("Heater Fault"), T("<strong>Error:</strong> A heater fault has occured on this particular heater.<br/><br/>Please turn off your machine and check your wiring for loose connections."));
			} else if (bedState == 2) {
				// Put bed into standby mode
				sendGCode("M144");
			} else {
				// Bed is either off or in standby mode, send M140 to turn it back on
				sendGCode("M140 S" + $("#input_temp_bed").val());
			}
		} else {
			var heater = $(this).parents("tr").index();
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
					if (popover.length) {
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
	e.preventDefault();
});

$("#table_define_tool input[type='checkbox']").change(function() {
	var isChecked = $(this).is(":checked");
	$(this).parents("label").toggleClass("btn-primary", isChecked).toggleClass("btn-default", !isChecked);

	validateAddTool();
});

$("#table_define_tool input[type='number']").on("input", function() {
	validateAddTool();
});

function validateAddTool() {
	var toolNumber = parseInt($("#input_tool_number").val());
	var disableButton =	(!isConnected) ||
		(isNaN(toolNumber) || toolNumber < 0 || toolNumber > 255) ||
		(toolMapping != undefined && getTool(toolNumber) != undefined) ||
		($("input[name='tool_heaters']:checked").length + $("input[name='tool_drives']:checked").length == 0);
	$("#btn_add_tool").toggleClass("disabled", disableButton);
}

$("#table_define_tool input[type='number']").keydown(function(e) {
	if (e.which == 13) {
		if (!$("#btn_add_tool").hasClass("disabled")) {
			$("#btn_add_tool").click();
		}
		e.preventDefault();
	}
});

$("#table_heaters tr > th:first-child > a").blur(function() {
	$(this).popover("hide");
});

$("#ul_control_dropdown").click(function(e) {
	$(this).find(".dropdown").removeClass("open");
	if ($(e.target).is("a")) {
		$(this).parents(".dropdown").removeClass("open");
	} else {
		e.stopPropagation();
	}
});

$("#ul_control_dropdown .btn-active-temp, #ul_control_dropdown .btn-standby-temp").click(function(e) {
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

	$(".extruder-7").toggleClass("hidden", !show7Extruders);
	$(".heater-7").toggleClass("hidden", !show7Heaters);
	$(".wifi-setting").toggleClass("hidden", !isWiFi);

	boardType = type;
}

function setCurrentTemperature(heater, temperature) {
	var field = "#tr_head_" + heater + " td";
	if (heater == "bed") {
		field = "#tr_bed td";
	} else if (heater == "chamber") {
		field = "#tr_chamber td";
	}

	if (temperature == undefined) {
		$(field).first().html(T("n/a"));
	} else if (temperature < -270) {
		$(field).first().html(T("error"));
	} else {
		$(field).first().html(T("{0} °C", temperature.toFixed(1)));
	}

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

function setHeaterState(heater, status, currentTool) {
	var statusText = T("n/a");
	switch (status) {
		case 0:
			statusText = T("off");
			break;

		case 1:
			statusText = T("standby");
			break;

		case 2:
			statusText = T("active");
			break;

		case 3:
			statusText = T("fault");
			break;

		case 4:
			statusText = T("tuning");
			break;
	}

	if (heater == "bed") {
		$("#tr_bed > th:first-child > span").text(statusText);
	} else if (heater == "chamber") {
		$("#tr_chamber > th:first-child > span").text(statusText);
	} else {
		var tools = getToolsByHeater(heater);
		if (tools.length != 0) {
			statusText += " (T" + tools.reduce(function(a, b) { return a + ", T" + b; }) + ")";
			statusText = statusText.replace("T" + currentTool, "<u>T" + currentTool + "</u>");
			if (tools.length > 1) {
				$("#table_heaters tr > th:first-child").eq(heater).find(".caret").removeClass("hidden");
			} else {
				$("#table_heaters tr > th:first-child").eq(heater).find(".caret").addClass("hidden");
			}
		} else {
			$("#table_heaters tr > th:first-child").eq(heater).find(".caret").addClass("hidden");
		}
		$("#table_heaters tr > th:first-child").eq(heater).children("span").html(statusText);
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
}

function setStatusLabel(text, style) {
	text = T(text);
	$(".label-status").removeClass("label-default label-danger label-info label-warning label-success label-primary").addClass("label-" + style).text(text);
}

function setTemperatureInput(head, value, active) {
	var tempInputId;

	if (head == "bed") {
		tempInputId = "#input_temp_bed";
	} else if (head == "chamber") {
		tempInputId = "#input_temp_chamber";
	} else {
		tempInputId = "#input_temp_h" + head + "_";
		tempInputId += (active) ? "active": "standby";
	}

	if (!$(tempInputId).is(":focus")) {
		$(tempInputId).val((value < 0) ? 0 : value);
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

function setTitle(title) {
	$(".machine-name").html(title);
	$("head > title").text(title);
}

function showPage(name) {
	$(".navitem, .page").removeClass("active");
	$(".navitem-" + name + ", #page_" + name).addClass("active");

	if (name != currentPage) {
		if (name == "control") {
			$("#slider_fan_control").slider("relayout");
			if (currentMacroDirectory == "/macros" && !macrosLoaded) {
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

function applyThemeColors(themeActive) {
	// Update temp chart colors and repaint it
	tempChartOptions.colors[0] = $("#tr_bed a").css("color");
	tempChartOptions.colors[1] = $("#tr_head_1 a").css("color");
	tempChartOptions.colors[2] = $("#tr_head_2 a").css("color");
	tempChartOptions.colors[3] = $("#tr_head_3 a").css("color");
	tempChartOptions.colors[4] = $("#tr_head_4 a").css("color");
	tempChartOptions.colors[5] = $("#tr_head_5 a").css("color");
	tempChartOptions.colors[6] = $("#tr_head_5 a").css("color");
	tempChartOptions.colors[7] = $("#tr_chamber th").css("color");
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

	if (themeActive) {
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
