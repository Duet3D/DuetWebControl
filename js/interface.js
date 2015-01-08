/* Interface logic for the Duet Web Control */

/* Constant values */

var errorSpan = '<span class="glyphicon glyphicon-exclamation-sign"></span> ';
var infoSpan = '<span class="glyphicon glyphicon-info-sign"></span> ';
var warningSpan = '<span class="glyphicon glyphicon-warning-sign"></span> ';

var tempChartOptions = 	{
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

var defaultPassword = "reprap";
var heatedBed = 1;					// either 0 or 1
var updateFrequency = 250;			// in ms

/* Variables */

var isConnected = false, isDeltaPrinter = false;

var drawTempPlot = false;

var numHeads, numExtruderDrives;
var recordedBedTemperatures, recordedHeadTemperatures;

var lastFirmwareMessage;

function resetGuiData() {
	numHeads = 4;			// 4 Heads max
	numExtruderDrives = 5;	// 5 Extruder Drives max
	
	recordedBedTemperatures = [];
	recordedHeadTemperatures = [];
	for(var i=0; i<numHeads; i++)
	{
		recordedHeadTemperatures.push([]);
	}
}

/* Connect / Disconnect */

function connect(password, firstConnect) {
	$(".btn-connect").removeClass("btn-info").addClass("btn-warning disabled").find("span:not(.glyphicon)").text("Connecting...");
	$(".btn-connect span.glyphicon").removeClass("glyphicon-log-in").addClass("glyphicon-transfer");
	$.ajax("rr_connect?password=" + password, {
		async: true,
		dataType: "json",
		error: function() {
 			showMessage(errorSpan + "Error", "Could not establish connection to the Duet firmware!<br/><br/>Please check your settings and try again.", "md");
			$("#modal_message").one("hide.bs.modal", function() {
				$(".btn-connect").removeClass("btn-warning disabled").addClass("btn-info").find("span:not(.glyphicon)").text("Connect");
				$(".btn-connect span.glyphicon").removeClass("glyphicon-transfer").addClass("glyphicon-log-in");
			});
		},
		success: function(data) {
			if (data.err == 2) {		// Looks like the firmware ran out of HTTP sessions
				showMessage(errorSpan + "Error", "Could not connect to Duet, because there are no more HTTP sessions available.", "md");
				$("#modal_message").one("hide.bs.modal", function() {
					$(".btn-connect").removeClass("btn-warning disabled").addClass("btn-info").find("span:not(.glyphicon)").text("Connect");
					$(".btn-connect span.glyphicon").removeClass("glyphicon-transfer").addClass("glyphicon-log-in");
				});
			}
			else if (firstConnect)
			{
				if (data.err == 0) {	// No password authentication required
					postConnect();
				}
				else {					// We can connect, but we need a password first
					showPasswordPrompt();
				}
			}
			else {
				if (data.err == 0) {	// Connect successful
					postConnect();
				} else {
					showMessage(errorSpan + "Error", "Invalid password!", "sm");
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
	$.ajax("rr_status", {
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
			
			// Status
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
					break;
					
				case 'B':	// Busy
					setStatusLabel("Busy", "success");
					break;
					
				case 'I':	// Idle
					setStatusLabel("Idle", "default");
					break;
			}
			
			// Heaters
			if (status.heaters.length != numHeads + heatedBed) {
				numHeads = status.heaters.length - heatedBed;
				updateGui();
			}
			if (heatedBed) {
				setCurrentTemperature("bed", status.heaters[0]);
				setTemperatureInput("bed", status.active[0], 1);
			}
			var heater;
			for(var i=heatedBed; i<status.heaters.length; i++) {
				heater = (i + (1 - heatedBed));
				setCurrentTemperature(heater, status.heaters[i]);
				setTemperatureInput(heater, status.active[i], 1);
				setTemperatureInput(heater, status.standby[i], 0);
			}
			
			// Live Coordinates
			//if (isDeltaPrinter && status.homed != TRUE?!) <- set values to n/a if not homed
			$("#td_x").html(status.pos[0].toFixed(2));
			$("#td_y").html(status.pos[1].toFixed(2));
			$("#td_z").html(status.pos[2].toFixed(2));
			
			// Extruder Drives
			if (status.extr.length != numExtruderDrives) {
				numExtruderDrives = status.extr.length;
				updateGui();
			}
			for(var i=1; i<=numExtruderDrives; i++) {
				$("#td_extr_" + i).html(status.extr[i - 1].toFixed(1));
			}
			$("#td_extr_total").html(status.extr.reduce(function(a, b) { return a + b; }));
			
			// Sensors
			$("#td_probe").html(status.probe);
			$("#td_fanrpm").html(status.fanRPM);
			
			// Message from firmware
			if (status.hasOwnProperty("message") && status.message != "" && status.message != lastFirmwareMessage) {
				showMessage(infoSpan + "Message from Duet firmware", status.message, "md");
				lastFirmwareMessage = status.message;
			}
			
			// Set timer for next status update
			setTimeout(updateStatus, updateFrequency);
		}
	});
}

function sendGCode(gcode) {
	// Although rr_gcode gives us a JSON response, it doesn't provide any results.
	// We only need to worry about an AJAX error event.
	$.ajax("rr_gcode?gcode=" + encodeURIComponent(gcode), {
		async: true,
		dataType: "json",
		error: function() { ajaxError(); }
	});
}

function ajaxError() {
	showMessage(warningSpan + "Communication Error", "An AJAX error has been reported, so the current session has been terminated.<br/><br/>Please check if your printer is still on and try to connect again.", "md");
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
	$(".btn-emergency-stop, .gcode-input button[type=submit]").removeClass("disabled");			// Navbar
	$("#mobile_home_buttons button, #btn_homeall, #table_move_head a").removeClass("disabled");	// Move buttons
}

function disableControls() {
	$(".btn-emergency-stop, .gcode-input button[type=submit]").addClass("disabled");			// Navbar
	$("#mobile_home_buttons button, #btn_homeall, #table_move_head a").addClass("disabled");	// Move buttons
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
	drawTemperaturePlot();
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
	
	// Head Position
	
	$("#td_x, #td_y, #td_z").text("n/a");
	
	// Extruder Position
	
	for(var i=1; i<=numExtruderDrives; i++) {
		$("#td_extr_" + i).text("n/a");
	}
	$("#td_extr_total").text("n/a");
	
	// Sensors
	
	$("#td_probe, #td_fanrpm").text("n/a");
}

/* GUI Events */

$(".btn-connect").click(function(e) {
	if (!isConnected) {
		// Attempt to connect with the default password first
		connect(defaultPassword, true);
	} else {
		disconnect();
	}
	e.preventDefault();
});

$(".btn-emergency-stop").click(function(e) {
	sendGCode("M112\nM999");
	e.preventDefault();
});

$("#btn_homex").resize(function() {
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

$(".span-collapse").click(function(e) {
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
	e.preventDefault();
});

$("#row_info").resize(function() {
	resizeCharts();
});

/* List items */

$(".navlink").click(function(e) {
	var $target = $(this).data("target");
	showPage($target);
	e.preventDefault();
});

$(".gcode").click(function(e) {
	sendGCode($(this).data("gcode"));
	e.preventDefault();
});

/* Temperature charts */

function drawTemperaturePlot()
{
	if ($("#chart_temp").width() === 0) {
		drawTempPlot = true;
		return;
	}
	
	var plotData = [];
	if (heatedBed) {
		plotData.push(recordedBedTemperatures);
	}
	for(var i=0; i<numHeads; i++) {
		plotData.push(recordedHeadTemperatures[i]);
	}

	$.plot("#chart_temp", plotData, tempChartOptions);
	drawTempPlot = false;
}

function resizeCharts() {
	var headsHeight = $("#table_heaters").height();
	var statusHeight = $("#div_status_table").height() - 2; /* 2px border */
	
	var max = (headsHeight > statusHeight) ? headsHeight : statusHeight;
	max -= tempChartPadding;
	
	if (max > 0) {
		$("#chart_temp").css("height", max);
	}
	
	if (drawTempPlot) {
		drawTemperaturePlot();
	}
}

/* Modals */

function showMessage(title, message, size) {
	$("#modal_message h4").html(title);
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

function clearGCodeList() {
	$(".ul-gcodes").html("");
	$(".btn-gcodes").addClass("disabled");
}

function addToGCodeList(label, gcode) {
	var item =	'<li><a href="#" class="gcode" data-gcode="' + gcode + '">';
 	item +=		'<span>' + label + '</span>';
	item +=		'<span class="label label-primary">' + gcode + '</span>';
	item +=		'</a></li>';
	
	$(".ul-gcodes").append(item);
	$(".btn-gcodes").removeClass("disabled");
}

function clearHeadTemperatures() {
	$(".ul-heat-temp").html("");
	$(".btn-head-temp").addClass("disabled");
}

function addToHeadTemperatures(label, gcode) {
	$(".ul-head-temp").append("<li><a href=\"#\">" + label + "</a></li>");
	$(".btn-head-temp").removeClass("disabled");
}

function clearBedTemperatures() {
	$(".ul-bed-temp").html("");
	$(".btn-bed-temp").addClass("disabled");
}

function addToBedTemperatures(label, gcode) {
	$(".ul-bed-temp").append("<li><a href=\"#\">" + label + "</a></li>");
	$(".btn-bed-temp").removeClass("disabled");
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
	isDeltaPrinter = deltaOn;
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

/* DEMO */

$('#knob_heaters').knob({"change" : function (value) {
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
}});