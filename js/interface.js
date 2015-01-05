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
 * UNUSED FIELDS:
 * - alerts (div)
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
var tempChartPadding = 17; /* 15px padding + 2px border */

/* Variables */

var drawTempPlot = 0;

var numHeads, numExtruderDrives, heatedBed;
var recordedBedTemperatures, recordedHeadTemperatures;

function resetGuiData()
{
	numHeads = 4;			// 4 Heads max
	numExtruderDrives = 5;	// 5 Extruder Drives max
	heatedBed = 1;			// Either have one or not
	
	recordedBedTemperatures = [];
	recordedHeadTemperatures = [];
	for(var i=0; i<numHeads; i++)
	{
		recordedHeadTemperatures.push([]);
	}
}

/* Basic hooks */

$(document).ready(function() {
	resetGuiData();
	updateGui();
});

/* GUI */

function updateGui()
{
	// Auto-Complete items
	
	clearGCodeList();
	addToGCodeList("Disable bed compensation", "M561");
	addToGCodeList("Go to origin", "G1 X0 Y0 Z0");
	
	clearHeadTemperatures();
	
	clearBedTemperatures();
	
	// Visibility for Heater Temperatures
	
	console.log("Heated bed? " + heatedBed);
	if (heatedBed) {	// Heated Bed
		$("#tr_bed").removeClass("hidden");
	} else {
		$("#tr_bed").addClass("hidden");
	}
	if (numHeads > 0) { // Head 1
		$("#tr_head_1").removeClass("hidden");
	} else {
		$("#tr_head_1").addClass("hidden");
	}
	if (numHeads > 1) { // Head 2
		$("#tr_head_2").removeClass("hidden");
	} else {
		$("#tr_head_2").addClass("hidden");
	}
	if (numHeads > 2) { // Head 3
		$("#tr_head_3").removeClass("hidden");
	} else {
		$("#tr_head_3").addClass("hidden");
	}
	if (numHeads > 3) { // Head 4
		$("#tr_head_4").removeClass("hidden");
	} else {
		$("#tr_head_4").addClass("hidden");
	}
	
	// Temperature Chart
	
	resizeCharts();
	drawTemperaturePlot();
	
	// Visibility for Extruder Drive columns
	
	if (numExtruderDrives > 4) {	// Drive 5
		$(".col-extr-5").removeClass("hidden");
	} else {
		$(".col-extr-5").addClass("hidden");
	}
	if (numExtruderDrives > 3) {	// Drive 4
		$(".col-extr-4").removeClass("hidden");
	} else {
		$(".col-extr-4").addClass("hidden");
	}
	if (numExtruderDrives > 2) {	// Drive 3
		$(".col-extr-3").removeClass("hidden"); 
	} else {
		$(".col-extr-3").addClass("hidden");
	}
	if (numExtruderDrives > 1) {	// Drive 2
		$(".col-extr-2").removeClass("hidden");
	} else {
		$(".col-extr-2").addClass("hidden");
	}
	if (numExtruderDrives > 0) {	// Drive 1
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
}

function drawTemperaturePlot()
{
	if ($("#chart_temp").width() === 0) {
		drawTempPlot = 1;
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
	drawTempPlot = 0;
}

/* Cookies */

function loadValues() {
	
}

function saveValues() {
	
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

function resizeCharts() {
	var headsHeight = $("#table_heaters").height();
	var statusHeight = $("#div_status_table").height();
	
	var max = (headsHeight > statusHeight) ? headsHeight : statusHeight;
	max -= tempChartPadding;
	
	if (max > 0) {
		$("#chart_temp").css("height", max);
	}
	
	if (drawTempPlot) {
		drawTemperaturePlot();
	}
}

function showPage(name) {
	$(".navitem, .page").removeClass("active");
	$(".navitem-" + name + ", #page_" + name).addClass("active");
}

/* GUI Events */

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
	if(!$this.hasClass('panel-collapsed')) {
		$this.parents('.panel').find('.panel-collapse').slideUp();
		$this.addClass('panel-collapsed');
		$this.removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-up');
	} else {
		$this.parents('.panel').find('.panel-collapse').slideDown();
		$this.removeClass('panel-collapsed');
		$this.removeClass('glyphicon-chevron-up').addClass('glyphicon-chevron-down');
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