/* Notification subsystem for Duet Web Control
 * 
 * written by Christian Hammacher (c) 2016-2017
 * 
 * licensed under the terms of the GPL v3
 * see http://www.gnu.org/licenses/gpl-3.0.html
 */


var notificationOptions = {
	animate: {
		enter: 'animated fadeInDown',
		exit: 'animated fadeOutDown'
	},
	placement: {
		from: "bottom",
		align: "center"
	},
	template: '<div data-notify="container" class="col-xs-11 col-sm-9 col-md-8 col-lg-5 alert alert-{0}" role="alert">' +
		'<button type="button" aria-hidden="true" class="close" data-notify="dismiss">×</button>' +
		'<span data-notify="icon"></span> ' +
		'<span data-notify="title">{1}</span> ' +
		'<span data-notify="message">{2}</span>' +
		'<div class="progress" data-notify="progressbar">' +
		'<div class="progress-bar progress-bar-{0}" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%;"></div>' +
		'</div>' +
		'<a href="{3}" target="{4}" data-notify="url"></a>' +
		'</div>'
};

// Apply custom options for JS plugin
$.notifyDefaults(notificationOptions);

function showUpdateMessage(type, customTimeout) {
	// Determine the message and timespan for the notification
	var title, message, timeout;
	switch (type) {
		case 0: // Firmware
			title = T("Updating Firmware...");
			message = T("Please wait while the firmware is being updated...");
			timeout = settings.updateReconnectDelay;
			break;

		case 1: // Duet WiFi Server
			title = T("Updating WiFi Server...");
			message = T("Please wait while the Duet WiFi Server firmware is being updated...");
			timeout = settings.dwsReconnectDelay;
			break;

		case 2: // Duet Web Control
			title = T("Updating Web Interface...");
			message = T("Please wait while Duet Web Control is being updated...");
			timeout = settings.dwcReconnectDelay;
			break;

		case 3: // Multiple Updates
			title = T("Updating Firmware...");
			message = T("Please wait while multiple firmware updates are being installed...");
			timeout = customTimeout;
			break;

		default: // Unknown
			alert(T("Error! Unknown update parameter!"));
			return;
	}

	// Display backdrop and hide it when ready
	$("#modal_backdrop").modal("show");
	setTimeout(function() {
		$("#modal_backdrop").modal("hide");
	}, timeout);

	// Display notification
	var notifySettings = { icon: "glyphicon glyphicon-time",
		title: "<strong>" + title + "</strong><br/><br/>",
		message: message,
		progress: timeout / 100,
	};
	var options = { type: "success",
		allow_dismiss: false,
		delay: timeout,
		timeout: 1000,
		showProgressbar: true
	};
	var notification = $.notify(notifySettings, options);
	$(notification.$ele).css("z-index", 9999);
	return notification;
}

function showHaltMessage() {
	// Display backdrop and hide it when ready
	$("#modal_backdrop").modal("show");
	setTimeout(function() {
		$("#modal_backdrop").modal("hide");
	}, settings.haltedReconnectDelay);

	// Display notification
	var notifySettings = { icon: "glyphicon glyphicon-flash",
		title: "<strong>" + T("Emergency STOP") + "</strong><br/><br/>",
		message: T("Please wait while the firmware is restarting..."),
		progress: settings.haltedReconnectDelay / 100,
	};
	var options = { type: "warning",
		allow_dismiss: false,
		delay: settings.haltedReconnectDelay,
		timeout: 1000,
		showProgressbar: true
	};
	var notification = $.notify(notifySettings, options);
	$(notification.$ele).css("z-index", 9999);
}

function showMessage(type, title, message, timeout, allowDismiss) {
	// Find a suitable icon
	var icon = "glyphicon glyphicon-info-sign";
	if (type == "warning") {
		icon = "glyphicon glyphicon-warning-sign";
	} else if (type == "danger") {
		icon = "glyphicon glyphicon-exclamation-sign";
	}

	// Check if the title can be displayed as bold text
	if (title != "")
	{
		if (title.indexOf("<strong>") == -1)
		{
			title = "<strong>" + title + "</strong>";
		}
		title += "<br/><br/>";
	}

	// Show the notification
	var notifySettings = { icon: "glyphicon glyphicon-" + icon,
		title: title,
		message: message};
	var options = { type: type,
		allow_dismiss: (allowDismiss == undefined) ? true : allowDismiss,
		delay: (timeout == undefined) ? settings.notificationTimeout : timeout };
	return $.notify(notifySettings, options);
}
