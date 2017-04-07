/* Modal dialog functions for Duet Web Control
 * 
 * written by Christian Hammacher (c) 2016
 * 
 * licensed under the terms of the GPL v2
 * see http://www.gnu.org/licenses/gpl-2.0.html
 */


/* Generic workarounds */

$(".modal").on("hidden.bs.modal", function() {
	// Bootstrap bug: Padding is added to the right, but never cleaned
	$("body").css("padding-right", "");
});


/* Confirmation dialog */

function showConfirmationDialog(title, message, callback) {
	$("#modal_confirmation h4").html('<span class="glyphicon glyphicon-question-sign"></span> ' + title);
	$("#modal_confirmation p").html(message);
	$("#modal_confirmation button.btn-success").off().one("click", callback);
	$("#modal_confirmation").modal("show");
	$("#modal_confirmation .btn-success").focus();
}


/* Text input dialog */

function showTextInput(title, message, callback, text, emptyCallback) {
	$("#modal_textinput h4").html(title);
	$("#modal_textinput p").html(message);
	$("#modal_textinput input").val((text == undefined) ? "" : text);
	$("#modal_textinput form").off().submit(function(e) {
		$("#modal_textinput").modal("hide");
		var value = $("#modal_textinput input").val();
		if (value.trim() != "") {
			callback(value);
		} else if (emptyCallback != undefined) {
			emptyCallback();
		}
		e.preventDefault();
	});
	$("#modal_textinput").modal("show");
}

$("#modal_textinput").on("shown.bs.modal", function() {
	$("#modal_textinput input").focus();
});


/* Host prompt */

function showHostPrompt() {
	if (settings.hasOwnProperty("lastHost")) {
		$('#input_host').val(settings.lastHost);
	}
	$("#modal_host_input").modal("show");
}

$("#modal_host_input").on("shown.bs.modal", function() {
	$("#input_host").focus();
});

$("#form_host").submit(function(e) {
	$("#modal_host_input").off("hide.bs.modal").modal("hide");
	ajaxPrefix = settings.lastHost = $("#input_host").val();		// let the user decide if this shall be saved

	ajaxPrefix += "/";
	if (ajaxPrefix.indexOf("://") == -1) {
		// Prepend http prefix if no URI scheme is given
		ajaxPrefix = "http://" + ajaxPrefix;
	}

	connect(sessionPassword, true);
	e.preventDefault();
});


/* Password prompt */

function showPasswordPrompt() {
	$('#input_password').val("");
	$("#modal_pass_input").modal("show");
	$("#modal_pass_input").one("hide.bs.modal", function() {
		// The network request will take a few ms anyway, so no matter if the user has
		// cancelled the password input, we can reset the Connect button here...
		$(".btn-connect").removeClass("btn-warning disabled").addClass("btn-info").find("span:not(.glyphicon)").text(T("Connect"));
	});
}

$("#form_password").submit(function(e) {
	$("#modal_pass_input").off("hide.bs.modal").modal("hide");
	connect($("#input_password").val(), false);
	e.preventDefault();
});

$("#modal_pass_input").on("shown.bs.modal", function() {
	$("#input_password").focus();
});


/* File edit dialog */

function showEditDialog(title, content, callback) {
	$("#modal_edit .modal-title").text(T("Editing {0}", title));
	$("#modal_edit textarea").val(content);
	$("#modal_edit").modal("show");
	$("#btn_save_file").off("click").click(function() {
		$("#modal_edit").modal("hide");
		callback($("#modal_edit textarea").val());
	});
}

$("#modal_edit").on("shown.bs.modal", function() {
	$("#modal_edit textarea").focus();
});

$("#modal_edit div.modal-content").resize(function() {
	var contentHeight = $(this).height();
	var headerHeight = $("#modal_edit div.modal-header").height();
	var footerHeight = $("#modal_edit div.modal-footer").height();
	$("#modal_edit div.modal-body").css("height", (contentHeight - headerHeight - footerHeight - 60) + "px");
});

$(document).delegate("#modal_edit textarea", "keydown", function(e) {
	var keyCode = e.keyCode || e.which;

	if (keyCode == 9) {
		e.preventDefault();
		var start = $(this).get(0).selectionStart;
		var end = $(this).get(0).selectionEnd;

		// set textarea value to: text before caret + tab + text after caret
		$(this).val($(this).val().substring(0, start)
				+ "\t"
				+ $(this).val().substring(end));

		// put caret at right position again
		$(this).get(0).selectionStart = $(this).get(0).selectionEnd = start + 1;
	}
});

/* Scan progress dialog */

function updateScannerDialog(scanResponse) {
	var scanProgress = 100, uploadProgress = 100;

	if (scanResponse.status == "S" || scanResponse.status == "U") {
		// Scanner is active
		if (!$("#modal_scanner").hasClass("in")) {
			$("#btn_cancel_scan").removeClass("hidden").removeClass("disabled");
			$("#btn_close_scan").addClass("hidden");

			$("#modal_scanner .modal-title").text(T("Scanning..."));
			$("#p_scan_info").text(T("Please wait while a scan is being made. This may take a while..."));

			$("#modal_scanner").modal("show");
		}

		// Update progress
		if (scanResponse.status == "S") {
			scanProgress = scanResponse.progress;
			uploadProgress = 0;
		} else if (scanResponse.status == "U") {
			scanProgress = 100;
			uploadProgress = scanResponse.progress;
			$("#btn_cancel_scan").addClass("disabled");
		}
	} else if ($("#modal_scanner").hasClass("in")) {
		// Scanner is inactive
		$("#btn_cancel_scan").addClass("hidden");
		$("#btn_close_scan").removeClass("hidden");
	}

	// Update progress bars
	if ($("#modal_scanner").hasClass("in")) {
		$("#progress_scan").css("width", scanProgress + "%");
		$("#span_scan_upload_progress").text(T("{0} %", uploadProgress));

		$("#progress_scan_upload").css("width", uploadProgress + "%");
		$("#span_scan_progress").text(T("{0} %", scanProgress));
	}
}

$("#btn_cancel_scan").click(function() {
	if (!$(this).hasClass("disabled")) {
		sendGCode("M753");
		$("#modal_scanner").modal("hide");
	}
});
