/* Chart interface logic for Duet Web Control
 * 
 * written by Christian Hammacher (c) 2016-2017
 * 
 * licensed under the terms of the GPL v3
 * see http://www.gnu.org/licenses/gpl-3.0.html
 */


var tempChart;
var tempChartOptions = 	{
	// This should hold maxHeater + 1 entries (+ 1 for the chamber heater)
	colors: ["#0000FF", "#FF0000", "#00DD00", "#FFA000", "#FF00FF", "#337AB7", "#00FFFF", "#ffff00", "#000000"],
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

var maxTemperatureSamples = 1000;
var maxLayerTime = 0;


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

var refreshTempChart = false, refreshPrintChart = false;
var recordedBedTemperatures, recordedChamberTemperatures, recordedHeadTemperatures, layerData;


/* Temperature chart */

function recordHeaterTemperatures(bedTemp, chamberTemp, headTemps) {
	var timeNow = (new Date()).getTime();

	// Add bed temperature
	if (heatedBed) {
		recordedBedTemperatures.push([timeNow, bedTemp]);
	} else {
		recordedBedTemperatures = [];
	}
	if (recordedBedTemperatures.length > maxTemperatureSamples) {
		recordedBedTemperatures.shift();
	}

	// Add chamber temperature
	if (chamber) {
		recordedChamberTemperatures.push([timeNow, chamberTemp]);
	} else {
		recordedChamberTemperatures = [];
	}
	if (recordedChamberTemperatures.length > maxTemperatureSamples) {
		recordedChamberTemperatures.shift();
	}

	// Add heater temperatures
	for(var i = 0; i < headTemps.length; i++) {
		recordedHeadTemperatures[i].push([timeNow, headTemps[i]]);
		if (recordedHeadTemperatures[i].length > maxTemperatureSamples) {
			recordedHeadTemperatures[i].shift();
		}
	}

	// Remove invalid data (in case the number of heads has changed)
	for(var i = headTemps.length; i < maxHeaters; i++) {
		recordedHeadTemperatures[i] = [];
	}
}

function drawTemperatureChart() {
	// Only draw the chart if it's possible
	if ($("#chart_temp").width() === 0) {
		refreshTempChart = true;
		return;
	}

	// Prepare the data
	var tempData = [];
	tempData.push(recordedBedTemperatures);
	for(var head = 0; head < maxHeaters - 1; head++) {
		if (head < recordedHeadTemperatures.length) {
			tempData.push(recordedHeadTemperatures[head]);
		} else {
			tempData.push([]);
		}
	}
	tempData.push(recordedChamberTemperatures);

	// Check if we need to recreate the chart
	var recreateChart = false;
	if (tempLimit != tempChartOptions.yaxis.max) {
		tempChartOptions.yaxis.max = tempLimit;
		recreateChart = true;
	}

	// Draw it
	if (tempChart == undefined || recreateChart) {
		tempChart = $.plot("#chart_temp", tempData, tempChartOptions);
	} else {
		tempChart.setData(tempData);
		tempChart.setupGrid();
		tempChart.draw();
	}

	refreshTempChart = false;
}


/* Print statistics chart */

function addLayerData(lastLayerTime, updateGui) {
	layerData.push([layerData.length + 1, lastLayerTime]);
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
	$("#chart_print").unbind("plothover").bind("plothover", function (event, pos, item) {
		if (item) {
			var layer = item.datapoint[0];
			if (layer == 0) {
				layer = 1;
			}

			$("#layer_tooltip").html(T("Layer {0}: {1}", layer, formatTime(item.datapoint[1])))
				.css({top: item.pageY + 5, left: item.pageX + 5})
				.fadeIn(200);
		} else {
			$("#layer_tooltip").hide();
		}
	});
}


/* Common functions */

function resizeCharts() {
	var headsHeight = $("#table_heaters").height();
	var statusHeight = 0;
	$("#div_status table").each(function() {
		statusHeight += $(this).outerHeight();
	});

	var max = (headsHeight > statusHeight) ? headsHeight : statusHeight;
	max -= tempChartPadding;

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
	recordedBedTemperatures = [];
	recordedChamberTemperatures = [];
	recordedHeadTemperatures = [];
	for(var i = 0; i < maxHeaters; i++) {
		recordedHeadTemperatures.push([]);
	}

	layerData = [];
	maxLayerTime = 0;
}
