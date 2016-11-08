/* Upload handling for Duet Web Control
 * 
 * written by Christian Hammacher (c) 2016
 * 
 * licensed under the terms of the GPL v2
 * see http://www.gnu.org/licenses/gpl-2.0.html
 */


var isUploading = false;					// Is a file upload in progress?

var uploadType, uploadFiles, uploadRows, uploadedFileCount;
var uploadTotalBytes, uploadedTotalBytes;
var uploadStartTime, uploadRequest, uploadFileSize, uploadFileName, uploadPosition;
var uploadedDWC, uploadIncludedConfig, uploadFirmwareFile, uploadDWCFile, uploadDWSFile;
var uploadFilesSkipped;

var firmwareFileName = "RepRapFirmware";	// Name of the firmware file without .bin extension


function uploadTextFile(filename, content, callback) {
	// Ideally we should use FileAPI here, but IE+Edge don't support it
	//var file = new File([content], filename, { type: "application/octet-stream" });
	var file = new Blob([content], { type: "application/octet-stream" });
	file.name = filename;
	file.lastModified = (new Date()).getTime();

	var uploadRequest = $.ajax("rr_upload?name=" + encodeURIComponent(filename) + "&time=" + encodeURIComponent(timeToStr(new Date())), {
		data: file,
		dataType: "json",
		filename: filename.toLowerCase(),
		processData: false,
		contentType: false,
		timeout: 0,
		type: "POST",
		success: function(response) {
			if (response.err == 0) {
				showMessage("success", T("File Updated"), T("The file {0} has been successfully uploaded.", filename));
				if (lastStatusResponse != undefined && lastStatusResponse.status == 'I') {
					if (this.filename == "0:/sys/config.g") {
						showConfirmationDialog(T("Reboot Duet?"), T("You have just uploaded a config file. Would you like to reboot your Duet now?"), function() {
							// Perform software reset
							sendGCode("M999");
						});
					}
				}
			} else {
				showMessage("danger", T("Error"), T("Could not update file {0}!", filename));
			}

			if (callback != undefined) {
				callback();
			}
		}
	});
}

function startUpload(type, files, fromCallback) {
	// Initialize some values
	stopUpdates();
	isUploading = true;	
	uploadType = type;
	uploadTotalBytes = uploadedTotalBytes = uploadedFileCount = 0;
	uploadFiles = files;
	$.each(files, function() {
		uploadTotalBytes += this.size;
	});
	uploadRows = [];
	if (!fromCallback) {
		uploadedDWC = false;
	}
	uploadIncludedConfig = false;
	uploadFirmwareFile = uploadDWCFile = uploadDWSFile = undefined;
	uploadFilesSkipped = false;

	// Safety check for Upload and Print
	if (type == "print" && files.length > 1) {
		showMessage("warning", T("Error"), T("You can only upload and print one file at once!"));
		return;
	}

	// Don't allow DuetWebControl*.zip to be uploaded on DuetWiFi
	if (boardType.startsWith("duetwifi") && type == "generic" && files.length == 1 && files[0].name.toLowerCase().match("^duetwebcontrol.*\\.zip") != null) {
		showMessage("warning", T("Error"), T("You cannot upload web interface files as a ZIP file on a Duet WiFi!"));
		return;
	}

	// Unzip files if necessary
	if (type == "macro" || type == "generic") {
		var containsZip = false;
		$.each(files, function() {
			if (this.name.toLowerCase().match("\\.zip$") != null) {
				uploadedDWC |= this.name.toLowerCase().match("^duetwebcontrol.*\\.zip") != null;

				var fileReader = new FileReader();
				fileReader.onload = (function(theFile) {
					return function(e) {
						try {
							var zip = new JSZip(e.target.result);

							var zipFiles = [];
							$.each(zip.files, function(index, zipEntry) {
								if (!zipEntry.dir && zipEntry.name.match("\/\\.git") == null && zipEntry.name.match("README") == null) {
									var zipName = zipEntry.name.split("/");
									zipName = zipName[zipName.length - 1];

									// See above. FileAPI isn't supported by IE+Edge
									//var unpackedFile = new File([zipEntry.asArrayBuffer()], zipName, { type: "application/octet-stream", lastModified: zipEntry.date });
									var unpackedFile = new Blob([zipEntry.asArrayBuffer()], { type: "application/octet-stream" });
									unpackedFile.name = zipName;
									unpackedFile.lastModified = zipEntry.date;

									zipFiles.push(unpackedFile);
								}
							});

							if (zipFiles.length == 0) {
								showMessage("warning", T("Error"), T("The archive {0} does not contain any files!", theFile.name));
							} else {
								startUpload(type, zipFiles, true);
							}
						} catch(e) {
							showMessage("danger", T("Error"), T("Could not read contents of file {0}!", theFile.name));
						}
					}
				})(this);
				fileReader.readAsArrayBuffer(this);

				containsZip = true;
				return false;
			}
		});
		if (containsZip) {
			// We're relying on an async task which will trigger this method again when required
			return;
		}
	}

	// Reset modal dialog
	$("#modal_upload").data("backdrop", "static");
	$("#modal_upload .close, #modal_upload button[data-dismiss='modal']").addClass("hidden");
	$("#btn_cancel_upload, #modal_upload p").removeClass("hidden");
	$("#modal_upload h4").text(T("Uploading File(s), {0}% Complete", 0));

	// Add files to the table
	$("#table_upload_files > tbody").children().remove();
	$.each(files, function() {
		if (type == "generic") {
			// config and firmware files can be always uploaded
			uploadIncludedConfig |= (this.name == "config.g");
			if (this.name.toUpperCase().match("^" + firmwareFileName.toUpperCase() + ".*\.BIN") != null) {
				uploadFirmwareFile = this.name;
			}

			// DuetWiFi-specific files can be used only on a Duet WiFi
			if (boardType.startsWith("duetwifi")) {
				if (this.name.toUpperCase().match("^DUETWIFISERVER.*\.BIN") != null) {
					uploadDWSFile = this.name;
				} else if (this.name.toUpperCase().match("^DUETWEBCONTROL.*\.BIN") != null) {
					uploadDWCFile = this.name;
				}
			}
		}

		var row = 	'<tr><td><span class="glyphicon glyphicon-asterisk"></span> ' + this.name + '</td>';
		row += 		'<td>' + formatSize(this.size) + '</td>';
		row +=		'<td><div class="progress"><div class="progress-bar progress-bar-info progress-bar-striped" role="progressbar"><span></span></div></div></td></tr>';

		var rowElem = $(row);
		rowElem.appendTo("#table_upload_files > tbody");
		uploadRows.push(rowElem);
	});
	$("#modal_upload").modal("show");

	// Start file upload
	uploadNextFile();
}

function uploadNextFile() {
	// Prepare some upload values
	var file = uploadFiles[uploadedFileCount];
	uploadFileName = file.name;
	uploadFileSize = file.size;
	uploadStartTime = new Date();
	uploadPosition = 0;

	// Check if this file should be skipped
	if (uploadType == "generic") {
		var skipFile = false;
		var lcName = uploadFileName.toLowerCase();

		if (!boardType.startsWith("duetwifi")) {
			// Skip DuetWebControl*.bin on first-gen Duets
			if (lcName.match("^duetwebcontrol.*\\.bin") != null) {
				skipFile = true;
			}

			// Skip DuetWiFiServer*.bin on first-gen Duets
			if (lcName.match("^duetwifiserver.*\\.bin") != null) {
				skipFile = true;
			}
		}

		if (skipFile) {
			fileUploadSkipped();
			return;
		}
	}

	// Determine the right path
	var targetPath = "";
	switch (uploadType) {
		case "gcode":	// Upload G-Code
		case "print":	// Upload & Print G-Code
			targetPath = currentGCodeDirectory + "/" + uploadFileName;
			clearFileCache(targetPath);
			break;

		case "macro":	// Upload Macro
			targetPath = currentMacroDirectory + "/" + uploadFileName;
			break;

		default:		// Generic Upload (on the Settings page)
			var fileExts = uploadFileName.split('.');
			var fileExt = fileExts.pop().toLowerCase();
			if (fileExt == "gz") {
				// If this file was compressed, try to get the actual extension
				fileExt = fileExts.pop();
			}

			switch (fileExt) {
				case "ico":
				case "html":
				case "htm":
				case "xml":
					targetPath = "/www/" + uploadFileName;
					break;

				case "css":
				case "map":
					targetPath = "/www/css/" + uploadFileName;
					break;

				case "eot":
				case "svg":
				case "ttf":
				case "woff":
				case "woff2":
					targetPath = "/www/fonts/" + uploadFileName;
					break;

				case "jpeg":
				case "jpg":
				case "png":
					targetPath = "/www/img/" + uploadFileName;
					break;

				case "js":
					targetPath = "/www/js/" + uploadFileName;
					break;

				default:
					targetPath = "/sys/" + uploadFileName;
			}
	}

	// Update the GUI
	uploadRows[0].find(".progress-bar > span").text(T("Starting"));
	uploadRows[0].find(".glyphicon").removeClass("glyphicon-asterisk").addClass("glyphicon-cloud-upload");

	// Begin another POST file upload
	uploadRequest = $.ajax("rr_upload?name=" + encodeURIComponent(targetPath) + "&time=" + encodeURIComponent(timeToStr(new Date(file.lastModified))), {
		data: file,
		dataType: "json",
		processData: false,
		contentType: false,
		timeout: 0,
		type: "POST",
		success: function(data) {
			if (isUploading) {
				finishCurrentUpload(data.err == 0);
			}
		},
		xhr: function() {
			var xhr = new window.XMLHttpRequest();
			xhr.upload.addEventListener("progress", function(event) {
				if (isUploading && event.lengthComputable) {
					// Calculate current upload speed (Date is based on milliseconds)
					uploadSpeed = event.loaded / (((new Date()) - uploadStartTime) / 1000);

					// Update global progress
					uploadedTotalBytes += (event.loaded - uploadPosition);
					uploadPosition = event.loaded;

					var uploadTitle = T("Uploading File(s), {0}% Complete", ((uploadedTotalBytes / uploadTotalBytes) * 100).toFixed(0));
					if (uploadSpeed > 0) {
						uploadTitle += " (" + formatSize(uploadSpeed) + "/s)";
					}
					$("#modal_upload h4").text(uploadTitle);

					// Update progress bar
					var progress = ((event.loaded / event.total) * 100).toFixed(0);
					uploadRows[0].find(".progress-bar").css("width", progress + "%");
					uploadRows[0].find(".progress-bar > span").text(progress + " %");
				}
			}, false);
			return xhr;
		}
	});
}

function finishCurrentUpload(success) {
	// Keep the progress updated
	if (!success) {
		uploadedTotalBytes += (uploadFileSize - uploadPosition);
	}

	// Update glyphicon and progress bar
	uploadRows[0].find(".glyphicon").removeClass("glyphicon-cloud-upload").addClass(success ? "glyphicon-ok" : "glyphicon-alert");
	uploadRows[0].find(".progress-bar").removeClass("progress-bar-info").addClass(success ? "progress-bar-success" : "progress-bar-danger").css("width", "100%");
	uploadRows[0].find(".progress-bar > span").text(success ? "100 %" : T("ERROR"));

	// Go on with upload logic if we're still busy
	if (isUploading) {
		uploadedFileCount++;
		if (uploadFiles.length > uploadedFileCount) {
			// Purge last-uploaded file row
			uploadRows.shift();

			// Upload the next one
			uploadNextFile();
		} else {
			// We're done
			finishUpload(true);
		}
	}
}

function fileUploadSkipped() {
	// Keep the progress updated
	uploadedTotalBytes += (uploadFileSize - uploadPosition);

	// Update glyphicon and progress bar
	uploadRows[0].find(".glyphicon").removeClass("glyphicon-cloud-asterisk").addClass("glyphicon-warning-sign");
	uploadRows[0].find(".progress-bar").removeClass("progress-bar-info").addClass("progress-bar-warning").css("width", "100%");
	uploadRows[0].find(".progress-bar > span").text(T("SKIPPED"));

	// Go on with upload logic if we're still busy
	uploadFilesSkipped = true;
	if (isUploading) {
		uploadedFileCount++;
		if (uploadFiles.length > uploadedFileCount) {
			// Purge last-uploaded file row
			uploadRows.shift();

			// Upload the next one
			uploadNextFile();
		} else {
			// We're done
			finishUpload(true);
		}
	}
}

function cancelUpload() {
	isUploading = uploadFilesSkipped = false;
	finishCurrentUpload(false);
	finishUpload(false);
	$("#modal_upload h4").text(T("Upload Cancelled!"));
	uploadRequest.abort();
	startUpdates();
}

function finishUpload(success) {
	// Reset upload variables
	isUploading = false;
	uploadFiles = uploadRows = [];
	$("#input_file_upload").val("");

	// Set some values in the modal dialog
	$("#modal_upload h4").text(T("Upload Complete!"));
	$("#btn_cancel_upload, #modal_upload p").addClass("hidden");
	$("#modal_upload .close, #modal_upload button[data-dismiss='modal']").removeClass("hidden");

	if (success) {
		// If everything went well, update the GUI immediately
		uploadHasFinished(true);
	} else {
		// In case an upload has been aborted, give the firmware some time to recover
		setTimeout(function() { uploadHasFinished(false); }, 1000);
	}
}

function uploadHasFinished(success) {
	// Make sure the G-Codes and Macro pages are updated
	if (uploadType == "gcode" || uploadType == "print") {
		gcodeUpdateIndex = -1;
		if (currentPage == "files") {
			updateGCodeFiles();
		}
	} else if (uploadType == "macro") {
		macroUpdateIndex = -1;
		if (currentPage == "control" || currentPage == "macros") {
			updateMacroFiles();
		}
	}

	// Start polling again
	startUpdates();

	// Deal with different upload types
	if (success) {
		// Check if a print is supposed to be started
		if (uploadType == "print") {
			waitingForPrintStart = true;
			sendGCode("M32 " + currentGCodeDirectory + "/" + uploadFileName);
		}

		// Ask for page reload if DWC has been updated
		if (uploadedDWC) {
			$("#modal_upload").modal("hide");
			showConfirmationDialog(T("Reload Page?"), T("You have just updated Duet Web Control. Would you like to reload the page now?"), function() {
				location.reload();
			});
		}

		// Ask for software reset if it's safe to do
		else if (lastStatusResponse != undefined && lastStatusResponse.status == 'I') {
			// Test for firmware update before we test for a new config file, because a firmware update includes a reset
			if (uploadFirmwareFile != undefined) {
				$("#modal_upload").modal("hide");
				showConfirmationDialog(T("Perform Firmware Update?"), T("You have just uploaded a firmware file. Would you like to update your Duet now?"), startFirmwareUpdate);
			} else if (uploadDWSFile != undefined) {
				$("#modal_upload").modal("hide");
				showConfirmationDialog(T("Perform WiFi Server Update?"), T("You have just uploaded a Duet WiFi server firmware file. Would you like to install it now?"), startDWSUpdate);
			} else if (uploadDWCFile != undefined) {
				$("#modal_upload").modal("hide");
				showConfirmationDialog(T("Perform Duet Web Control Update?"), T("You have just uploaded a Duet Web Control package. Would you like to install it now?"), startDWCUpdate);
			} else if (uploadIncludedConfig) {
				$("#modal_upload").modal("hide");
				showConfirmationDialog(T("Reboot Duet?"), T("You have just uploaded a config file. Would you like to reboot your Duet now?"), function() {
					// Perform software reset
					sendGCode("M999");
				});
			}
		}
	}
}

function startFirmwareUpdate() {
	if (uploadFirmwareFile.toUpperCase() != firmwareFileName.toUpperCase() + ".BIN") {
		// The firmware filename is hardcoded in the IAP binary, so try to rename the uploaded file first
		$.ajax("rr_move?old=" + encodeURIComponent("/sys/" + uploadFirmwareFile) + "&new=" + encodeURIComponent("/sys/" + firmwareFileName + ".bin"), {
			dataType: "json",
			success: function(response) {
				if (response.err == 0) {
					// Rename succeeded and flashing can be performed now
					sendGCode("M997 S0");
				} else {
					// Looks like /sys/<firmwareFileName>.bin already exists, attempt to delete it and try again
					$.ajax("rr_delete?name=" + encodeURIComponent("/sys/" + firmwareFileName + ".bin"), {
						dataType: "json",
						success: function(response) {
							if (response.err == 0) {
								// File delete succeeded, attempt to start the firmware update once again
								startFirmwareUpdate();
							} else {
								// Something went wrong
								showMessage("danger", T("Error"), T("Could not rename firmware file!"));
							}
						}
					});
				}
			}
		});
	}
	else {
		// Filename is okay, start flashing immediately
		sendGCode("M997 S0");
	}
}

function startDWSUpdate() {
	if (uploadDWSFile.toUpperCase() != "DUETWIFISERVER.BIN") {
		// The filename is hardcoded in the firmware binary, so try to rename the uploaded file first
		$.ajax("rr_move?old=" + encodeURIComponent("/sys/" + uploadDWSFile) + "&new=" + encodeURIComponent("/sys/DuetWiFiServer.bin"), {
			dataType: "json",
			success: function(response) {
				if (response.err == 0) {
					// Rename succeeded and flashing can be performed now
					sendGCode("M997 S1");
				} else {
					// Looks like /sys/<firmwareFileName>.bin already exists, attempt to delete it and try again
					$.ajax("rr_delete?name=" + encodeURIComponent("/sys/DuetWiFiServer.bin"), {
						dataType: "json",
						success: function(response) {
							if (response.err == 0) {
								// File delete succeeded, attempt to start the firmware update once again
								startDWSUpdate();
							} else {
								// Something went wrong
								showMessage("danger", T("Error"), T("Could not rename WiFi Server update file!"));
							}
						}
					});
				}
			}
		});
	} else {
		// Filename is okay, start flashing immediately
		sendGCode("M997 S1");
	}
}

function startDWCUpdate() {
	if (uploadDWCFile.toUpperCase() != "DUETWEBCONTROL.BIN") {
		// The filename is hardcoded in the firmware binary, so try to rename the uploaded file first
		$.ajax("rr_move?old=" + encodeURIComponent("/sys/" + uploadDWCFile) + "&new=" + encodeURIComponent("/sys/DuetWebControl.bin"), {
			dataType: "json",
			success: function(response) {
				if (response.err == 0) {
					// Rename succeeded and flashing can be performed now
					sendGCode("M997 S2");
				} else {
					// Looks like /sys/<firmwareFileName>.bin already exists, attempt to delete it and try again
					$.ajax("rr_delete?name=" + encodeURIComponent("/sys/DuetWebControl.bin"), {
						dataType: "json",
						success: function(response) {
							if (response.err == 0) {
								// File delete succeeded, attempt to start the firmware update once again
								startDWCUpdate();
							} else {
								// Something went wrong
								showMessage("danger", T("Error"), T("Could not rename Duet Web Control update file!"));
							}
						}
					});
				}
			}
		});
	} else {
		// Filename is okay, start flashing immediately
		sendGCode("M997 S2");
	}
}


/* Upload events */

$("#btn_cancel_upload").click(function() {
	cancelUpload();
});

$(".btn-upload").click(function(e) {
	if (!$(this).is(".disabled")) {
		$("#input_file_upload").data("type", $(this).data("type")).click();
	}
	e.preventDefault();
});

["print", "gcode", "macro", "generic"].forEach(function(type) {
	var child = $(".btn-upload[data-type='" + type + "']");

	// Drag Enter
	child.on("dragover", function(e) {
		$(this).removeClass($(this).data("style")).addClass("btn-success");
		e.preventDefault();
		e.stopPropagation();
	});

	// Drag Leave
	child.on("dragleave", function(e) {
		$(this).removeClass("btn-success").addClass($(this).data("style"));
		e.preventDefault();
		e.stopPropagation();
	});

	// Drop
	child.on("drop", function(e) {
		$(this).removeClass("btn-success").addClass($(this).data("style"));
		e.preventDefault();
		e.stopPropagation();

		var files = e.originalEvent.dataTransfer.files;
		if (!$(this).is(".disabled") && files != null && files.length > 0) {
			// Start new file upload
			startUpload($(this).data("type"), files, false);
		}
	});
});

$("#input_file_upload").change(function(e) {
	if (this.files.length > 0) {
		// For POST uploads we need file blobs
		startUpload($(this).data("type"), this.files, false);
	}
});

$('#modal_upload').on('hidden.bs.modal', function (e) {
	if (uploadFilesSkipped) {
		showMessage("warning", T("Warning"), T("Some files were not uploaded because they were not suitable for your board."));
	}
})
