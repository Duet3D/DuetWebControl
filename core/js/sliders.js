/* Slider implementation for the Duet Web Control
 * 
 * written by Christian Hammacher (c) 2016-2018
 * 
 * licensed under the terms of the GPL v3
 * see http://www.gnu.org/licenses/gpl-3.0.html
 */


var fanSliderActive = undefined, speedSliderActive = false, extrSliderActive = false;
var overriddenFanValues = [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined];	// this must hold maxFans items


/* Fan Control */

for(var fan = -1; fan < maxFans; fan++) {
	var fanID = (fan == -1) ? "print" : fan;
	$('#slider_fan_control_' + fanID).slider({
		enabled: false,
		id: "fan_control_" + fanID,
		min: 0,
		max: 100,
		step: 1,
		value: 35,
		tooltip: "always",
		formatter: function(value) {
			return value + " %";
		}
	}).on("slideStart", function() {
		fanSliderActive = fanID;
	}).on("slideStop", function(slideEvt) {
		if (isConnected && !isNaN(slideEvt.value)) {
			var fanID = $(this).parents("tr").data("fan");
			var fanValue = slideEvt.value / 100.0;
			if (fanID == "print") {
				// Generic print fan is selected
				sendGCode("M106 S" + fanValue);
			} else {
				// Specific fan is selected
				if (overriddenFanValues[fanID] != undefined) {
					overriddenFanValues[fanID] = fanValue;
				}
				sendGCode("M106 P" + fanID + " S" + fanValue);
			}
			$("#slider_fan_print_" + fanID).slider("setValue", slideEvt.value);
		}
		fanSliderActive = undefined;
	});

	$('#slider_fan_print_' + fanID).slider({
		enabled: false,
		id: "fan_print_" + fanID,
		min: 0,
		max: 100,
		step: 1,
		value: 35,
		tooltip: "always",
		formatter: function(value) {
			return value + " %";
		}
	}).on("slideStart", function() {
		fanSliderActive = fanID;
	}).on("slideStop", function(slideEvt) {
		if (isConnected && !isNaN(slideEvt.value)) {
			var fanID = $(this).parents("tr").data("fan");
			var fanValue = slideEvt.value / 100.0;
			if (fanID == "print") {
				// Generic print fan is selected
				sendGCode("M106 S" + fanValue);
			} else {
				// Specific fan is selected
				if (overriddenFanValues[fanID] != undefined) {
					overriddenFanValues[fanID] = fanValue;
				}
				sendGCode("M106 P" + fanID + " S" + fanValue);
			}
			$("#slider_fan_control_" + fanID).slider("setValue", slideEvt.value);
		}
		fanSliderActive = undefined;
	});
}

function setFanVisibility(fan, visible) {
	// set visibility of the corresponding control button
	$('.table-fan-control tr[data-fan="' + fan + '"]').toggleClass("hidden", !visible);

	// if this fan's value was being enforced, undo it
	setFanOverride(fan, undefined);
}

function setFanOverride(fan, overriddenValue) {
	// set model value
	overriddenFanValues[fan] = overriddenValue;

	// update UI
	var overridden = (overriddenValue != undefined);
	var toggleButton = $('.table-fan-control tr[data-fan="' + fan + '"] button.fan-override');
	toggleButton.toggleClass("btn-primary", overridden).toggleClass("btn-default", !overridden);
	toggleButton.toggleClass("active", overridden);
}

$("button.fan-visibility").click(function() {
	var fan = $(this).parents("tr").data("fan");
	setFanDisplayed(fan, !$(this).hasClass("active"));
});

$("button.fan-override").click(function() {
	if ($(this).hasClass("disabled")) {
		return;
	}

	var fan = $(this).parents("tr").data("fan");
	if (overriddenFanValues[fan] == undefined) {
		var sliderValue = $(this).parents("tr").find(".fan-slider > input").slider("getValue");
		setFanOverride(fan, sliderValue / 100.0);
	} else {
		setFanOverride(fan, undefined);
	}
});

function loadFanVisibility() {
	var fanVisibility = localStorage.getItem("fanVisibility");
	if (fanVisibility != null) {
		for(var fan = 0; fan <= maxFans; fan++) {
			if (fan == 0) {
				setFanDisplayed("print", (fanVisibility & 1) != 0);
			} else {
				setFanDisplayed(fan - 1, (fanVisibility & (1 << fan)) != 0);
			}
		}
	}
}

function setFanDisplayed(fan, show) {
	if (show) {
		$(".table-fan-control tr[data-fan='" + fan + "'] button.fan-visibility").removeClass("btn-default").addClass("btn-primary active");
		$(".table-fan-control tr[data-fan='" + fan + "'] button.fan-override").toggleClass("disabled", !isConnected);
		$(".table-fan-control tr[data-fan='" + fan + "'] > td:last-child").children().removeClass("hidden");

		// Restore correct value
		if (fan != "print") {
			var fanValue = overriddenFanValues[fan];
			if (fanValue == undefined && lastStatusResponse != undefined) {
				// this is only called if the firmware reports fan values as an array
				fanValue = lastStatusResponse.params.fanPercent[fan] / 100.0;
			}

			if (fanValue != undefined) {
				$("tr[data-fan='" + fan + "'] .fan-slider > input").slider("setValue", fanValue * 100.0);
			}
		} else {
			$("tr[data-fan='print'] .fan-slider > input").slider("relayout");
		}
	} else {
		$(".table-fan-control tr[data-fan='" + fan + "'] button.fan-visibility").removeClass("btn-primary active").addClass("btn-default");
		$(".table-fan-control tr[data-fan='" + fan + "'] button.fan-override").addClass("disabled");
		$(".table-fan-control tr[data-fan='" + fan + "'] > td:last-child").children().addClass("hidden");

		if (fan != "print") {
			setFanOverride(fan, undefined);
		}
	}

	// Store the fan visibility in localStorage
	var visibilityBitmap = 0;
	for(var fan = 0; fan <= maxFans; fan++) {
		if (fan == 0) {
			if ($(".table-fan-control tr[data-fan='print'] button.fan-visibility").hasClass("active")) {
				visibilityBitmap |= 1;
			}
		} else if ($(".table-fan-control tr[data-fan='" + (fan - 1) + "'] button.fan-visibility").hasClass("active")) {
			visibilityBitmap |= (1 << fan);
		}
	}
	localStorage.setItem("fanVisibility", visibilityBitmap);
}


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
