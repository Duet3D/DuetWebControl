/* Interface logic for the Duet Web Control */

/* Constant values */

var maxTemperatureSamples = 1000;

var sessionPassword = "reprap";

var updateFrequency = 250;			// in ms
var haltedReconnectDelay = 5000;	// in ms
var extendedStatusInterval = 10;	// get extended status response every n requests

// Probe highlighting
var probeSlowDownColor = "#FFFFE0", probeTriggerColor = "#FFF0F0";

// Charts
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

/* Variables */

var isConnected = false, isDelta, isPrinting;
var extendedStatusCounter;

var lastSeq, lastSendGCode;

var probeSlowDownValue, probeTriggerValue;

var heatedBed, numHeads, numExtruderDrives;
var toolMapping;

var recordedBedTemperatures, recordedHeadTemperatures;
var drawTempChart = false;

function resetGuiData() {
	isDelta = isPrinting = false;
	lastSeq = 0;
	lastSendGCode = "";
	probeSlowDownValue = probeTriggerValue = undefined;
	
	heatedBed = 1;
	numHeads = 4;			// 4 Heads max
	numExtruderDrives = 5;	// 5 Extruder Drives max
	
	recordedBedTemperatures = [];
	recordedHeadTemperatures = [[], [], [], []];
	
	toolMapping = undefined;
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
	isConnected = true;
	extendedStatusCounter = 0;
	
	updateStatus();
	//updateFileInfo();
	
	$(".btn-connect").removeClass("btn-warning disabled").addClass("btn-success").find("span:not(.glyphicon)").text("Disconnect");
	$(".btn-connect span.glyphicon").removeClass("glyphicon-transfer").addClass("glyphicon-log-out");
	
	enableControls();
}

function disconnect() {
	isConnected = false;
	$.ajax("rr_disconnect", { async: true, dataType: "json" });
	
	$(".btn-connect").removeClass("btn-success").addClass("btn-info").find("span:not(.glyphicon)").text("Connect");
	$(".btn-connect span.glyphicon").removeClass("glyphicon-log-out").addClass("glyphicon-log-in");
	
	resetGuiData();
	resetGui();
	updateGui();
	
	disableControls();
}

/* Automatic status update */

function updateStatus() {
	var ajaxRequest = "rr_status";
	if (extendedStatusCounter == 0) {
		ajaxRequest += "?type=2";
	} else {
		extendedStatusCounter++;
		if (extendedStatusCounter > extendedStatusInterval) {
			extendedStatusCounter = 0;
		}
	}
		
	$.ajax(ajaxRequest, {
		async: true,
		dataType: "json",
		error: function() {
			if (isConnected) {
				ajaxError();
			}
		},
		success: function(status) {
			// Don't process this one if we're no longer connected
			if (!isConnected) {
				return;
			}
			var needGuiUpdate = false;
			
			/*** Ordinary status response ***/
			
			// Status
			isPrinting = false;
			switch (status.status) {
				case 'H':	// Halted
					setStatusLabel("Halted", "danger");
					break;
					
				case 'D':	// Pausing / Decelerating
					setStatusLabel("Pausing", "warning");
					break;
				
				case 'S':	// Paused / Stopped
					setStatusLabel("Paused", "info");
					break;
					
				case 'R':	// Resuming
					setStatusLabel("Resuming", "warning");
					break;
					
				case 'P':	// Printing
					setStatusLabel("Printing", "success");
					isPrinting = true;
					break;
					
				case 'B':	// Busy
					setStatusLabel("Busy", "success");
					break;
					
				case 'I':	// Idle
					setStatusLabel("Idle", "default");
					break;
			}
			
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
			// TODO: process extrRaw here
			
			// XYZ coordinates
			if (isDelta && !status.coords.axesHomed[0]) {
				$("#td_x, #td_y, #td_z").hmtl("n/a");
			} else {
				$("#td_x").html(status.coords.xyz[0].toFixed(2));
				$("#td_y").html(status.coords.xyz[1].toFixed(2));
				$("#td_z").html(status.coords.xyz[2].toFixed(2));
			}
			
			// TODO: process currentTool here
			
			// Output
			if (status.hasOwnProperty("output")) {
				if (status.output.hasOwnProperty("beepDuration")) {
					// TODO: implement beep here
				}
				if (status.output.hasOwnProperty("message")) {
					showMessage("envelope", "Message from Duet firmware", status.output.message, "md");
				}
			}
			
			// TODO: process params here
			// TODO: check seq here (see lastSeq)
			
			// Sensors
			setProbeValue(status.sensors.probe);
			$("#td_fanrpm").html(status.sensors.fanRPM);
			
			// Heated bed
			if (status.temps.hasOwnProperty("bed")) {
				setCurrentTemperature("bed", status.temps.bed.current);
				setTemperatureInput("bed", status.temps.bed.active, 1);
				// TODO: process heater state
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
				// TODO: process heater state
			}
			recordHeaterTemperatures(status.temps.bed.current, status.temps.heads.current);
			
			/*** Extended status response ***/
			
			if (status.hasOwnProperty("tools")) {
				toolMapping = status.tools;
			}
			if (status.hasOwnProperty("probe")) {
				probeTriggerValue = status.probe.threshold;
				probeSlowDownValue = probeTriggerValue * 0.9;	// see Platform::Stopped in dc42/zpl firmware forks
			}
			
			/*** Print status response ***/
			
			// TODO
			
			// Update the GUI when we have processed the whole status response
			if (needGuiUpdate) {
				updateGui();
			}
			drawTemperatureChart();
			
			// Set timer for next status update
			if (status.status != 'H') {
				setTimeout(updateStatus, updateFrequency);
			} else {
				setTimeout(function() {
					connect(sessionPassword, false);
				}, haltedReconnectDelay);
			}
		}
	});
}

function sendGCode(gcode) {
	lastSendGCode = gcode;
	
	// Although rr_gcode gives us a JSON response, it doesn't provide any results.
	// We only need to worry about an AJAX error event.
	$.ajax("rr_gcode?gcode=" + encodeURIComponent(gcode), {
		async: true,
		dataType: "json",
		error: function() { ajaxError(); }
	});
}

function ajaxError() {
	showMessage("warning-sign", "Communication Error", "An AJAX error has been reported, so the current session has been terminated.<br/><br/>Please check if your printer is still on and try to connect again.", "md");
	disconnect();
}

/* Cookies */

function loadValues() {
	
}

function saveValues() {
	
}

/* GUI */

$(document).ready(function() {
	resetGuiData();
	updateGui();
});

function enableControls() {
	$(".btn-emergency-stop, .gcode-input button[type=submit], .gcode").removeClass("disabled");	// Navbar
	$(".bed-temp, .head-temp").removeClass("disabled");											// Temperature auto-complete
	$("#mobile_home_buttons button, #btn_homeall, #table_move_head a").removeClass("disabled");	// Move buttons
	$("#panel_extrude label.btn, #panel_extrude button").removeClass("disabled");				// Extruder Control
}

function disableControls() {
	$(".btn-emergency-stop, .gcode-input button[type=submit], .gcode").addClass("disabled");	// Navbar
	$(".bed-temp, .head-temp").addClass("disabled");											// Temperature auto-complete
	$("#mobile_home_buttons button, #btn_homeall, #table_move_head a").addClass("disabled");	// Move buttons
	$("#panel_extrude label.btn, #panel_extrude button").addClass("disabled");					// Extruder Control
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
			$(".col-extr-" + i).removeClass("hidden");
		} else {
			$(".col-extr-" + i).addClass("hidden");
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
			$("th.col-extr-" + i).html("Drive " + i);
			$(".col-extr-" + i).removeClass("hidden-md");
		}
		$("#div_heaters").removeClass("col-sm-5").addClass("col-sm-6");
		$("#div_temp_chart").removeClass("col-lg-3").addClass("col-lg-5");
		$("#div_status").removeClass("col-sm-7 col-lg-5").addClass("col-sm-6 col-lg-3");
	} else {
		$(".div-head-temp").addClass("hidden-sm");
		$("#col_extr_totals, #td_extr_total").removeClass("hidden");
		for(var i=1; i<=3; i++) {
			$("th.col-extr-" + i).html("D" + i);
			$(".col-extr-" + i).addClass("hidden-md");
		}
		$("#div_heaters").removeClass("col-sm-6").addClass("col-sm-5");
		$("#div_temp_chart").removeClass("col-lg-5").addClass("col-lg-3");
		$("#div_status").removeClass("col-sm-6 col-lg-3").addClass("col-sm-7 col-lg-5");
	}
	
	// Charts
	
	resizeCharts();
	drawTemperatureChart();
}

function resetGui() {
	// Auto-Complete items
	
	clearGCodeList();
	clearHeadTemperatures();
	clearBedTemperatures();
	
	// Navbar
	
	setStatusLabel("Disconnected", "default");
	
	// Heater Temperatures
	
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
	setProbeValue(-1);
	$("#td_fanrpm").text("n/a");
	
	// Control page
	setAxesHomed([1,1,1]);
}

/* Static GUI Events */

$(".btn-connect").click(function() {
	if (!isConnected) {
		// Attempt to connect with the last-known password first
		connect(sessionPassword, true);
	} else {
		disconnect();
	}
});

$(".btn-emergency-stop").click(function() {
	sendGCode("M112\nM999");
});

$("#btn_extrude").click(function(e) {
	var feedrate = $("#panel_extrude input[name=feedrate]:checked").val() * 60;
	var amount = $("#panel_extrude input[name=feed]").val();
	sendGCode("G1 E" + amount + " F" + feedrate);
});
$("#btn_retract").click(function(e) {
	var feedrate = $("#panel_extrude input[name=feedrate]:checked").val() * 60;
	var amount = $("#panel_extrude input[name=feed]").val();
	sendGCode("G1 E-" + amount + " F" + feedrate);
});

$(".btn-home-x").resize(function() {
	if (!$(this).hasClass("hidden")) {
		$("#btn_homeall").css("width", $(this).parent().width());
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
		moveString += "\nM121";
		sendGCode(moveString);
	}
	e.preventDefault();
});

$(".gcode-input").submit(function(e) {
	if (isConnected) {
		sendGCode($(this).find("input").val());
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

$("#input_temp_bed").keydown(function(e) {
	if (isConnected && e.which == 13) {
		sendGCode("M140 S" + $(this).val());
		e.preventDefault();
	}
});

$("input[id*='input_temp_h']").keydown(function(e) {
	if (isConnected && e.which == 13) {
		var activeOrStandby = ($(this).attr("id").match("active$")) ? "S" : "R";
		var heater = $(this).attr("id").match("_h(.)_")[1];
		
		sendGCode("G10 P" + getToolByHeater(heater) + " " + activeOrStandby + $(this).val());
		e.preventDefault();
	}
});

$(".navbar-brand").click(function(e) { e.preventDefault(); });

$(".navlink").click(function(e) {
	var $target = $(this).data("target");
	showPage($target);
	e.preventDefault();
});

$("#panel_extrude label.btn").click(function() {
	$(this).parent().find("label.btn").removeClass("btn-primary").addClass("btn-default");
	$(this).removeClass("btn-default").addClass("btn-primary");
});

$(".span-collapse").click(function() {
	var $this = $(this);
	if(!$this.hasClass("panel-collapsed")) {
		$this.parents(".panel").find(".panel-collapse").slideUp();
		$this.addClass("panel-collapsed");
		$this.removeClass("glyphicon-chevron-down").addClass("glyphicon-chevron-up");
	} else {
		$this.parents(".panel").find(".panel-collapse").slideDown();
		$this.removeClass("panel-collapsed");
		$this.removeClass("glyphicon-chevron-up").addClass("glyphicon-chevron-down");
	}
});

$("#row_info").resize(function() {
	resizeCharts();
});

/* Temperature charts */

function drawTemperatureChart()
{
	// Only draw the chart if it's possible
	if ($("#chart_temp").width() === 0) {
		drawTempChart = true;
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
	
	drawTempChart = false;
}

function resizeCharts() {
	var headsHeight = $("#table_heaters").height();
	var statusHeight = $("#div_status_table").height() - 2; /* 2px border */
	
	var max = (headsHeight > statusHeight) ? headsHeight : statusHeight;
	max -= tempChartPadding;
	
	if (max > 0) {
		$("#chart_temp").css("height", max);
	}
	
	if (drawTempChart) {
		drawTemperatureChart();
	}
}

/* Modals */

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

$("#modal_pass_input").on('shown.bs.modal', function() {
	$('#input_password').focus()
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

function addToBedTemperatures(label, temperature) {
	$(".ul-bed-temp").append('<li><a href="#" class="bed-temp" data-temp="' + temperature + '">' + label + '</a></li>');
	$(".btn-bed-temp").removeClass("disabled");
	
	$(".bed-temp").click(function(e) {
		sendGCode("M140 S" + $(this).data("temp"));
		e.preventDefault();
	});
}

function addToGCodeList(label, gcode) {
	var item =	'<li><a href="#" class="gcode" data-gcode="' + gcode + '">';
 	item +=		'<span>' + label + '</span>';
	item +=		'<span class="label label-primary">' + gcode + '</span>';
	item +=		'</a></li>';
	
	$(".ul-gcodes").append(item);
	$(".btn-gcodes").removeClass("disabled");
	
	$(".gcode").click(function(e) {
		sendGCode($(this).data("gcode"));
		e.preventDefault();
	});
}

function addToControlMacros(label, filename) {
	var macroButton =	'<div class="btn-group">';
	macroButton +=		'<button class="btn btn-default btn-macro" data-macro="' + filename + '">' + label + '</button>';
	macroButton +=		'</div>';
	
	$("#panel_macro_buttons h4").addClass("hidden");
	$("#panel_macro_buttons .btn-group-vertical").append(macroButton);
	
	$(".btn-macro").click(function() {
		sendGCode("M98 P" + $(this).data("macro"));
	});
}

function addToHeadTemperatures(label, temperature) {
	$(".ul-head-temp").append('<li><a href="#" class="head-temp" data-temp="' + temperature + '">' + label + '</a></li>');
	$(".btn-head-temp").removeClass("disabled");
	
	$(".head-temp").click(function(e) {
		var inputElement = $(this).parent().parent().parent().parent().children("input");
		var activeOrStandby = (inputElement.attr("id").match("active$")) ? "S" : "R";
		var heater = inputElement.attr("id").match("_h(.)_")[1];
		
		sendGCode("G10 P" + getToolByHeater(heater) + " " + activeOrStandby + " " + $(this).data("temp"));
		e.preventDefault();
	});
}

function clearBedTemperatures() {
	$(".ul-bed-temp").html("");
	$(".btn-bed-temp").addClass("disabled");
}

function clearControlMacros() {
	$("#panel_macro_buttons .btn-group-vertical").html("");
	$("#panel_macro_buttons h4").removeClass("hidden");
}

function clearGCodeList() {
	$(".ul-gcodes").html("");
	$(".btn-gcodes").addClass("disabled");
}

function clearHeadTemperatures() {
	$(".ul-heat-temp").html("");
	$(".btn-head-temp").addClass("disabled");
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
	// If we have only one possibility to home the axes, we must have a delta configuration
	setDeltaMode(axes.length == 1);
	
	if (isDelta) {
		// Only set home alert visibility, axis buttons are hidden
		if (axes[0]) {
			$("#home_warning").addClass("hidden");
		} else {
			$("#unhomed_warning").html("The machine is not homed.");
			$("#home_warning").removeClass("hidden");
		}
	} else {
		// Set button colors
		var unhomedAxes = "";
		if (axes[0]) {
			$(".btn-home-x").removeClass("btn-warning").addClass("btn-primary");
		} else {
			unhomedAxes = ", X";
			$(".btn-home-x").removeClass("btn-primary").addClass("btn-warning");
		}
		if (axes[1]) {
			$(".btn-home-y").removeClass("btn-warning").addClass("btn-primary");
		} else {
			unhomedAxes += ", Y";
			$(".btn-home-y").removeClass("btn-primary").addClass("btn-warning");
		}
		if (axes[2]) {
			$(".btn-home-z").removeClass("btn-warning").addClass("btn-primary");
		} else {
			unhomedAxes += ", Z";
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
}

function setCurrentTemperature(heater, temperature) {
	var field = (heater == "bed") ? "#tr_bed td" : "#tr_head_" + heater + " td";
	if (temperature == undefined) {
		$(field).first().html("n/a");
	} else if (temperature == -273.15 /*ABS_ZERO*/) {
		$(field).first().html("error");
	} else {
		$(field).first().html(temperature.toFixed(1) + " °C");
	}
}

function setStatusLabel(text, style) {
	$(".label-status").removeClass("label-default label-danger label-info label-warning label-success").addClass("label-" + style).text(text);
}

function setDeltaMode(deltaOn) {
	if (deltaOn) {
		$(".home-buttons div, div.home-buttons").addClass("hidden");
		$("td.home-buttons").css("padding-right", "0px");
		$("#btn_homeall").css("width", "");
	} else {
		$(".home-buttons div, div.home-buttons").removeClass("hidden");
		$("td.home-buttons").css("padding-right", "");
		$("#btn_homeall").resize();
	}
	isDelta = deltaOn;
}

function setProbeValue(value) {
	$("#td_probe").html((value < 0) ? "n/a" : value);
	if (probeTriggerValue != undefined && value > probeTriggerValue && !isPrinting) {
		$("#td_probe").css("background-color", probeTriggerColor);
	} else if (probeSlowDownValue != undefined && value > probeSlowDownValue && !isPrinting) {
		$("#td_probe").css("background-color", probeSlowDownColor);
	} else {
		$("#td_probe").css("background-color", "");
	}
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

function showPage(name) {
	$(".navitem, .page").removeClass("active");
	$(".navitem-" + name + ", #page_" + name).addClass("active");
}

/* Data helpers */

function getToolByHeater(heater) {
	if (toolMapping == undefined) {
		return 0;
	}
	
	for(var i=0; i<toolMapping.length; i++) {
		for(var k=0; k<toolMapping[i].heaters.length; k++) {
			if (toolMapping[i].heaters[k] == heater) {
				return i + 1;
			}
		}
	}
	return 0;
}

/* DEMO */

/*$('#knob_heaters').knob({"change" : function (value) {
	value = Math.round(value);
	if (value > 0) {
		numHeads = value - 1;
		heatedBed = 1;
	} else {
		numHeads = 0;
		heatedBed = 0;
	}
	updateGui();
}});

$('#knob_extr').knob({"change" : function(value) {
	value = Math.round(value);
	numExtruderDrives = value;
	updateGui();
}});*/