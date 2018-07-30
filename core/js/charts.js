/* Chart interface logic for Duet Web Control
 * 
 * written by Christian Hammacher (c) 2016-2017
 * 
 * licensed under the terms of the GPL v3
 * see http://www.gnu.org/licenses/gpl-3.0.html
 */

// Temperature chart options
var maxTemperatureSamples = 1000;

var tempChart;
var tempChartOptions = 	{
	// This array should hold maxHeaters + maxTempSensors items
	colors: ["#0000FF", "#FF0000", "#00DD00", "#FFA000", "#FF00FF", "#337AB7", "#000000", "#E0E000",							// Heater colors
			"#AEAEAE", "#BC0000", "#00CB00", "#0000DC", "#FEABEF", "#A0A000", "#DDDD00", "#00BDBD", "#CCBBAA", "#AA00AA"],		// Virtual heater colors
	grid: {
		borderWidth: 0
	},
	xaxis: {
		show: false
		/*labelWidth: 0,
		labelHeight: 0,
		tickSize: 30000,
		tickFormatter: function() { return ""; },
		reserveSpace: false*/
	},
	yaxis: {
		min: 0,
		max: 280
	}
};

var recordedTemperatures, extraSensorVisibility;
var maxLayerTime = 0;
var refreshTempChart = false;

// Print chart options
var printChart;
var printChartOptions =	{
	colors: ["#EDC240"],
	grid: {
		borderWidth: 0,
		hoverable: true,
		clickable: true
	},
	pan: {
		interactive: true
	},
	series: {
		lines: {
			show: true
		},
		points: {
			show: true
		}
	},
	xaxis: {
		min: 1,
		tickDecimals: 0,
	},
	yaxis: {
		min: 0,
		max: 30,
		ticks: 5,
		tickDecimals: 0,
		tickFormatter: function(val) {
			if (!val) {
				return "";
			} else {
				return formatTime(val);
			}
		}
	},
	zoom: {
		interactive: true
	}
};

var refreshPrintChart = false;
var layerData;


/* Temperature chart */

function recordCurrentTemperatures(temps) {
	var timeNow = (new Date()).getTime();

	// Add temperatures for each heater
	// Also cut off the last one if there are too many temperature samples
	for(var heater = 0; heater < maxHeaters; heater++) {
		if (heater < temps.length && heatersInUse[heater]) {
			recordedTemperatures[heater].push([timeNow, temps[heater]]);
		} else {
			recordedTemperatures[heater].push([]);
		}

		if (recordedTemperatures[heater].length > maxTemperatureSamples) {
			recordedTemperatures[heater].shift();
		}
	}
}

function recordExtraTemperatures(temps) {
	var timeNow = (new Date()).getTime();

	// Add dashed series for each temperature sensor
	for(var i = 0; i < maxTempSensors; i++)
	{
		if (i < temps.length) {
			recordedTemperatures[maxHeaters + i].data.push([timeNow, temps[i].temp]);
		} else {
			recordedTemperatures[maxHeaters + i].data.push([]);
		}

		if (recordedTemperatures[maxHeaters + i].data.length > maxTemperatureSamples) {
			recordedTemperatures[maxHeaters + i].data.shift();
		}
	}
}

function drawTemperatureChart() {
	// Only draw the chart if it's possible
	if ($("#chart_temp").width() === 0) {
		refreshTempChart = true;
		return;
	}

	// Check if we need to recreate the chart
	var recreateChart = false;
	if (tempLimit != tempChartOptions.yaxis.max) {
		tempChartOptions.yaxis.max = tempLimit;
		recreateChart = true;
	}

	// Draw it
	if (tempChart == undefined || recreateChart) {
		tempChart = $.plot("#chart_temp", recordedTemperatures, tempChartOptions);
	} else {
		tempChart.setData(recordedTemperatures);
		tempChart.setupGrid();
		tempChart.draw();
	}

	refreshTempChart = false;
}

function setExtraTemperatureVisibility(sensor, visible) {
	// Update visibility
	recordedTemperatures[maxHeaters + sensor].dashes.show = visible;

	// Save state
	extraSensorVisibility[sensor] = visible;
	setLocalSetting("extraSensorVisibility", extraSensorVisibility);
}


/* Print statistics chart */

function addLayerData(lastLayerTime, filamentUsed, updateGui) {
	layerData.push([layerData.length + 1, lastLayerTime, filamentUsed]);
	if (lastLayerTime > maxLayerTime) {
		maxLayerTime = lastLayerTime;
	}

	if (updateGui) {
		$("#td_last_layertime").html(formatTime(lastLayerTime)).addClass("layer-done-animation");
		setTimeout(function() {
			$("#td_last_layertime").removeClass("layer-done-animation");
		}, 2000);

		drawPrintChart();
	}
}

function drawPrintChart() {
	// Only draw the chart if it's possible
	if ($("#chart_print").width() === 0) {
		refreshPrintChart = true;
		return;
	}

	// Find absolute maximum values for the X axis
	var maxX = 25, maxPanX = 25;
	if (layerData.length < 21) {
		maxX = maxPanX = 20;
	} else if (layerData.length < 25) {
		maxX = maxPanX = layerData.length;
	} else {
		maxPanX = layerData.length;
	}
	printChartOptions.xaxis.max = maxX;
	printChartOptions.xaxis.panRange = [1, maxPanX];
	printChartOptions.xaxis.zoomRange = [25, maxPanX];

	// Find max visible value for Y axis
	var maxY = 30;
	if (layerData.length > 1) {
		var firstLayerToCheck = (layerData.length > 26) ? layerData.length - 25 : 1;
		for(var i = firstLayerToCheck; i < layerData.length; i++) {
			var layerVal = layerData[i][1] * 1.1;
			if (maxY < layerVal) {
				maxY = layerVal;
			}
		}
	}
	printChartOptions.yaxis.max = maxY;
	printChartOptions.yaxis.panRange = [0, (maxLayerTime < maxY) ? maxY : maxLayerTime];
	printChartOptions.yaxis.zoomRange = [30, (maxLayerTime < maxY) ? maxY : maxLayerTime];

	// Update chart and pan to the right
	printChart = $.plot("#chart_print", [layerData], printChartOptions);
	printChart.pan({ left: 99999 });
	refreshPrintChart = false;

	// Add hover events to chart
	$("#chart_print").unbind("plothover").bind("plothover", function(e, pos, item) {
		if (item) {
			// Get layer number and time used
			var layer = item.datapoint[0];
			var timeUsed = item.datapoint[1];

			// Get filament usage
			var filamentUsed;
			if (layer > 1) {
				filamentUsed = layerData[layer - 1][2] - layerData[layer - 2][2];
			} else {
				filamentUsed = layerData[layer - 1][2];
			}

			// Build tool tip
			var toolTip =	"<center><strong>" + T("Layer {0}", layer) + "</strong></center><br/>";
			toolTip +=		T("Time: {0}", formatTime(timeUsed)) + "<br/>";
			toolTip +=		T("Filament usage: {0} mm", filamentUsed.toFixed(1));

			// Show it
			$("#layer_tooltip").html(toolTip).css({top: item.pageY + 5, left: item.pageX + 5}).fadeIn(200);
		} else {
			$("#layer_tooltip").hide();
		}
	});
}


/* Common functions */

function resizeCharts() {
	var contentHeight = $("#table_tools").height();
	if (!$("#div_heaters").hasClass("hidden")) {
		contentHeight = $("#table_heaters").height();
	} else if (!$("#div_extra").hasClass("hidden")) {
		contentHeight = $("#table_extra").height();
	}

	var statusHeight = 0;
	$("#div_status table").each(function() {
		statusHeight += $(this).outerHeight();
	});

	var max = (contentHeight > statusHeight) ? contentHeight : statusHeight;
	var padding = $("#chart_temp").parent().outerHeight() - $("#chart_temp").height();
	max -= padding;

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

$(".panel-chart").resize(function() {
	resizeCharts();
});

function resetChartData() {
	// Initialize visibility states of the extra temperature sensors
	extraSensorVisibility = getLocalSetting("extraSensorVisibility", null);
	if (extraSensorVisibility == null || extraSensorVisibility.length < maxTempSensors) {
		extraSensorVisibility = [];
		for(var i = 0; i < maxTempSensors; i++) {
			// Don't show any extra temperatures in the chart by default
			extraSensorVisibility.push(false);
		}
	}

	// Reset data of the temperature chart
	recordedTemperatures = [];
	for(var i = 0; i < maxHeaters; i++) {
		recordedTemperatures.push([]);
	}

	for(var i = 0; i < maxTempSensors; i++) {
		recordedTemperatures.push({
			dashes: { show: extraSensorVisibility[i] },
			lines: { show: false },
			data: []
		});

		$("#table_extra tr input[type='checkbox']").eq(i).prop("checked", extraSensorVisibility[i]);
	}

	// Reset data of the layer chart
	layerData = [];
	maxLayerTime = 0;
}
