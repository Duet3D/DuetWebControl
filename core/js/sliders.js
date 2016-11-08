/* Slider implementation for the Duet Web Control
 * 
 * written by Christian Hammacher (c) 2016
 * 
 * licensed under the terms of the GPL v2
 * see http://www.gnu.org/licenses/gpl-2.0.html
 */


var fanSliderActive, speedSliderActive, extrSliderActive;


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
		sendGCode("M106 S" + (slideEvt.value / 100.0));
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
		sendGCode("M106 S" + (slideEvt.value / 100.0));
		$("#slider_fan_control").slider("setValue", slideEvt.value);
	}
	fanSliderActive = false;
});

for(var extr = 1; extr <= maxExtruders; extr++) {
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

$('#slider_speed').slider({
	enabled: false,
	id: "speed",
	min: 20,
	max: 200,
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
