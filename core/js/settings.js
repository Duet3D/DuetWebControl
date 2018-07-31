/* Settings management for Duet Web Control
 * 
 * written by Christian Hammacher (c) 2016-2018
 * 
 * licensed under the terms of the GPL v3
 * see http://www.gnu.org/licenses/gpl-3.0.html
 */


var settings = {
	updateInterval: 250,			// in ms
	extendedStatusInterval: 10,		// nth status request will include extended values
	maxRetries: 1,					// number of AJAX retries before the connection is terminated

	haltedReconnectDelay: 10000,	// in ms (increased from 5000 for Duet WiFi)
	updateReconnectDelay: 20000,	// in ms
	dwsReconnectDelay: 45000,		// in ms
	dwcReconnectDelay: 225000,		// in ms

	confirmStop: false,				// ask for confirmation when pressing Emergency STOP
	useKiB: true,					// display file sizes in KiB instead of KB
	theme: "default",				// name of the theme to use
	scrollContent: true,			// make the main content scrollable on md+ resolutions
	showFanControl: true,			// show fan sliders
	showFanRPM: false,				// show fan RPM in sensors
	settingsOnDuet: true,			// store the DWC settings on the Duet
	language: "en",

	moveFeedrate: 6000,				// in mm/min
	axisMoveSteps: [				// in mm
		[100, 50, 10, 1, 0.1],
		[100, 50, 10, 1, 0.1],
		[50, 25, 5, 0.5, 0.05],
		[100, 50, 10, 1, 0.1],
		[100, 50, 10, 1, 0.1],
		[100, 50, 10, 1, 0.1],
		[100, 50, 10, 1, 0.1],
		[100, 50, 10, 1, 0.1],
		[100, 50, 10, 1, 0.1],
	],
	extruderAmounts: [100, 50, 20, 10, 5, 1],	// in mm
	extruderFeedrates: [60, 30, 15, 5, 1],		// in mm/s
	babysteppingZ: 0.05,			// in mm
	showATXControl: false,			// show ATX control

	uppercaseGCode: true,			// convert G-Codes to upper-case before sending them

	doTfree: true,					// tool
	doTpre: true,					// change
	doTpost: true,					// options

	useHtmlNotifications: false,	// use HTML5-based notifications
	autoCloseUserMessages: false,	// whether M117 messages are automatically closed
	autoCloseErrorMessages: false,	// whether error messages by the firmware are automatically closed
	showEmptyResponses: false,		// show successful pop-up notification for G-codes that returned no response
	showInfoMessages: true,			// show info messages
	showWarningMessages: true,		// show warning messages
	showErrorMessages: true,		// show error messages
	notificationTimeout: 5000,		// timeout of pop-up notifications in ms
	maxNotifications: 3,			// maximum number of simultaneously opened notifications

	webcamURL: "",
	webcamInterval: 5000,			// in ms
	webcamFix: false,				// do not append extra HTTP qualifier when reloading images
	webcamEmbedded: false,			// use iframe to embed webcam stream
	webcamRotation: 0,
	webcamFlip: "none",

	defaultActiveTemps: [0, 180, 190, 200, 210, 220, 235],
	defaultStandbyTemps: [0, 95, 120, 140, 155, 170],
	defaultBedTemps: [0, 55, 60, 65, 90, 110, 120]
};
var needsInitialSettingsUpload = false;

var defaultSettings = jQuery.extend(true, {}, settings);		// need to do this to get a valid copy

var themeInclude;

var rememberedGCodes = ["M0", "M1", "M84", "M561"], defaultGCodes = jQuery.extend(true, {}, rememberedGCodes);


/* Safe wrappers for localStorage */

function getLocalSetting(key, defaultValue) {
	if (typeof localStorage === "undefined") {
		return defaultValue;
	}

	var value = localStorage.getItem(key);
	if (value == undefined || value.length == 0) {
		return defaultValue;
	}
	return JSON.parse(value);
}

function setLocalSetting(key, value) {
	if (typeof localStorage !== "undefined") {
		localStorage.setItem(key, JSON.stringify(value));
	}
}

function removeLocalSetting(key) {
	if (typeof localStorage !== "undefined") {
		localStorage.removeItem(key);
	}
}


/* Setting methods */

function loadSettings() {
	// Delete cookie (usually not used unless a really old web interface version was used before)
	document.cookie = "settings=; expires=Thu, 01 Jan 1970 00:00:00 UTC";

	// Try to parse the stored settings (if any)
	var loadedSettings = getLocalSetting("settings", null);
	if (loadedSettings != null) {
		for(var key in settings) {
			// Try to copy each setting if their types are equal
			if (loadedSettings.hasOwnProperty(key) && loadedSettings[key] != null && settings[key].constructor === loadedSettings[key].constructor) {
				settings[key] = loadedSettings[key];
			}
		}

		// Backward-compatibility
		if (loadedSettings.hasOwnProperty("useDarkTheme")) {
			settings.theme = loadedSettings.useDarkTheme ? "dark" : "default";
		}
	}

	// Do NOT allow storage of the settings on the Duet if this is running on localhost
	if (location.host == "") {
		settings.settingsOnDuet = false;
		defaultSettings = jQuery.extend(true, {}, settings);
	}

	// See if we need to fetch the settings once again from the Duet
	if (settings.settingsOnDuet) {
		$.ajax(ajaxPrefix + "dwc.json", {
			type: "GET",
			dataType: "json",
			global: false,
			error: function(jqxhr, xhrsettings, thrownError) {
				needsInitialSettingsUpload = (jqxhr.status == 404);
				settingsLoaded();
			},
			success: function(response) {
				for(var key in settings) {
					// Try to copy each setting if their types are equal
					if (response.hasOwnProperty(key) && response[key] != null && settings[key].constructor === response[key].constructor) {
						settings[key] = response[key];
					}
				}
				settingsLoaded();
			}
		});
	} else {
		settingsLoaded();
	}
}

function settingsLoaded() {
	// Apply them
	applySettings();

	// Try to load the translation data
	if (translationData == undefined) {
		$.ajax("language.xml", {
			type: "GET",
			dataType: "xml",
			global: false,
			error: pageLoadComplete,
			success: function(response) {
				translationData = response;

				if (translationData.children == undefined) {
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
}

function applySettings() {
	/* Apply settings */

	// Set AJAX timeout
	if (settings.maxRetries > 50) { settings.maxRetries = 50; }
	$.ajaxSetup({ timeout: sessionTimeout / (settings.maxRetries + 1) });

	// Webcam
	if (settings.webcamURL != "") {
		$("#panel_webcam").removeClass("hidden");
		$("#img_webcam").toggleClass("hidden", settings.webcamEmbedded);
		$("#div_ifm_webcam").toggleClass("hidden", !settings.webcamEmbedded);

		$("#img_webcam, #ifm_webcam").toggleClass("rotate-90", settings.webcamRotation == 90);
		$("#img_webcam, #ifm_webcam").toggleClass("rotate-180", settings.webcamRotation == 180);
		$("#img_webcam, #ifm_webcam").toggleClass("rotate-270", settings.webcamRotation == 270);
		$("#img_webcam, #ifm_webcam").toggleClass("flip-x", settings.webcamFlip == "x" || settings.webcamFlip == "both");
		$("#img_webcam, #ifm_webcam").toggleClass("flip-y", settings.webcamFlip == "y" || settings.webcamFlip == "both");

		updateWebcam(true);
		updateCalibrationWebcam(true);
	} else {
		$("#panel_webcam").addClass("hidden");
	}

	// Movement steps
	applyMovementSteps();

	// Babystepping
	$("#btn_baby_down > span.content").text(T("{0} mm", (-settings.babysteppingZ)));
	$("#btn_baby_up > span.content").text(T("{0} mm ", "+" + settings.babysteppingZ));
	$(".babystepping").toggleClass("hidden", settings.babysteppingZ <= 0);

	// Show/Hide Fan Controls
	$(".fan-control").toggleClass("hidden", !settings.showFanControl);

	// Show/Hide Fan RPM
	$(".fan-rpm").toggleClass("hidden", !settings.showFanRPM);
	$("#th_probe, #td_probe").css("border-right", settings.showFanRPM ? "" : "0px");

	// Show/Hide ATX Power
	$(".atx-control").toggleClass("hidden", !settings.showATXControl);
	$("#panel_control_misc").toggleClass("hidden", !settings.showFanControl && !settings.showATXControl);

	// Apply or revoke theme
	if (themeInclude != undefined) {
		themeInclude.remove();
		themeInclude = undefined;
	}

	switch (settings.theme) {
		case "default":	// Default Bootstrap theme
			themeInclude = $('<link onload="applyThemeColors();" rel="stylesheet" href="css/bootstrap.theme.css" type="text/css"></link>');
			themeInclude.appendTo("head");
			break;

		case "none":	// No theme at all
			applyThemeColors();
			break;

		default:		// Custom theme
			themeInclude = $('<link onload="applyThemeColors();" rel="stylesheet" href="css/' + settings.theme + '.theme.css" type="text/css"></link>');
			themeInclude.appendTo("head");
			break;

	}

	// Make main content scrollable on md+ screens or restore default behavior
	$("#div_content").css("overflow-y", (settings.scrollContent) ? "auto" : "").resize();

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
			} else if (type != "button") {
				element.val(settings[key]);
			}
		}
	}

	// Set theme selection
	$("#btn_theme").data("theme", settings.theme);
	var themeName = settings.theme == "default" ? "Bootstrap" : (settings.theme == "none" ? T("None") : settings.theme);
	$("#btn_theme > span:first-child").text(themeName);

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

	// Force GUI update to apply half Z movements in the axes
	updateGui();
}

function applyMovementSteps() {
	// Check values
	for(var axis = 0; axis < settings.axisMoveSteps.length; axis++) {
		if (settings.axisMoveSteps[axis].length < 5) {
			settings.axisMoveSteps[axis].splice(1, 0, (axis == 2) ? 25 : 50);
		}
	}

	// Axis apperance
	for(var i = 0; i < axisNames.length; i++) {
		// Set Home button names+titles
		var axis = axisNames[i];
		var axisIndex = axisOrder.indexOf(axis);
		$(".btn-home[data-axis='" + i + "']").text(T("Home " + axis)).prop("title", T("Home " + axis + " axis (G28 " + axis + ")"));

		// Set labels and values for decrease and increase buttons
		var buttonIndex = 0;
		$("#page_control a.btn-move[data-axis='" + i + "'][data-amount^='-']").each(function() {
			var decreaseVal = -settings.axisMoveSteps[axisIndex][buttonIndex++];
			$(this).data("amount", decreaseVal).contents().last().replaceWith(" " + axis + decreaseVal);
		});
		buttonIndex = 0;
		$("#modal_messagebox button.btn-move[data-axis-letter='" + axis + "'][data-amount^='-']").each(function() {
			var decreaseVal = -settings.axisMoveSteps[axisIndex][buttonIndex++];
			$(this).data("amount", decreaseVal).children("span:last-child").text(axis + decreaseVal);
		});
		buttonIndex = 0;
		$("#modal_start_scan button.btn-move[data-axis-letter='" + axis + "'][data-amount^='-']").each(function() {
			var decreaseVal = -settings.axisMoveSteps[axisIndex][buttonIndex++];
			$(this).data("amount", decreaseVal).children("span:last-child").text(axis + decreaseVal);
		});

		buttonIndex = settings.axisMoveSteps[axisIndex].length - 1;
		$("#page_control a.btn-move[data-axis='" + i + "']:not([data-amount^='-'])").each(function() {
			var increaseVal = settings.axisMoveSteps[axisIndex][buttonIndex--];
			$(this).data("amount", increaseVal).contents().first().replaceWith(axis + "+" + increaseVal + " ");
		});
		buttonIndex = settings.axisMoveSteps[axisIndex].length - 1;
		$("#modal_messagebox button.btn-move[data-axis-letter='" + axis + "']:not([data-amount^='-'])").each(function() {
			var increaseVal = settings.axisMoveSteps[axisIndex][buttonIndex--];
			$(this).data("amount", increaseVal).children("span:first-child").text(axis + "+" + increaseVal);
		});
		buttonIndex = settings.axisMoveSteps[axisIndex].length - 1;
		$("#modal_start_scan button.btn-move[data-axis-letter='" + axis + "']:not([data-amount^='-'])").each(function() {
			var increaseVal = settings.axisMoveSteps[axisIndex][buttonIndex--];
			$(this).data("amount", increaseVal).children("span:first-child").text(axis + "+" + increaseVal);
		});

		// Set headers for position cells in the Machine Status panel
		$(".table-axis-positions th[data-axis='" + i + "']").text(axisNames[i]);
	}

	// Extruder amounts
	var amountIndex = 0;
	$("#div_feed > div.btn-group > label").each(function() {
		var amount = settings.extruderAmounts[amountIndex++];
		$(this).children("input").prop("value", amount);
		$(this).children("span").text(amount);
	});

	// Extruder feedrates
	var feedrateIndex = 0;
	$("#div_feedrate > div.btn-group > label").each(function() {
		var feedrate = settings.extruderFeedrates[feedrateIndex++];
		$(this).children("input").prop("value", feedrate);
		$(this).children("span").text(feedrate);
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

	// Save theme
	settings.theme = $("#btn_theme").data("theme");

	// Save language
	if (settings.language != $("#btn_language").data("language")) {
		showMessage("success", T("Language has changed"), T("You have changed the current language. Please reload the web interface to apply this change."), 0);
	}
	settings.language = $("#btn_language").data("language");

	// G-Codes for autocompletion
	rememberedGCodes = [];
	$("#table_gcodes > tbody > tr").each(function() {
		rememberedGCodes.push($(this).find("th:eq(0)").text());
	});
	saveGCodes();

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
	setLocalSetting("settings", settings);
	if (settings.settingsOnDuet) {
		uploadTextFile("0:/www/dwc.json", JSON.stringify(settings), function() {
			// Tell DWC clients to reload its config
			sendGCode("M118 P3 S\"{reloadSettings}\"", false);
		}, false);
	}
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


/* Remembered G-Codes */

function loadGCodes() {
	rememberedGCodes = getLocalSetting("rememberedGCodes", defaultGCodes);
	applyGCodes();
}

function applyGCodes() {
	$("#table_gcodes > tbody").children().remove();
	for(var index in rememberedGCodes) {
		var item =  '<tr><th>' + rememberedGCodes[index] + '</th><td>';
		item += '<button class="btn btn-sm btn-danger btn-delete-parent" title="' + T("Delete this G-Code item") + '">';
		item += '<span class="glyphicon glyphicon-trash"></span></button></td></tr>';
		$("#table_gcodes > tbody").append(item);
	}
}

function saveGCodes() {
	setLocalSetting("rememberedGCodes", rememberedGCodes);
}


/* Setting events */

// Apply & Reset settings

$(".btn-reset-settings").click(function(e) {
	showConfirmationDialog(T("Reset Settings"), T("Are you sure you want to revert to Factory Settings?"), function() {
		if (defaultSettings.language != settings.language) {
			showMessage("info", T("Language has changed"), T("You have changed the current language. Please reload the web interface to apply this change."), 0);
		}

		settings = jQuery.extend(true, {}, defaultSettings);
		if (vendor != undefined) {
			$.ajax(ajaxPrefix + "dwc_factory.json", {
				type: "GET",
				dataType: "json",
				global: false,
				error: function(jqxhr, xhrsettings, thrownError) {
					settings = jQuery.extend(true, {}, defaultSettings);
					settingsLoaded();
				},
				success: function(response) {
					for(var key in settings) {
						// Try to copy each setting if their types are equal
						if (response.hasOwnProperty(key) && response[key] != null && settings[key].constructor === response[key].constructor) {
							settings[key] = response[key];
						}
					}
					settingsLoaded();
				}
			});
		} else {
			$("#btn_language").data("language", "en").children("span:first-child").text("English");
			$("#btn_theme").data("theme", "default").children("span:first-child").text(T("Bootstrap"));

			applySettings();
			saveSettings();
		}

		rememberedGCodes = jQuery.extend(true, {}, defaultGCodes);
		applyGCodes();
		saveGCodes();

		removeLocalSetting("extraSensorVisibility");
		resetChartData();

		removeLocalSetting("cachedFileInfo");
	});
	e.preventDefault();
});

$("#frm_settings").submit(function(e) {
	e.preventDefault();
	if ($(".btn-apply-settings").hasClass("disabled")) {
		return;
	}

	saveSettings();
	if (!settings.settingsOnDuet) {
		applySettings();
		showMessage("success", "", "<strong>" + T("Settings applied!") + "</strong>");
	}
	applyGCodes();
});

$("#frm_settings > ul > li a").on("shown.bs.tab", function(e) {
	$("#frm_settings > ul li").removeClass("active");
	var links = $('#frm_settings > ul > li a[href="' + $(this).attr("href") + '"]');
	$.each(links, function() {
		$(this).parent().addClass("active");
	});
});

// User Interface

$("#dropdown_theme > ul").on("click", "a", function(e) {
	$("#btn_theme > span:first-child").text($(this).text());
	$("#btn_theme").data("theme", $(this).data("theme"));
	e.preventDefault();
});

$("#dropdown_language > ul").on("click", "a", function(e) {
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

$("[data-setting='useHtmlNotifications']").change(function() {
	if ($(this).prop("checked")) {
		if (!("Notification" in window)) {
			// Don't allow this option to be set if the browser doesn't support it
			$(this).prop("checked", false);
			alert(T("This browser does not support desktop notification"));
		}
		else if (Notification.permission !== 'denied') {
			$(this).prop("checked", false);
			Notification.requestPermission(function(permission) {
				if (!('permission' in Notification)) {
					Notification.permission = permission;
				}

				if (permission === "granted") {
					// Don't allow this option to be set unless permission has been granted
					$("[data-setting='useHtmlNotifications']").prop("checked", true);
				}
			});
		}
	}
});

$("[data-setting='settingsOnDuet']").change(function() {
	$(".btn-apply-settings, .btn-reset-settings").toggleClass("disabled", !isConnected && $(this).is(":checked"));
});

// List Items

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
	$("#btn_add_head_temp").toggleClass("disabled", isNaN(parseFloat($("#input_add_head_temp").val())));
	$("#btn_add_bed_temp").toggleClass("disabled", isNaN(parseFloat($("#input_add_bed_temp").val())));
});

$("#page_listitems input").keydown(function(e) {
	if (e.which == 13) {
		var button = $(this).closest("div:not(.input-group):eq(0)").find("button");
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
	var gcode = "M563 P" + $("#input_tool_number").val() + " S\"" + $("#input_tool_name").val() + "\"";

	var drives = $("input[name='tool_drives']:checked");
	if (drives.length > 0) {
		var driveList = [];
		drives.each(function() { driveList.push($(this).val()); });
		gcode += " D" + driveList.reduce(function(a, b) { return a + ":" + b; });
	}

	var heaters = $("input[name='tool_heaters']:checked");
	if (heaters.length > 0) {
		var heaterList = [];
		heaters.each(function() { heaterList.push($(this).val()); });
		gcode += " H" + heaterList.reduce(function(a, b) { return a + ":" + b; });
	}

	sendGCode(gcode);
	extendedStatusCounter = settings.extendedStatusInterval;

	e.preventDefault();
});

// Display toggle for settings sub-pages

$('a[href="#page_general"], a[href="#page_ui"], a[href="#page_listitems"]').on('shown.bs.tab', function () {
	$("#row_save_settings").removeClass("hidden");
});

$('a[href="#page_machine"], a[href="#page_tools"], a[href="#page_sysedit"], a[href="#page_display"]').on('shown.bs.tab', function () {
	$("#row_save_settings").addClass("hidden");
});

