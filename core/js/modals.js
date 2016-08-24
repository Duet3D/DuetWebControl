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

function showTextInput(title, message, action) {
	$("#modal_textinput h4").html(title);
	$("#modal_textinput p").html(message);
	$("#modal_textinput input").val("");
	$("#modal_textinput form").off().submit(function(e) {
		$("#modal_textinput").modal("hide");
		var value = $("#modal_textinput input").val();
		if (value.trim() != "") {
			action(value);
		}
		e.preventDefault();
	});
	$("#modal_textinput").modal("show");
}


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

$("#modal_pass_input, #modal_textinput").on('shown.bs.modal', function() {
	$(this).find("input").focus()
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
