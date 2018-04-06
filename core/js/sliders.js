/* Slider implementation for the Duet Web Control
 * 
 * written by Christian Hammacher (c) 2016-2018
 * 
 * licensed under the terms of the GPL v3
 * see http://www.gnu.org/licenses/gpl-3.0.html
 */


var fanSliderActive, speedSliderActive, extrSliderActive;
var overriddenFanValues = [undefined, undefined, undefined];	// this must hold maxFans items


/* Fan Control */

$('#slider_fan_control').slider({
	enabled: false,
	id: "fan_control",
	min: 0,
	max: 100,
	step: 1,
	value: 35,
	tooltip: "always",
	formatter: function(value) {
		return value + " %";
	}
}).on("slideStart", function() {
	fanSliderActive = true;
}).on("slideStop", function(slideEvt) {
	if (isConnected && !isNaN(slideEvt.value)) {
		var fan = getFanSelection();
		var fanValue = slideEvt.value / 100.0;
		if (fan == undefined) {
			// Generic print fan is selected
			sendGCode("M106 S" + fanValue);
		} else {
			// Specific fan is selected
			if (overriddenFanValues[fan] != undefined) {
				overriddenFanValues[fan] = fanValue;
			}
			sendGCode("M106 P" + fan + " S" + fanValue);
		}
		$("#slider_fan_print").slider("setValue", slideEvt.value);
	}
	fanSliderActive = false;
});

$('#slider_fan_print').slider({
	enabled: false,
	id: "fan_print",
	min: 0,
	max: 100,
	step: 1,
	value: 35,
	tooltip: "always",
	formatter: function(value) {
		return value + " %";
	}
}).on("slideStart", function() {
	fanSliderActive = true;
}).on("slideStop", function(slideEvt) {
	if (isConnected && !isNaN(slideEvt.value)) {
		var fan = getFanSelection();
		var fanValue = slideEvt.value / 100.0;
		if (fan == undefined) {
			// Generic print fan is selected
			sendGCode("M106 S" + fanValue);
		} else {
			// Specific fan is selected
			if (overriddenFanValues[fan] != undefined) {
				overriddenFanValues[fan] = fanValue;
			}
			sendGCode("M106 P" + fan + " S" + fanValue);
		}
		$("#slider_fan_control").slider("setValue", slideEvt.value);
	}
	fanSliderActive = false;
});

function setFanVisibility(fan, visible) {
	var visibleFans = $(".table-fan-control [data-fan]:not(.hidden)");

	// update selection and check if the whole panel can be hidden
	var hideFanControl = false;
	if (!visible) {
		var firstVisibleFan;
		visibleFans.each(function() {
			if ($(this).data("fan") != fan) {
				firstVisibleFan = $(this);
				return false;
			}
		});

		hideFanControl = (firstVisibleFan == undefined);
	}

	$(".fan-control").toggleClass("hidden", hideFanControl);
	if (hideFanControl) {
		// Hide entire misc control panel if ATX control is hidden
		$("#panel_control_misc").toggleClass("hidden", !settings.showATXControl);
	}

	// set visibility of control buttons
	$('.table-fan-control [data-fan="' + fan + '"]').toggleClass("hidden", !visible);

	// if this fan value is being enforced, undo it
	setFanOverride(fan, undefined);
}

function getFanSelection() {
	var selection = $(".table-fan-control button.btn-primary.fan-selection");
	return (selection.length == 0) ? undefined : selection.data("fan");
}

function setFanSelection(fan) {
	$(".table-fan-control button.fan-selection").removeClass("btn-primary").removeClass("active").addClass("btn-default");
	if (fan != undefined) {
		$('.table-fan-control button.fan-selection[data-fan="' + fan + '"]').removeClass("btn-default").addClass("btn-primary").addClass("active");
	}
}

function setFanOverride(fan, overriddenValue) {
	// set model value
	overriddenFanValues[fan] = overriddenValue;

	// update UI
	var overridden = (overriddenValue != undefined);
	var toggleButton = $('.table-fan-control button.fan-override[data-fan="' + fan + '"]');
	toggleButton.toggleClass("btn-primary", overridden).toggleClass("btn-default", !overridden);
	toggleButton.toggleClass("active", overridden);
}

$("button.fan-selection").click(function() {
	var fan = $(this).data("fan");
	if ($(this).hasClass("disabled")) {
		// only apply other values if the selection has changed
		return;
	}

	if (fan == getFanSelection()) {
		setFanSelection(undefined);
		return;
	}
	setFanSelection(fan);

	var fanValue = overriddenFanValues[fan];
	if (fanValue == undefined && lastStatusResponse != undefined) {
		// this is only called if the firmware reports fan values as an array
		fanValue = lastStatusResponse.params.fanPercent[fan] / 100.0;
	}
	if (fanValue != undefined) {
		$(".fan-slider").children("input").slider("setValue", fanValue * 100.0);
	}
});

$("button.fan-override").click(function() {
	var fan = $(this).data("fan");
	if ($(this).hasClass("disabled")) {
		return;
	}

	if (overriddenFanValues[fan] == undefined) {
		if (fan == getFanSelection()) {
			var sliderValue = $(".fan-slider").children("input").slider("getValue") / 100.0;
			setFanOverride(fan, sliderValue);
		}
	} else {
		setFanOverride(fan, undefined);
	}
});


/* Extrusion Multiplier */

for(var extr = 0; extr < maxExtruders; extr++) {
	$('#slider_extr_' + extr).slider({
		enabled: false,
		id: "extr-" + extr,
		min: 50,
		max: 150,
		step: 1,
		value: 100,
		tooltip: "always",
		formatter: function(value) {
			return value + " %";
		}
	}).on("slideStart", function() {
		extrSliderActive = true;
	}).on("slideStop", function(slideEvt) {
		if (isConnected && !isNaN(slideEvt.value)) {
			sendGCode("M221 D" + $(this).data("drive") + " S" + slideEvt.value);
		}
		extrSliderActive = false;
	});
}


/* Speed slider */

$('#slider_speed').slider({
	enabled: false,
	id: "speed",
	min: 20,
	max: 300,
	step: 1,
	value: 100,
	tooltip: "always",
	formatter: function(value) {
		return value + " %";
	}
}).on("slideStart", function() {
	speedSliderActive = true;
}).on("slideStop", function(slideEvt) {
	if (isConnected && !isNaN(slideEvt.value)) {
		sendGCode("M220 S" + slideEvt.value);
	}
	speedSliderActive = false;
});
