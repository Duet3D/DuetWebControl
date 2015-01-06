/* Interface logic for the Duet Web Control */

/* 
 * UNUSED INPUTS:
 * - h1_active_temp
 * - h1_standby_temp
 * - h2_active_temp
 * - h2_standby_temp
 * - h3_active_temp
 * - h3_standby_temp
 * - h4_active_temp
 * - h4_standby_temp
 * 
 */

/* Constant values */

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

var isConnected = false;

var drawTempPlot = false;

var numHeads, numExtruderDrives;
var recordedBedTemperatures, recordedHeadTemperatures;

function resetGuiData()
{
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
	$(".btn-connect").removeClass("btn-info").addClass("btn-warning disabled").html("Connecting...");
	$.ajax("rr_connect?password=" + password, {
		async: true,
		dataType: "json",
		error: function() {
			showError("Error", "Could not establish connection to the Duet firmware!<br/><br/>Please check your settings and try again.", "md");
			$("#modal_error").one("hide.bs.modal", function() {
				$(".btn-connect").removeClass("btn-warning disabled").addClass("btn-info").html("Connect");
			});
		},
		success: function(data) {
			if (data.err == 2) {		// Looks like the firmware ran out of HTTP sessions
				showError("Error", "Could not connect to Duet, because there are no more HTTP sessions available.", "md");
				$("#modal_error").one("hide.bs.modal", function() {
					$(".btn-connect").removeClass("btn-warning disabled").addClass("btn-info").html("Connect");
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
					$(".btn-connect").removeClass("btn-warning disabled").addClass("btn-info").html("Connect");
					showError("Error", "Invalid password!", "sm");
				}
			}
		}
	});
}

function postConnect() {
	isConnected = true;
	
	updateStatus();
	//updateFileInfo();
	
	$(".btn-connect").removeClass("btn-warning disabled").addClass("btn-success").html("Disconnect");
}

function disconnect() {
	isConnected = false;
	$.ajax("rr_disconnect", { async: true, dataType: "json" });
	$(".btn-connect").removeClass("btn-success").addClass("btn-info").html("Connect");
	
	resetGuiData();
	resetGui();
	updateGui();
}

/* Automatic status update */

function updateStatus() {
	$.ajax("rr_status", {
		async: true,
		dataType: "json",
		error: function() {
			if (isConnected) {
				// TODO: message or log entry here
				disconnect();
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
					setStatusLabel("Halted", "label-danger");
					break;
					
				case 'D':	// Pausing / Decelerating
					setStatusLabel("Pausing", "label-warning");
					break;
				
				case 'S':	// Paused / Stopped
					setStatusLabel("Paused", "label-info");
					break;
					
				case 'R':	// Resuming
					setStatusLabel("Resuming", "label-warning");
					break;
					
				case 'P':	// Printing
					setStatusLabel("Printing", "label-success");
					break;
					
				case 'B':	// Busy
					setStatusLabel("Busy", "label-success");
					break;
					
				case 'I':	// Idle
					setStatusLabel("Idle", "label-default");
					break;
			}
			
			// Heaters
			if (status.heaters.length != numHeads + heatedBed) {
				numHeads = status.heaters.length - heatedBed;
				updateGui();
			}
			if (heatedBed) {
				setCurrentTemperature("#tr_bed td",  status.heaters[0]);
			}
			for(var i=heatedBed; i<status.heaters.length; i++) {
				setCurrentTemperature("#tr_head_" + (i + (1 - heatedBed)) + " td", status.heaters[i]);
			}
			
			// Live Coordinates
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
			
			// Set timer for next status update
			setTimeout(updateStatus, updateFrequency);
		}
	});
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

function updateGui()
{
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

function resetGui()
{
	// Auto-Complete items
	
	clearGCodeList();
	clearHeadTemperatures();
	clearBedTemperatures();
	
	// Navbar
	
	setStatusLabel("Disconnected", "label-default");
	
	// Heater Temperatures
	
	setCurrentTemperature("#tr_bed td",  undefined);
	for(var i=1; i<=4; i++) {
		setCurrentTemperature("#tr_head_" + i + " td", undefined);
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

function setCurrentTemperature(field, temperature) {
	if (temperature == undefined) {
		$(field).first().html("n/a");
	} else if (temperature == -273.15 /*ABS_ZERO*/) {
		$(field).first().html("error");
	} else {
		$(field).first().html(temperature.toFixed(1) + " °C");
	}
}

function setStatusLabel(text, style) {
	$(".label-status").removeClass("label-default label-danger label-info label-warning label-success").addClass(style).text(text);
}

function showPage(name) {
	$(".navitem, .page").removeClass("active");
	$(".navitem-" + name + ", #page_" + name).addClass("active");
}

/* GUI Events */

$(".btn-connect").click(function() {
	if (!isConnected) {
		// Attempt to connect with the default password first
		connect(defaultPassword, true);
	} else {
		disconnect();
	}
});

// This one should be replaced by proper CSS someday.
// For now we only check which rows may float around.
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

/* List items */

$(".navlink").click(function() {
	var $target = $(this).data("target");
	showPage($target);
});

$(".gcode").click(function() {
	// TODO
});

/* Modals */

function showError(title, message, size) {
	$("#modal_error h4").html(title);
	$("#modal_error p").html(message);
	$("#modal_error .modal-dialog").removeClass("modal-sm modal-md").addClass("modal-" + size);
	$("#modal_error").modal("show");
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

$("#modal_error").on('shown.bs.modal', function() {
	$('#modal_error button').focus()
});

$("#form_password").submit(function(e) {
	$("#modal_pass_input").off("hide.bs.modal").modal("hide");
	connect($("#input_password").val(), false);
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