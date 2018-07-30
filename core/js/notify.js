/* Notification subsystem for Duet Web Control
 * 
 * written by Christian Hammacher (c) 2016-2018
 * 
 * licensed under the terms of the GPL v3
 * see http://www.gnu.org/licenses/gpl-3.0.html
 */


$.notifyDefaults({
	animate: {
		enter: "animated fadeInDown",
		exit: "animated fadeOutDown"
	},
	placement: {
		from: "bottom",
		align: "center"
	},
	newest_on_top: true,
	template: '<div data-notify="container" class="col-xs-12 col-sm-12 col-md-8 col-lg-5 alert alert-{0}">' +
		'<button type="button" aria-hidden="true" class="close" data-notify="dismiss">×</button>' +
		'<span data-notify="icon"></span> ' +
		'<span data-notify="title">{1}</span> ' +
		'<span data-notify="message">{2}</span>' +
		'<div class="progress" data-notify="progressbar">' +
		'<div class="progress-bar progress-bar-{0}" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%;"></div>' +
		'</div>' +
		'<a href="{3}" target="{4}" data-notify="url"></a>' +
		'</div>'
});

var openNotifications = [];
var openMessageNotifications = [];


function showDownloadMessage() {
	var notifySettings = { icon: "glyphicon glyphicon-compressed",
		title: "<strong>" + T("Downloading Files") + "</strong><br/><br/>",
		message: T("Please wait while the selected files are being downloaded...")
	};
	var options = { type: "info",
		allow_dismiss: false,
		delay: -1,
		showProgressbar: true
	};
	return $.notify(notifySettings, options);
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

function showMessage(type, title, message, timeout, allowDismiss, regularNotification) {
	// Set default arguments
	if (allowDismiss == undefined) { allowDismiss = true; }
	if (type == "danger" && allowDismiss && !settings.autoCloseErrorMessages) {
		if (timeout == undefined) { timeout = 0; }
		if (regularNotification == undefined) { regularNotification = false; }
	} else {
		if (timeout == undefined) { timeout = settings.notificationTimeout; }
		if (regularNotification == undefined) { regularNotification = true; }
	}

	// Check if an HTML5 notification shall be displayed
	if (document.hidden && settings.useHtmlNotifications) {
		// HTML5 notifications expect plain strings. Remove potential styles first
		if (title.indexOf("<") != -1) { title = $("<span>" + title + "</span>").text(); }
		if (message.indexOf("<") != -1) { message = $("<span>" + message + "</span>").text(); }

		// Create new notification and display it
		var options = {
			body: message,
			icon: "favicon.ico",
			dir : "ltr",
			requireInteraction: allowDismiss
		};
		var notification = new Notification(title, options);
		if (allowDismiss) { notification.onclick = function() { this.close(); }; }
		if (timeout > 0) { setTimeout(function() { notification.close(); }, timeout); }
		return notification;
	}

	// Otherwise display a JQuery notification. Find a suitable icon first
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

	// Create and show the notification
	var notifySettings = { icon: icon,
		title: title,
		message: message };
	var options = { type: type,
		allow_dismiss: allowDismiss,
		delay: timeout };
	var notification = $.notify(notifySettings, options);
	if (allowDismiss) {
		$(notification.$ele).click(function() {
			openNotifications = openNotifications.filter(function(notif) { return notif != notification; });
			openMessageNotifications = openMessageNotifications.filter(function(notif) { return notif != notification; });
			notification.close();
		});
	}

	// Make sure we don't display more notifications than allowed
	if (regularNotification && settings.maxNotifications >= 1) {
		if (timeout > 0) {
			setTimeout(function() {
				openNotifications = openNotifications.filter(function(notif) { return notif != notification; });
				openMessageNotifications = openMessageNotifications.filter(function(item) { return item != notification; });
			}, timeout);
		}
		while (openMessageNotifications.length >= settings.maxNotifications) {
			openMessageNotifications.shift().close();
		}
		openMessageNotifications.push(notification);
	}
	openNotifications.push(notification);

	return notification;
}

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

/*function closeNotifications() {
	openMessageNotifications.forEach(function(notification) {
		openNotifications = openNotifications.filter(function(notif) { return notif != notification; });
		notification.close();
	});
	openMessageNotifications = [];
}*/

function closeAllNotifications() {
	openNotifications.forEach(function(notification) {
		notification.close();
	});
	openNotifications = [];
	openMessageNotifications = [];
}
