/* Settings management for Duet Web Control
 * 
 * written by Christian Hammacher (c) 2016
 * 
 * licensed under the terms of the GPL v2
 * see http://www.gnu.org/licenses/gpl-2.0.html
 */


var settings = {
	autoConnect: true,				// automatically connect once the page has loaded
	updateInterval: 250,			// in ms
	extendedStatusInterval: 10,		// nth status request will include extended values
	maxRetries: 1,					// number of AJAX retries before the connection is terminated

	haltedReconnectDelay: 10000,	// in ms (increased from 5000 for Duet WiFi)
	updateReconnectDelay: 20000,	// in ms
	dwsReconnectDelay: 45000,		// in ms
	dwcReconnectDelay: 225000,		// in ms

	confirmStop: false,				// ask for confirmation when pressing Emergency STOP
	useKiB: true,					// display file sizes in KiB instead of KB
	useDarkTheme: false,			// load dark theme by Fotomas
	language: "en",

	moveFeedrate: 6000,				// in mm/min
	halfZMovements: false,			// use half Z movements
	showATXControl: false,			// show ATX control

	showFanControl: false,			// show fan controls
	showFanRPM: false,				// show fan RPM in sensors

	logSuccess: false,				// log all sucessful G-Codes in the console
	uppercaseGCode: true,			// convert G-Codes to upper-case before sending them

	doTfree: true,					// tool
	doTpre: true,					// change
	doTpost: true,					// options

	notificationTimeout: 5000,		// in ms
	autoCloseUserMessages: false,	// whether M117 messages are automatically closed

	webcamURL: "",
	webcamInterval: 5000,			// in ms

	defaultActiveTemps: [0, 180, 190, 200, 210, 220, 235],
	defaultStandbyTemps: [0, 95, 120, 140, 155, 170],
	defaultBedTemps: [0, 55, 60, 65, 90, 110, 120],
	defaultGCodes: [
		["M0", "Stop"],
		["M1", "Sleep"],
		["M84", "Motors Off"],
		["M561", "Disable bed compensation"]
	]
};

var defaultSettings = jQuery.extend(true, {}, settings);		// need to do this to get a valid copy


/* Setting methods */

function loadSettings() {
	// Delete cookie and use localStorage instead
	document.cookie = "settings=; expires=Thu, 01 Jan 1970 00:00:00 UTC";

	// Try to parse the stored settings (if any)
	if (localStorage.getItem("settings") != null) {
		var loadedSettings = localStorage.getItem("settings");
		if (loadedSettings != undefined && loadedSettings.length > 0) {
			loadedSettings = JSON.parse(loadedSettings);

			for(var key in settings) {
				if (loadedSettings.hasOwnProperty(key) && settings[key].constructor === loadedSettings[key].constructor) {
					settings[key] = loadedSettings[key];
				}
			}
		}
	}

	// Apply them
	applySettings();

	// Try to load the translation data
	$.ajax("language.xml", {
		type: "GET",
		dataType: "xml",
		global: false,
		error: function() {
			pageLoadComplete();
		},
		success: function(response) {
			translationData = response;

			if (translationData.children == undefined)
			{
				// Internet Explorer and Edge cannot deal with XML files in the way we want.
				// Disable translations for those browsers.
				translationData = undefined;
				$("#dropdown_language, #label_language").addClass("hidden");
			} else {
				$("#dropdown_language ul > li:not(:first-child)").remove();
				for(var i = 0; i < translationData.children[0].children.length; i++) {
					var id = translationData.children[0].children[i].tagName;
					var name = translationData.children[0].children[i].attributes["name"].value;
					$("#dropdown_language ul").append('<li><a data-language="' + id + '" href="#">' + name + '</a></li>');
					if (settings.language == id) {
						$("#btn_language > span:first-child").text(name);
					}
				}

				translatePage();
			}

			pageLoadComplete();
		}
	});
}

function applySettings() {
	/* Apply settings */

	// Set AJAX timeout
	$.ajaxSetup({ timeout: sessionTimeout / (settings.maxRetries + 1) });

	// Webcam
	if (settings.webcamURL != "") {
		$("#panel_webcam").removeClass("hidden");
		updateWebcam(true);
	} else {
		$("#panel_webcam").addClass("hidden");
	}

	// Half Z Movements
	var decreaseChildren = $("#td_decrease_z a");
	var decreaseVal = (settings.halfZMovements) ? 50 : 100;
	decreaseChildren.each(function(index) {
		decreaseChildren.eq(index).data("z", decreaseVal * (-1)).contents().last().replaceWith(" Z-" + decreaseVal);
		decreaseVal /= 10;
	});
	var increaseChildren = $("#td_increase_z a");
	var increaseVal = (settings.halfZMovements) ? 0.05 : 0.1;
	increaseChildren.each(function(index) {
		increaseChildren.eq(index).data("z", increaseVal).contents().first().replaceWith("Z+" + increaseVal + " ");
		increaseVal *= 10;
	});

	// Show/Hide Fan Control
	$(".fan-control").toggleClass("hidden", !settings.showFanControl);

	// Show/Hide Fan RPM
	$(".fan-rpm").toggleClass("hidden", !settings.showFanRPM);

	// Show/Hide ATX Power
	$(".atx-control").toggleClass("hidden", !settings.showATXControl);

	// Possibly hide entire misc control panel
	$("#panel_control_misc").toggleClass("hidden", !settings.showFanControl && !settings.showATXControl);

	// Apply or revoke theme
	if (settings.useDarkTheme) {
		if (darkThemeInclude == undefined) {
			darkThemeInclude = $('<link onload="applyThemeColors(true);" rel="stylesheet" href="css/slate.css" type="text/css"></link>');
			darkThemeInclude.appendTo('head');
			$("#theme_notice").removeClass("hidden");
		}
	} else {
		if (darkThemeInclude != undefined) {
			darkThemeInclude.remove();
			darkThemeInclude = undefined;
			applyThemeColors(false);
			$("#theme_notice").addClass("hidden");
		}
	}

	/* Set values on the Settings page */

	// Set input values
	for(var key in settings) {
		var element = $('[data-setting="' + key + '"]');
		if (element.length != 0) {
			var type = element.attr("type");
			if (type == "checkbox") {
				element.prop("checked", settings[key]);
			} else if (type == "number") {
				var factor = element.data("factor");
				if (factor == undefined) {
					factor = 1;
				}
				element.val(settings[key] / factor);
			} else {
				element.val(settings[key]);
			}
		}
	}

	// Language is set in XML AJAX handler

	// Default head temperatures
	clearHeadTemperatures();
	settings.defaultActiveTemps.forEach(function(temp) {
		addHeadTemperature(temp, "active");
	});
	settings.defaultStandbyTemps.forEach(function(temp) {
		addHeadTemperature(temp, "standby");
	});

	// Default bed temperatures
	clearBedTemperatures();
	settings.defaultBedTemps.forEach(function(temp) {
		addBedTemperature(temp);
	});

	// Default G-Codes
	clearDefaultGCodes();
	settings.defaultGCodes.forEach(function(entry) {
		addDefaultGCode(entry[1], entry[0]);
	});
}

function saveSettings() {
	// Get input values
	for(var key in settings) {
		var element = $('[data-setting="' + key + '"]');
		if (element.length != 0) {
			var type = element.attr("type");
			if (type == "checkbox") {
				settings[key] = element.is(":checked");
			} else if (type == "number") {
				var min = element.data("min");
				var max = element.data("max");
				var factor = element.data("factor");
				if (factor == undefined) {
					factor = 1;
				}
				settings[key] = constrainSetting(element.val() * factor, defaultSettings[key], min, max);
			} else {
				settings[key] = element.val();
			}
		}
	}

	// Save language
	if (settings.language != $("#btn_language").data("language")) {
		showMessage("success", T("Language has changed"), T("You have changed the current language. Please reload the web interface to apply this change."), 0);
	}
	settings.language = $("#btn_language").data("language");

	// Default G-Codes
	settings.defaultGCodes = [];
	$("#table_gcodes > tbody > tr").each(function() {
		settings.defaultGCodes.push([$(this).find("label").text(), $(this).find("td:eq(1)").text()]);
	});
	settings.defaultGCodes = settings.defaultGCodes.sort(function(a, b) {
		if (a[0][0] != b[0][0]) {
			return a[0].charCodeAt(0) - b[0].charCodeAt(0);
		}
		var x = a[0].match(/(\d+)/g)[0];
		var y = b[0].match(/(\d+)/g)[0];
		if (x == undefined || y == undefined) {
			return parseInt(a[0]) - parseInt(b[0]);
		}
		return x - y;
	});

	// Default Heater Temperatures
	settings.defaultActiveTemps = [];
	$("#ul_active_temps > li").each(function() {
		settings.defaultActiveTemps.push($(this).data("temperature"));
	});
	settings.defaultActiveTemps = settings.defaultActiveTemps.sort(function(a, b) { return a - b; });
	settings.defaultStandbyTemps = [];
	$("#ul_standby_temps > li").each(function() {
		settings.defaultStandbyTemps.push($(this).data("temperature"));
	});
	settings.defaultStandbyTemps = settings.defaultStandbyTemps.sort(function(a, b) { return a - b; });

	// Default Bed Temperatures
	settings.defaultBedTemps = [];
	$("#ul_bed_temps > li").each(function() {
		settings.defaultBedTemps.push($(this).data("temperature"));
	});
	settings.defaultBedTemps = settings.defaultBedTemps.sort(function(a, b) { return a - b; });

	// Save Settings
	localStorage.setItem("settings", JSON.stringify(settings));
}

function constrainSetting(value, defaultValue, minValue, maxValue) {
	if (isNaN(value)) {
		return defaultValue;
	}
	if (value < minValue) {
		return minValue;
	}
	if (value > maxValue) {
		return maxValue;
	}

	return value;
}


/* Setting events */

// Apply & Reset settings

$("#btn_reset_settings").click(function(e) {
	showConfirmationDialog(T("Reset Settings"), T("Are you sure you want to revert to Factory Settings?"), function() {
		if (defaultSettings.language != settings.language) {
			showMessage("info", T("Language has changed"), T("You have changed the current language. Please reload the web interface to apply this change."), 0);
		}
		settings = jQuery.extend(true, {}, defaultSettings);
		$("#btn_language").data("language", "en").children("span:first-child").text("English");
		applySettings();
		saveSettings();
	});
	e.preventDefault();
});

$("#frm_settings").submit(function(e) {
	saveSettings();
	applySettings();
	showMessage("success", "", "<strong>" + T("Settings applied!") + "</strong>");
	e.preventDefault();
});

$("#frm_settings > ul > li a").on("shown.bs.tab", function(e) {
	$("#frm_settings > ul li").removeClass("active");
	var links = $('#frm_settings > ul > li a[href="' + $(this).attr("href") + '"]');
	$.each(links, function() {
		$(this).parent().addClass("active");
	});
});

// Select full text on focus

$("input[type='number']").focus(function() {
	var input = $(this);
	setTimeout(function() {
		input.select();
	}, 10);
});

// User Interface

$("body").on("click", "#dropdown_language a", function(e) {
	$("#btn_language > span:first-child").text($(this).text());
	$("#btn_language").data("language", $(this).data("language"));
	e.preventDefault();
});

$('a[href="#page_ui"]').on('shown.bs.tab', function () {
	$("#btn_clear_cache").toggleClass("disabled", $.isEmptyObject(cachedFileInfo));
});

$("#btn_clear_cache").click(function(e) {
	gcodeUpdateIndex = -1;
	clearFileCache();
	$("#btn_clear_cache").addClass("disabled");
	e.preventDefault();
});

// List Items

$("#btn_add_gcode").click(function(e) {
	var item =	'<tr><td><label class="label label-primary">' + $("#input_gcode").val().trim() + '</label></td><td>' + $("#input_gcode_description").val().trim() + '</td><td>';
	item +=		'<button class="btn btn-sm btn-danger btn-delete-parent" title="' + T("Delete this G-Code item") + '">';
	item += 	'<span class="glyphicon glyphicon-trash"></span></button></td></tr>';
	$("#table_gcodes > tbody").append(item);

	e.preventDefault();
});

$("input[name='temp_selection']:radio").change(function() {
	if ($(this).val() == "active") {
		$("#ul_active_temps").removeClass("hidden");
		$("#ul_standby_temps").addClass("hidden");
	} else {
		$("#ul_standby_temps").removeClass("hidden");
		$("#ul_active_temps").addClass("hidden");
	}
});

$("#btn_add_head_temp").click(function(e) {
	var temperature = constrainSetting($("#input_add_head_temp").val(), 0, -273.15, 300);
	var type = $('input[name="temp_selection"]:checked').val();

	var item =	'<li class="list-group-item col-xs-6 col-lg-3" data-temperature="' + temperature + '">' + temperature + ' °C';
	item +=		'<button class="btn btn-danger btn-sm btn-delete-parent pull-right" title="' + T("Delete this temperature item") + '">';
	item +=		'<span class="glyphicon glyphicon-trash"></span></button></li>';
	$("#ul_" + type + "_temps").append(item);

	e.preventDefault();
});

$("#btn_add_bed_temp").click(function(e) {
	var temperature = constrainSetting($("#input_add_bed_temp").val(), 0, -273.15, 180);

	var item =	'<li class="list-group-item col-md-6" data-temperature="' + temperature + '">' + temperature + ' °C';
	item +=		'<button class="btn btn-danger btn-sm btn-delete-parent pull-right" title="' + T("Delete this temperature item") + '">';
	item +=		'<span class="glyphicon glyphicon-trash"></span></button></li>';
	$("#ul_bed_temps").append(item);

	e.preventDefault();
});

$("body").on("click", ".btn-delete-parent", function(e) {
	$(this).parents("tr, li").remove();
	e.preventDefault();
});

$("#page_listitems input").on("input", function() {
	// Validate form controls
	$("#btn_add_gcode").toggleClass("disabled", $("#input_gcode").val().trim() == "" || $("#input_gcode_description").val().trim() == "");
	$("#btn_add_head_temp").toggleClass("disabled", isNaN(parseFloat($("#input_add_head_temp").val())));
	$("#btn_add_bed_temp").toggleClass("disabled", isNaN(parseFloat($("#input_add_bed_temp").val())));
});

$("#page_listitems input").keydown(function(e) {
	if (e.which == 13) {
		var button = $(this).parents("div:not(.input-group):eq(0)").find("button");
		if (!button.hasClass("disabled")) {
			button.click();
		}
		e.preventDefault();
	}
});

// Machine Properties

$("#btn_fw_diagnostics").click(function() {
	if (isConnected) {
		sendGCode("M122");
		showPage("console");
	}
});

// Tools

$("#btn_add_tool").click(function(e) {
	var gcode = "M563 P" + $("#input_tool_number").val();

	var drives = $("input[name='tool_drives']:checked");
	if (drives != undefined) {
		var driveList = [];
		drives.each(function() { driveList.push($(this).val()); });
		gcode += " D" + driveList.reduce(function(a, b) { return a + ":" + b; });
	}

	var heaters = $("input[name='tool_heaters']:checked");
	if (heaters != undefined) {
		var heaterList = [];
		heaters.each(function() { heaterList.push($(this).val()); });
		gcode += " H" + heaterList.reduce(function(a, b) { return a + ":" + b; });
	}

	sendGCode(gcode);
	extendedStatusCounter = settings.extendedStatusInterval;

	e.preventDefault();
});

$("body").on("click", ".btn-select-tool", function(e) {
	var tool = $(this).parents("div.panel-body").data("tool");
	if (lastStatusResponse != undefined && lastStatusResponse.currentTool == tool) {
		changeTool(-1);
	} else {
		changeTool(tool);
	}
	e.preventDefault();
});

$("body").on("click", ".btn-remove-tool", function(e) {
	var tool = $(this).parents("div.panel-body").data("tool");
	showConfirmationDialog(T("Delete Tool"), T("Are you sure you wish to remove tool {0}?", tool), function() {
		sendGCode("M563 P" + tool + " D-1 H-1");
		extendedStatusCounter = settings.extendedStatusInterval;
	});
	e.preventDefault();
});

// Display toggle for settings sub-pages

$('a[href="#page_general"], a[href="#page_ui"], a[href="#page_listitems"]').on('shown.bs.tab', function () {
	$("#row_save_settings, #btn_reset_settings").removeClass("hidden");
});

$('a[href="#page_machine"], a[href="#page_tools"], a[href="#page_sysedit"]').on('shown.bs.tab', function () {
	$("#row_save_settings").addClass("hidden");
});

//Piecon settings

Piecon.setOptions({
  color: '#0000ff', // Pie chart color
  background: '#bbb', // Empty pie chart color
  shadow: '#fff', // Outer ring color
  fallback: 'force' // Toggles displaying percentage in the title bar (possible values - true, false, 'force')
});