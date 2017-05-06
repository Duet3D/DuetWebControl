/* File management logic for Duet Web Control
 * 
 * written by Christian Hammacher (c) 2016-2017
 * 
 * licensed under the terms of the GPL v2
 * see http://www.gnu.org/licenses/gpl-2.0.html
 */


var numVolumes, mountedVolumes, mountRequested;

var scansLoaded;

var currentGCodeVolume, changingGCodeVolume;
var currentGCodeDirectory, knownGCodeFiles, gcodeUpdateIndex, gcodeLastDirectory;
var cachedFileInfo;

var currentMacroDirectory, macroLastDirectoryRow, macroLastDirectoryItem, macrosLoaded;
var sysLoaded;


/* G-Code file info caching */

function loadFileCache() {
	var cacheInfo = localStorage.getItem("cachedFileInfo");
	if (cacheInfo == null) {
		cachedFileInfo = {};
	} else {
		cachedFileInfo = JSON.parse(cacheInfo);
	}
}

function saveFileCache() {
	localStorage.setItem("cachedFileInfo", JSON.stringify(cachedFileInfo));
}

function getFileInfo(directory, filename, callback) {
	var path = directory + "/" + filename;
	var fileInfo = cachedFileInfo[path];
	if (fileInfo == undefined) {
		$.ajax(ajaxPrefix + "rr_fileinfo?name=" + encodeURIComponent(directory + "/" + filename), {
			dataType: "json",
			dir: directory,
			file: filename,
			cb: callback,
			success: function(response) {
				// Add response to cache list
				cachedFileInfo[this.dir + "/" + this.file] = response;

				// We've got it
				this.cb(this.dir, this.file, response);
			}
		});
	} else {
		// Fileinfo was queried before
		callback(directory, filename, fileInfo);
	}
}

function clearFileCache(filename) {
	if (filename == undefined) {
		cachedFileInfo = {};
		saveFileCache();
	} else {
		cachedFileInfo[filename] = undefined;
	}
}

function clearFileCacheDirectory(directory) {
	for(var path in cachedFileInfo) {
		// Delete cached file info from paths starting with the directory, but skip sub-directories
		if (path.indexOf(directory + "/") == 0 && path.substring(directory.length + 1).indexOf("/") == -1) {
			cachedFileInfo[path] = undefined;
		}
	}
}


/* Scans */

$('a[href="#page_scanner"]').on('shown.bs.tab', function() {
	if (!scansLoaded) {
		updateScanFiles();
	}
});

$(".span-refresh-scans").click(function() {
	updateScanFiles();
	$(".span-refresh-scans").addClass("hidden");
});

$("#btn_calibrate_scanner").click(function() {
	if ($(this).hasClass("disabled")) {
		// Don't proceed if the button is disabled
		return;
	}

	showConfirmationDialog(T("Calibrate Scanner"), T("Before you can calibrate the 3D scanner you need to place the object in the back-right corner. Do you want to continue?"), function() {
		// Send calibration G-code to the firmware
		sendGCode("M754");
	});
});

$("#btn_start_scan").click(function() {
	if (!$(this).hasClass("disabled")) {
		if (vendor == "diabase") {
			// Properietary implemenation with extra steps
			$("#modal_start_scan").modal("show");
		} else {
			// Basic open-source variant
			showTextInput(T("Start new 3D scan"), T("Please enter a name for the new scan:"), function(name) {
				if (filenameValid(name)) {
					// Let the firmware do the communication to the board
					sendGCode("M752 S360 P" + name);
				} else {
					showMessage("danger", T("Error"), T("The specified filename is invalid. It may not contain quotes, colons or (back)slashes."));
				}
			}, undefined, function() {
				showMessage("danger", T("Error"), T("The filename for a new scan must not be empty!"));
			});
		}
	}
});

function addScanFile(filename, size, lastModified) {
	$("#page_scanner h1").addClass("hidden");
	$("#table_scan_files").removeClass("hidden");

	var isDisabled = false;
	isDisabled |= filename.toLowerCase().endsWith(".bin");

	var row =	'<tr data-file="' + filename + '"><td></td>';
	row +=		'<td><button class="btn btn-info btn-download-file btn-sm" title="' + T("Download this file") + '"><span class="glyphicon glyphicon-download-alt"></span></button></td>';
	row +=		'<td><button class="btn btn-danger btn-delete-file btn-sm" title="' + T("Delete this file") + '"><span class="glyphicon glyphicon-trash"></span></button></td>';
	row +=		'<td><a href="#"><span class="glyphicon glyphicon-file"></span> ' + filename + '</a></td>';
	row +=		'<td>' + formatSize(size) + '</td>';
	row +=		'<td>' + ((lastModified == undefined) ? T("unknown") : lastModified.toLocaleString()) + '</td>';
	row +=		'</tr>';

	var rowElem = $(row);
	/*rowElem.find("a")[0].addEventListener("dragstart", fileDragStart, false);
	rowElem.find("a")[0].addEventListener("dragend", fileDragEnd, false);*/

	$("#table_scan_files > tbody").append(rowElem);
}

function updateScanFiles() {
	// Don't load anything if the scanner mode is disabled
	if ($(".scan-control").hasClass("hidden")) {
		return;
	}

	// Clear the file list
	scansLoaded = false;
	$("#table_scan_files > tbody").children().remove();
	$("#table_scan_files").addClass("hidden");
	$("#page_scanner h1").removeClass("hidden");
	if (isConnected) {
		$(".span-refresh-scans").addClass("hidden");

		// Is the macro volume mounted?
		if ((mountedVolumes & (1 << 0)) == 0) {
			$("#page_scanner h1").text(T("The current volume is not mounted"));
			return;
		}

		$("#page_scanner h1").text(T("loading"));
	} else {
		$("#page_scanner h1").text(T("Connect to your Duet to display scanned files"));
		return;
	}

	// Don't request updates while loading the file list
	stopUpdates();

	// Request filelist for /sys
	$.ajax(ajaxPrefix + "rr_filelist?dir=0:/scans", {
		dataType: "json",
		success: function(response) {
			if (isConnected) {
				if (response.hasOwnProperty("err")) {
					// don't proceed if the firmware has reported an error
					$("#page_scanner h1").text(T("Failed to retrieve files of this directory"));
				} else {
					var files = response.files.sort(function (a, b) {
						return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
					});

					for(var i = 0; i < files.length; i++) {
						if (files[i].type != 'd') {
							var lastModified = files[i].hasOwnProperty("date") ? strToTime(files[i].date) : undefined;
							addScanFile(files[i].name, files[i].size, lastModified);
						}
					}

					if (files.length == 0) {
						$("#page_scanner h1").text(T("No scans found"));
					}
					scansLoaded = true;
				}

				startUpdates();
				scanUpdateFinished();
			}
		}
	});
}

function scanUpdateFinished() {
	if (isConnected) {
		$(".span-refresh-scans").toggleClass("hidden", currentPage != "scanner");
		startUpdates();
	} else {
		$(".span-refresh-scans").addClass("hidden");
	}
}

/*$("#table_scan_files").on("click", "a", function(e) {
	// This is only for drag&drop
	e.preventDefault();
});*/


/* G-Code Files */


// Volume support

function setVolumes(count) {
	if (count == numVolumes) {
		// Don't do anything unless the number has changed
		return;
	}

	$("#td_volume").toggleClass("hidden", count <= 1);
	$("#ul_volumes").children().remove();
	for(var i = 0; i < count; i++) {
		var isMounted = (mountedVolumes & (1 << i)) != 0;

		var item = 	'<li><a href="#" data-volume="' + i + '">';
		if (isMounted) {
			item +=	'<span class="glyphicon glyphicon-ok text-success"></span> ';
		} else {
			item +=	'<span class="glyphicon glyphicon-remove text-danger"></span> ';
		}
		item +=		'<span class="content">' + T("SD Card {0} ({1})", i, isMounted ? T("mounted") : T("not mounted")) + '</span>';
		item +=		'</a></li>';
		$("#ul_volumes").append(item);
	}

	numVolumes = count;
}

function setMountedVolumes(bitmap) {
	if (bitmap == mountedVolumes) {
		// Don't do anything unless the bitmap has changed
		return;
	}
	var oldBitmap = mountedVolumes;
	mountedVolumes = bitmap;

	if ((bitmap & (1 << 0)) != (oldBitmap & (1 << 0))) {
		// Update scanner
		updateScanFiles();

		// Update macros
		updateMacroFiles();

		// Update system files
		updateSysFiles();
	}

	for(var i = 0; i < numVolumes; i++) {
		// Update UI
		var item = $("[data-volume=" + i + "]");
		if ((bitmap & (1 << i)) != 0) {
			item.find("span.glyphicon").removeClass("glyphicon-remove text-danger").addClass("glyphicon-ok text-success");
			item.find("span.content").text(T("SD Card {0} ({1})", i, T("mounted")));
		} else {
			item.find("span.glyphicon").removeClass("glyphicon-ok text-success").addClass("glyphicon-remove text-danger");
			item.find("span.content").text(T("SD Card {0} ({1})", i, T("not mounted")));
		}

		// Check if the requested volume has been mounted
		if (mountRequested && (bitmap & (1 << i)) != (mountedVolumes & (1 << i))) {
			mountRequested = false;
			changeGCodeVolume(i);
		}
	}

	// Is the current G-code volume still mounted?
	if ((bitmap & (1 << currentGCodeVolume)) == 0) {
		// No - find the first one that is mounted
		for(var i = 0; i < numVolumes; i++) {
			if ((bitmap & (1 << i)) != 0) {
				changeGCodeVolume(i);
				return;
			}
		}

		// No volume is mounted at all
		clearGCodeFiles();
	} else {
		// Has the current G-code volume been mounted again?
		if ((oldBitmap & (1 << currentGCodeVolume)) == 0) {
			// Yes - try to reload the files
			gcodeUpdateIndex = -1;
			if (currentPage == "files") {
				updateGCodeFiles();
			}
		}
	}
}

function changeGCodeVolume(volume) {
	currentGCodeVolume = volume;
	$("#btn_volume").removeClass("disabled");
	$("#btn_volume > span.content").text(T("SD Card {0}", volume));

	setGCodeDirectory((volume == 0) ? "0:/gcodes" : volume + ":");
	gcodeUpdateIndex = -1;
	updateGCodeFiles();
}

$("#ul_volumes").on("click", "a", function(e) {
	var volume = $(this).data("volume");
	if ((mountedVolumes & (1 << volume)) == 0) {
		// Volume is not mounted, try to mount it
		$("#btn_volume").addClass("disabled").children("span.content").text(T("Mounting..."));
		sendGCode("M21 P" + volume);
		mountRequested = true;
	} else {
		// Volume is mounted, change it
		changeGCodeVolume(volume);
	}

	e.preventDefault();
});


// File list implementation

$(".span-refresh-files").click(function() {
	clearFileCacheDirectory(currentGCodeDirectory);
	gcodeUpdateIndex = -1;
	updateGCodeFiles();
	$(".span-refresh-files").addClass("hidden");
});

$("body").on("click", "#ol_gcode_directory a", function(e) {
	setGCodeDirectory($(this).data("directory"));
	gcodeUpdateIndex = -1;
	updateGCodeFiles();
	e.preventDefault();
});

$("#btn_new_gcode_directory").click(function() {
	showTextInput(T("New directory"), T("Please enter a name:"), function(value) {
		if (filenameValid(value)) {
			$.ajax(ajaxPrefix + "rr_mkdir?dir=" + encodeURIComponent(currentGCodeDirectory + "/" + value), {
				dataType: "json",
				success: function(response) {
					if (response.err == 0) {
						gcodeUpdateIndex = -1;
						updateGCodeFiles();
					} else {
						showMessage("warning", T("Error"), T("Could not create this directory!"));
					}
				}
			});
		} else {
			showMessage("danger", T("Error"), T("The specified filename is invalid. It may not contain quotes, colons or (back)slashes."));
		}
	});
});

function setGCodeDirectory(directory) {
	currentGCodeDirectory = directory;
	var basePath = (currentGCodeVolume == 0) ? "0:/gcodes" : currentGCodeVolume + ":";
	var baseCaption = (currentGCodeVolume == 0) ? T("G-Codes Directory") : T("Root Directory");
	
	$("#ol_gcode_directory > li.content:not(:first-child)").remove();
	if (directory == basePath) {
		$("#ol_gcode_directory > li.content").replaceWith('<li class="active content"><span class="glyphicon glyphicon-folder-open"></span> ' + baseCaption + '</li>');
		$("#ol_gcode_directory > li:last-child").html('<span class="glyphicon glyphicon-level-up"></span> ' + T("Go Up"));
	} else {
		var listContent = '<li class="content"><a href="#" data-directory="' + basePath + '"><span class="glyphicon glyphicon-folder-open"></span> ' + baseCaption + '</a></li>';
		var directoryItems = directory.split("/"), directoryPath = basePath;
		for(var i = (currentGCodeVolume == 0) ? 2 : 1; i < directoryItems.length - 1; i++) {
			directoryPath += "/" + directoryItems[i];
			listContent += '<li class="active content"><a href="#" data-directory="' + directoryPath + '">' + directoryItems[i] + '</a></li>';
		}
		listContent += '<li class="active content">' + directoryItems[directoryItems.length -1] + '</li>';
		$("#ol_gcode_directory > li.content").replaceWith(listContent);
		$("#ol_gcode_directory > li:last-child").html('<a href="#" data-directory="' + directoryPath + '"><span class="glyphicon glyphicon-level-up"></span> ' + T("Go Up") + '</a>');
	}
}

function clearGCodeDirectory() {
	var baseCaption = (currentGCodeVolume == 0) ? T("G-Codes Directory") : T("Root Directory");
	$("#ol_gcode_directory > li.content:not(:first-child)").remove();
	$("#ol_gcode_directory > li.content").replaceWith('<li class="active content"><span class="glyphicon glyphicon-folder-open"></span> ' + baseCaption + '</li>');
}

function addGCodeFile(filename, size, lastModified) {
	$("#page_files h1").addClass("hidden");
	$("#table_gcode_files").removeClass("hidden");

	var title = (lastModified == undefined) ? "" : (' title="' + T("Last modified on {0}", lastModified.toLocaleString()) + '"');

	var row =	'<tr data-file="' + filename + '"' + title + '>';
	row +=		'<td></td><td></td><td></td>';
	row +=		'<td><span class="glyphicon glyphicon-asterisk"></span> ' + filename + '</td>';
	row +=		'<td class="hidden-xs">' + formatSize(size) + '</td>';
	row +=		'<td class="object-height">' + T("loading") + '</td>';
	row +=		'<td class="layer-height">' + T("loading") + '</td>';
	row +=		'<td class="hidden-xs filament-usage">' + T("loading") + '</td>';
	row +=		'<td class="hidden-xs hidden-sm generated-by">' + T("loading") + '</td>';
	row +=		'</tr>';

	return $(row).appendTo("#table_gcode_files > tbody");
}

function addGCodeDirectory(name) {
	$("#page_files h1").addClass("hidden");
	$("#table_gcode_files").removeClass("hidden");

	var row =	'<tr data-directory="' + name + '">';
	row +=		'<td colspan="3"><button class="btn btn-danger btn-delete-directory btn-sm" title="' + T("Delete this directory") + '"><span class="glyphicon glyphicon-trash"></span></button></td>';
	row +=		'<td class="hidden"></td>';
	row +=		'<td class="hidden"></td>';
	row +=		'<td colspan="6"><a href="#" class="a-gcode-directory"><span class="glyphicon glyphicon-folder-open"></span> ' + name + '</a></td>';
	row +=		'</tr>';

	var rowElem = $(row);
	rowElem.find("a")[0].addEventListener("dragstart", fileDragStart, false);
	rowElem.find("a")[0].addEventListener("dragend", fileDragEnd, false);

	if (gcodeLastDirectory == undefined) {
		var firstRow = $("#table_gcode_files > tbody > tr:first-child");
		if (firstRow.length == 0) {
			$("#table_gcode_files > tbody").append(rowElem);
		} else {
			rowElem.insertBefore(firstRow);
		}
	} else {
		rowElem.insertAfter(gcodeLastDirectory);
	}
	gcodeLastDirectory = rowElem;
}

function setGCodeFileItem(row, height, firstLayerHeight, layerHeight, filamentUsage, generatedBy) {
	// Add buttons
	var filename = row.data("file");
	row.children().eq(0).html('<button class="btn btn-success btn-print-file btn-sm" title="' + T("Print this file (M32)") + '"><span class="glyphicon glyphicon-print"></span></button>').attr("colspan", "");
	row.children().eq(1).html('<button class="btn btn-info btn-download-file btn-sm" title="' + T("Download this file") + '"><span class="glyphicon glyphicon-download-alt"></span></button>');
	row.children().eq(2).html('<button class="btn btn-danger btn-delete-file btn-sm" title="' + T("Delete this file") + '"><span class="glyphicon glyphicon-trash"></span></button>');

	// Make entry interactive and add drag&drop handlers
	var linkCell = row.children().eq(3);
	linkCell.find("span").removeClass("glyphicon-asterisk").addClass("glyphicon-file");
	linkCell.html('<a href="#" class="a-gcode-file">' + linkCell.html() + '</a>');
	linkCell.find("a")[0].addEventListener("dragstart", fileDragStart, false);
	linkCell.find("a")[0].addEventListener("dragend", fileDragEnd, false);

	// Set object height
	row.find(".object-height").text((height > 0) ? T("{0} mm", height) : T("n/a"));

	// Set layer height
	if (layerHeight > 0) {
		var lhText = (firstLayerHeight == undefined) ? (T("{0} mm", layerHeight)) : (firstLayerHeight + " / " + T("{0} mm", layerHeight));
		row.find(".layer-height").text(lhText);
	} else {
		row.find(".layer-height").text(T("n/a"));
	}

	// Set filament usage
	if (filamentUsage.length > 0) {
		var totalUsage = filamentUsage.reduce(function(a, b) { return a + b; }).toFixed(1) + " mm";
		if (filamentUsage.length == 1) {
			row.find(".filament-usage").text(totalUsage);
		} else {
			var individualUsage = T("{0} mm", filamentUsage.reduce(function(a, b) { return T("{0} mm", a) + ", " + b; }));
			var filaUsage = "<abbr class=\"filament-usage\" title=\"" + individualUsage + "\">" + totalUsage + "</abbr>";
			row.find(".filament-usage").html(filaUsage);
		}
	} else {
		row.find(".filament-usage").text(T("n/a"));
	}

	// Set slicer
	row.find(".generated-by").text((generatedBy != "") ? generatedBy : T("n/a"));
}

function clearGCodeFiles() {
	gcodeLastDirectory = undefined;
	
	$("#table_gcode_files > tbody").children().remove();
	$("#table_gcode_files").addClass("hidden");
	$("#page_files h1").removeClass("hidden");
	if (isConnected) {
		if ((mountedVolumes & (1 << currentGCodeVolume)) == 0) {
			$("#page_files h1").text(T("The current volume is not mounted"));
		} else {
			$("#page_files h1").text(T("loading"));
		}
	} else {
		$("#page_files h1").text(T("Connect to your Duet to display G-Code files"));
	}
}

function updateGCodeFiles() {
	if (!isConnected) {
		gcodeUpdateIndex = -1;
		gcodeUpdateFinished();

		clearGCodeDirectory();
		clearGCodeFiles();
		return;
	}

	if (gcodeUpdateIndex == -1) {
		// Is the current volume mounted?
		if ((mountedVolumes & (1 << currentGCodeVolume)) == 0) {
			// No - stop here
			clearGCodeFiles();
			return;
		}

		// Yes - fetch the filelist for the current directory and proceed
		stopUpdates();
		gcodeUpdateIndex = 0;
		gcodeLastDirectory = undefined;
		clearGCodeFiles();

		$.ajax(ajaxPrefix + "rr_filelist?dir=" + encodeURIComponent(currentGCodeDirectory), {
			dataType: "json",
			success: function(response) {
				if (isConnected) {
					if (response.hasOwnProperty("err")) {
						// don't proceed if the firmware has reported an error
						$("#page_files h1").text(T("Failed to retrieve files of this directory"));

						gcodeUpdateIndex = -1;
						gcodeUpdateFinished();
					} else {
						// otherwise add each file and directory
						knownGCodeFiles = response.files.sort(function (a, b) {
							return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
						});

						for(var i = 0; i < knownGCodeFiles.length; i++) {
							if (knownGCodeFiles[i].type == 'd') {
								addGCodeDirectory(knownGCodeFiles[i].name);
							} else {
								var lastModified = knownGCodeFiles[i].hasOwnProperty("date") ? strToTime(knownGCodeFiles[i].date) : undefined;
								addGCodeFile(knownGCodeFiles[i].name, knownGCodeFiles[i].size, lastModified);
							}
						}

						if (knownGCodeFiles.length == 0) {
							$("#page_files h1").text(T("No Files or Directories found"));
							gcodeUpdateFinished();
						} else {
							$("#table_gcode_files").css("cursor", "wait");
							updateGCodeFiles();
						}
					}
				}
			}
		});
	} else if (gcodeUpdateIndex < knownGCodeFiles.length) {
		if (knownGCodeFiles[gcodeUpdateIndex].type == 'd') {
			gcodeUpdateIndex++;
			if (gcodeUpdateIndex >= knownGCodeFiles.length) {
				gcodeUpdateFinished();
			} else {
				updateGCodeFiles();
			}
		} else {
			getFileInfo(currentGCodeDirectory, knownGCodeFiles[gcodeUpdateIndex].name, function(dir, filename, fileinfo) {
				if (!isConnected || dir != currentGCodeDirectory) {
					return;
				}
				gcodeUpdateIndex++;

				var row = $('#table_gcode_files > tbody > tr[data-file="' + filename + '"]');
				if (fileinfo.err == 0) {
					setGCodeFileItem(row, fileinfo.height, fileinfo.firstLayerHeight, fileinfo.layerHeight, fileinfo.filament, fileinfo.generatedBy);
				} else {
					setGCodeFileItem(row, 0, 0, [], "");
				}

				if (currentPage == "files") {
					saveFileCache();
					if (gcodeUpdateIndex >= knownGCodeFiles.length) {
						gcodeUpdateFinished();
					} else {
						updateGCodeFiles();
					}
				} else {
					// Although wired Duets can handle fileinfo requests in parallel, DuetWiFiServer cannot do that yet
					startUpdates();
				}
			});
		}
	}
}

function gcodeUpdateFinished() {
	$("#table_gcode_files").css("cursor", "");
	if (isConnected) {
		$(".span-refresh-files").toggleClass("hidden", currentPage != "files");
		startUpdates();
	} else {
		$(".span-refresh-files").addClass("hidden");
	}
}

$("body").on("click", ".a-gcode-directory", function(e) {
	setGCodeDirectory(currentGCodeDirectory + "/" + $(this).parents("tr").data("directory"));
	gcodeUpdateIndex = -1;
	updateGCodeFiles();
	e.preventDefault();
});


/* Macros */

$(".span-refresh-macros").click(function() {
	updateMacroFiles();
	$(".span-refresh-macros").addClass("hidden");
});

$("body").on("click", "#ol_macro_directory a", function(e) {
	setMacroDirectory($(this).data("directory"));
	updateMacroFiles();
	e.preventDefault();
});

function clearMacroDirectory() {
	$("#ol_macro_directory").children(":not(:last-child)").remove();
	$("#ol_macro_directory").prepend('<li class="active"><span class="glyphicon glyphicon-folder-open"></span> ' + T("Macros Directory") + '</li>');
}

function setMacroDirectory(directory) {
	currentMacroDirectory = directory;

	$("#ol_macro_directory").children(":not(:last-child)").remove();
	if (directory == "0:/macros") {
		$("#ol_macro_directory").prepend('<li class="active"><span class="glyphicon glyphicon-folder-open"></span> ' + T("Macros Directory") + '</li>');
		$("#ol_macro_directory li:last-child").html('<span class="glyphicon glyphicon-level-up"></span> ' + T("Go Up"));
	} else {
		var listContent = '<li><a href="#" data-directory="0:/macros"><span class="glyphicon glyphicon-folder-open"></span> ' + T("Macros Directory") + '</a></li>';
		var directoryItems = directory.split("/"), directoryPath = "0:/macros";
		for(var i = 2; i < directoryItems.length - 1; i++) {
			directoryPath += "/" + directoryItems[i];
			listContent += '<li class="active"><a href="#" data-directory="' + directoryPath + '">' + directoryItems[i] + '</a></li>';
		}
		listContent += '<li class="active">' + directoryItems[directoryItems.length -1] + '</li>';
		$("#ol_macro_directory").prepend(listContent);
		$("#ol_macro_directory li:last-child").html('<a href="#" data-directory="' + directoryPath + '"><span class="glyphicon glyphicon-level-up"></span> ' + T("Go Up") + '</a>');
	}
}

$("#btn_new_macro_directory").click(function() {
	showTextInput(T("New directory"), T("Please enter a name:"), function(value) {
		if (filenameValid(value)) {
			$.ajax(ajaxPrefix + "rr_mkdir?dir=" + currentMacroDirectory + "/" + value, {
				dataType: "json",
				success: function(response) {
					if (response.err == 0) {
						updateMacroFiles();
					} else {
						showMessage("warning", T("Error"), T("Could not create this directory!"));
					}
				}
			});
		} else {
			showMessage("danger", T("Error"), T("The specified filename is invalid. It may not contain quotes, colons or (back)slashes."));
		}
	});
});

$("#btn_new_macro_file").click(function() {
	showTextInput(T("New macro"), T("Please enter a filename:"), function(file) {
		if (filenameValid(file)) {
			showEditDialog(currentMacroDirectory + "/" + file, "", function(value) {
				uploadTextFile(currentMacroDirectory + "/" + file, value, updateMacroFiles);
			});
		} else {
			showMessage("danger", T("Error"), T("The specified filename is invalid. It may not contain quotes, colons or (back)slashes."));
		}
	});
});

function stripMacroFilename(filename) {
	var label = filename;

	// Remove G-code file ending from name
	var match = filename.match(/(.*)\.(g|gc|gcode)$/i);
	if (match != null) {
		label = match[1];
	}

	// Users may want to index their macros, so remove starting numbers
	match = label.match(/^\d+_(.*)/);
	if (match != null) {
		label = match[1];
	}

	return label;
}

function addMacroFile(filename, size, lastModified) {
	// Control Page
	if (currentMacroDirectory == "0:/macros") {
		var macroButton =	'<div class="btn-group">';
		macroButton +=		'<button class="btn btn-default btn-macro btn-sm" data-macro="0:/macros/' + filename + '">' +  stripMacroFilename(filename) + '</button>';
		macroButton +=		'</div>';

		$("#panel_macro_buttons h4").addClass("hidden");
		$("#panel_macro_buttons .btn-group-vertical").append(macroButton);
	}

	// Macro Page
	$("#page_macros h1").addClass("hidden");
	$("#table_macro_files").removeClass("hidden");

	var row =	'<tr data-file="' + filename + '">';
	row +=		'<td><button class="btn btn-success btn-run-macro btn-sm" title="' + T("Run this macro file (M98)") + '"><span class="glyphicon glyphicon-play"></span></button></td>';
	row +=		'<td><button class="btn btn-info btn-edit-file btn-sm" title="' + T("Edit this macro") + '"><span class="glyphicon glyphicon-pencil"></span></button></td>';
	row +=		'<td><button class="btn btn-danger btn-delete-file btn-sm" title="' + T("Delete this macro") + '"><span class="glyphicon glyphicon-trash"></span></button></td>';
	row +=		'<td><a href="#" class="a-macro-file"><span class="glyphicon glyphicon-file"></span> ' + filename + '</a></td>';
	row +=		'<td>' + formatSize(size) + '</td>';
	row +=		'<td>' + ((lastModified == undefined) ? T("unknown") : lastModified.toLocaleString()) + '</td>';
	row +=		'</tr>';

	var rowElem = $(row);
	rowElem.find("a")[0].addEventListener("dragstart", fileDragStart, false);
	rowElem.find("a")[0].addEventListener("dragend", fileDragEnd, false);
	rowElem.appendTo("#table_macro_files > tbody");
}

function addMacroDirectory(name) {
	// Control Page
	if (currentMacroDirectory == "0:/macros") {
		$("#panel_macro_buttons h4").addClass("hidden");

		var button =	'<div class="btn-group">';
		button +=		'<button class="btn btn-info btn-macro btn-sm" data-directory="0:/macros/' + name + '" data-toggle="dropdown">' + name + ' <span class="caret"></span></button>';
		button +=		'<ul class="dropdown-menu"></ul>';
		button +=		'</div>';

		var buttonElem = $(button);
		if (macroLastDirectoryItem == undefined) {
			var firstButton = $("#panel_macro_buttons .btn-group-vertical > div:first-child");
			if (firstButton.length == 0) {
				$("#panel_macro_buttons .btn-group-vertical").append(buttonElem);
			} else {
				buttonElem.insertBefore(firstButton);
			}
		} else {
			buttonElem.insertAfter(macroLastDirectoryItem);
		}
		macroLastDirectoryItem = buttonElem;
	}

	// Macro Page
	$("#page_macros h1").addClass("hidden");
	$("#table_macro_files").removeClass("hidden");

	var row =	'<tr data-directory="' + name + '">';
	row +=		'<td colspan="3"><button class="btn btn-danger btn-delete-directory btn-sm" title="' + T("Delete this directory") + '"><span class="glyphicon glyphicon-trash"></span></button></td>';
	row +=		'<td class="hidden"></td>';
	row +=		'<td class="hidden"></td>';
	row +=		'<td colspan="3"><a href="#" class="a-macro-directory"><span class="glyphicon glyphicon-folder-open"></span> ' + name + '</a></td>';
	row +=		'<td class="hidden"></td>';
	row +=		'<td class="hidden"></td>';
	row +=		'</tr>';

	var rowElem = $(row);
	rowElem.find("a")[0].addEventListener("dragstart", fileDragStart, false);
	rowElem.find("a")[0].addEventListener("dragend", fileDragEnd, false);

	if (macroLastDirectoryRow == undefined) {
		var firstRow = $("#table_macro_files > tbody > tr:first-child");
		if (firstRow.length == 0) {
			$("#table_macro_files > tbody").append(rowElem);
		} else {
			rowElem.insertBefore(firstRow);
		}
	} else {
		rowElem.insertAfter(macroLastDirectoryRow);
	}
	macroLastDirectoryRow = rowElem;
}

function updateMacroFiles() {
	clearMacroFiles();
	if (!isConnected) {
		$(".span-refresh-macros").addClass("hidden");
		return;
	}

	// Is the macro volume mounted?
	if ((mountedVolumes & (1 << 0)) == 0) {
		// No - stop here
		clearMacroFiles();
		return;
	}

	// Yes - fetch the filelist for the current directory and proceed
	stopUpdates();

	$.ajax(ajaxPrefix + "rr_filelist?dir=" + encodeURIComponent(currentMacroDirectory), {
		dataType: "json",
		success: function(response) {
			if (isConnected) {
				if (response.hasOwnProperty("err")) {
					// don't proceed if the firmware has reported an error
					$("#page_macros h1").text(T("Failed to retrieve files of this directory"));
					if (currentMacroDirectory == "0:/macros") {
						$("#panel_macro_buttons h4").text(T("Failed to retrieve files of this directory"));
					}
				} else {
					var files = response.files.sort(function (a, b) {
						return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
					});

					for(var i = 0; i < files.length; i++) {
						if (files[i].type == 'd') {
							addMacroDirectory(files[i].name);
						} else {
							var lastModified = files[i].hasOwnProperty("date") ? strToTime(files[i].date) : undefined;
							addMacroFile(files[i].name, files[i].size, lastModified);
						}
					}

					if (files.length == 0) {
						$("#page_macros h1").text(T("No Macro Files found"));
					}

					if (currentPage == "macros") {
						$(".span-refresh-macros").removeClass("hidden");
					}
					macrosLoaded = true;
				}

				startUpdates();
			}
		}
	});
}

$("body").on("click", ".a-macro-directory", function(e) {
	setMacroDirectory(currentMacroDirectory + "/" + $(this).parents("tr").data("directory"));
	updateMacroFiles();
	e.preventDefault();
});

function clearMacroFiles() {
	// Control Page
	if (currentMacroDirectory == "0:/macros") {
		macroLastDirectoryItem = undefined;

		$("#panel_macro_buttons .btn-group-vertical").children().remove();
		if (isConnected && (mountedVolumes & (1 << 0)) == 0) {
			$("#panel_macro_buttons h4").text(T("The first volume is not mounted"));
		} else {
			$("#panel_macro_buttons h4").text(T("Go to the Macros page to define your own actions"));
		}
		$("#panel_macro_buttons h4").removeClass("hidden");
	}

	// Macros Page
	macrosLoaded = false;
	macroLastDirectoryRow = undefined;

	$("#table_macro_files > tbody").children().remove();
	$("#table_macro_files").addClass("hidden");
	$("#page_macros h1").removeClass("hidden");
	if (isConnected) {
		if ((mountedVolumes & (1 << 0)) == 0) {
			$("#page_macros h1").text(T("The first volume is not mounted"));
		} else {
			$("#page_macros h1").text(T("loading"));
		}
	} else {
		$("#page_macros h1").text(T("Connect to your Duet to display Macro files"));
	}
}

$("body").on("click", ".btn-macro", function(e) {
	var directory = $(this).data("directory");
	if (directory != undefined) {
		var dropdown = $(this).parent().children("ul");
		dropdown.css("width", $(this).outerWidth());
		loadMacroDropdown(directory, dropdown);
		dropdown.dropdown();
	} else {
		sendGCode("M98 P" + $(this).data("macro"));
	}
	e.preventDefault();
});

function loadMacroDropdown(directory, dropdown) {
	$.ajax(ajaxPrefix + "rr_filelist?dir=" + encodeURIComponent(directory), {
		dataType: "json",
		directory: directory,
		dropdown: dropdown,
		success: function(response) {
			if (response.hasOwnProperty("err")) {
				dropdown.html('<li><a href="#" class="disabled" style="color:#777;">' + T("Failed to retrieve files of this directory") + '</a></li>');
			} else if (response.files.length == 0) {
				dropdown.html('<li><a href="#" class="disabled" style="color:#777;">' + T("No files found!") + '</a></li>');
			} else {
				dropdown.html('<li><a href="#" class="disabled" style="color:#777;">' + directory + '</a></li><li class="divider"></li>');
				var files = response.files.sort(function (a, b) {
					return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
				});

				files.forEach(function(file) {
					if (file.type == 'd') {
						var item = $('<li class="bg-info"><a href="#" data-directory="' + directory + '/' + file.name + '">' + file.name + ' <span class="caret"></span></a></li>');
						item.find("a").click(function(e) {
							loadMacroDropdown($(this).data("directory"), $(this).parents("ul"));
							e.stopPropagation();
							e.preventDefault();
						});
						dropdown.append(item);
					} else {
						var item = $('<li><a href="#" data-macro="' + directory + '/' + file.name + '">' + stripMacroFilename(file.name) + '</a></li>');
						item.find("a").click(function(e) {
							sendGCode("M98 P" + $(this).data("macro"));
							e.preventDefault();
						});
						dropdown.append(item);
					}
				});
			}
		}
	});
}


/* Common functions */

function filenameValid(name) {
	if (name.indexOf('"') != -1 || name.indexOf("'") != -1) {
		// Don't allow quotes in filenames
		return false;
	}

	if (name.indexOf("/") != -1 || name.indexOf("\"") != -1) {
		// Don't allow (back)slashes either
		return false;
	}

	if (name.indexOf(":") != -1) {
		// Colons should be avoided too
		return false;
	}

	return true;
}

function resetFiles() {
	setVolumes(1);
	setMountedVolumes(1);
	mountRequested = false;

	//updateScanFiles();

	knownGCodeFiles = [];
	gcodeUpdateIndex = -1;
	currentGCodeVolume = 0;
	currentGCodeDirectory = "0:/gcodes";
	//updateGCodeFiles();

	currentMacroDirectory = "0:/macros";
	//updateMacroFiles();

	//updateSysFiles();
}

var draggingObject;

function fileDragStart(e) {
	$(".no-drag-target").addClass("hidden");
	$(".drag-target").removeClass("hidden");

	draggingObject = $(this).closest("tr");
	// The following doesn't work, although it's recommended. I wonder who invented this crappy API...
	//e.dataTransfer.setData('text/html', this.innerHTML);
}

function fileDragEnd(e) {
	$(".no-drag-target").removeClass("hidden");
	$(".drag-target").addClass("hidden");

	draggingObject = undefined;
}

$(".table-files").on("dragover", "tr", function(e) {
	var row = $(e.target).closest("tr");
	if (draggingObject != undefined && row != undefined) {
		var dir = row.data("directory");
		if (dir != undefined && dir != draggingObject.data("directory")) {
			e.stopPropagation();
			e.preventDefault();
		}
	}
});

$(".table-files").on("drop", "tr", function(e) {
	if (draggingObject == undefined) {
		return;
	}

	var sourcePath = draggingObject.data("file");
	if (sourcePath == undefined) {
		sourcePath = draggingObject.data("directory");
	}

	var targetPath = $(e.target).closest("tr").data("directory");
	if (targetPath != undefined && sourcePath != targetPath) {
		if (currentPage == "files") {
			targetPath = currentGCodeDirectory + "/" + targetPath + "/" + sourcePath;
			sourcePath = currentGCodeDirectory + "/" + sourcePath;

			clearFileCache(sourcePath);
			clearFileCache(targetPath);
		} else {
			targetPath = currentMacroDirectory + "/" + targetPath + "/" + sourcePath;
			sourcePath = currentMacroDirectory + "/" + sourcePath;
		}

		$.ajax(ajaxPrefix + "rr_move?old=" + encodeURIComponent(sourcePath) + "&new=" + encodeURIComponent(targetPath), {
			dataType: "json",
			row: draggingObject,
			success: function(response) {
				if (response.err == 0) {
					// We can never run out of files/dirs if we move FSOs to sub-directories...
					this.row.remove();
				}
				// else an error is reported via rr_reply
			}
		});

		e.stopPropagation();
		e.preventDefault();
	}
});

$("#ol_gcode_directory, #ol_macro_directory").on("dragover", "a", function(e) {
	if (draggingObject != undefined) {
		e.stopPropagation();
		e.preventDefault();
	}
});

$("#ol_gcode_directory, #ol_macro_directory").on("drop", "a", function(e) {
	if (draggingObject == undefined) {
		return;
	}
	draggingObject = draggingObject.closest("tr");

	var targetDir = $(e.target).data("directory");
	if (targetDir != undefined) {
		var sourcePath = draggingObject.data("file");
		if (sourcePath == undefined) {
			sourcePath = draggingObject.data("directory");
		}

		var targetPath, fileTable;
		if (currentPage == "files") {
			targetPath = targetDir + "/" + sourcePath;
			sourcePath = currentGCodeDirectory + "/" + sourcePath;
			fileTable = $("#table_gcode_files > tbody");

			clearFileCache(sourcePath);
			clearFileCache(targetPath);
		} else {
			targetPath = targetDir + "/" + sourcePath;
			sourcePath = currentMacroDirectory + "/" + sourcePath;
			fileTable = $("#table_macro_files > tbody");
		}

		$.ajax(ajaxPrefix + "rr_move?old=" + encodeURIComponent(sourcePath) + "&new=" + encodeURIComponent(targetPath), {
			dataType: "json",
			row: draggingObject,
			table: fileTable,
			success: function(response) {
				if (response.err == 0) {
					this.row.remove();
					if (this.table.children().length == 0) {
						if (currentPage == "files") {
							gcodeUpdateIndex = -1;
							updateGCodeFiles();
						} else {
							updateMacroFiles();
						}
					}
				}
				// else an error is reported via rr_reply
			}
		});

		e.stopPropagation();
		e.preventDefault();
	}
});

$(".btn-rename, #a_rename_file").on("dragover", function(e) {
	if (draggingObject != undefined) {
		if ($(this).is("button")) {
			$(this).removeClass("btn-warning").addClass("btn-success");
		}

		e.stopPropagation();
		e.preventDefault();
	}
});

$(".btn-rename, #a_rename_file").on("drop", function(e) {
	if (draggingObject != undefined) {
		if ($(this).is("button")) {
			$(this).removeClass("btn-success").addClass("btn-warning");
		}

		var oldFileName = draggingObject.data("file");
		if (oldFileName == undefined) {
			oldFileName = draggingObject.data("directory");
		}

		showTextInput(T("Rename File or Directory"), T("Please enter a new name:"), function(newFileName) {
			// Get current path
			var filePath;
			if (currentPage == "files") {
				filePath = currentGCodeDirectory;
				clearFileCache(filePath + "/" + oldFileName);
			} else if (currentPage == "macros") {
				filePath = currentMacroDirectory;
			} else {
				filePath = "0:/sys";
			}

			// Try to move that file
			$.ajax(ajaxPrefix + "rr_move?old=" + encodeURIComponent(filePath + "/" + oldFileName) + "&new=" + encodeURIComponent(filePath + "/" + newFileName), {
				dataType: "json",
				success: function(response) {
					if (response.err == 0) {
						if (currentPage == "files") {
							gcodeUpdateIndex = -1;
							updateGCodeFiles();
						} else if (currentPage == "macros") {
							updateMacroFiles();
						} else {
							updateSysFiles();
						}
					}
					// else an error is reported via rr_reply
				}
			});
		}, oldFileName);

		e.preventDefault();
		e.stopPropagation();
	}
});

$(".btn-rename").on("dragleave", function(e) {
	$(this).removeClass("btn-success").addClass("btn-warning");
});


/* System Editor */

$('a[href="#page_sysedit"]').on('shown.bs.tab', function() {
	if (!sysLoaded) {
		updateSysFiles();
	}
});

$("#a_new_sys_file").click(function() {
	showTextInput(T("New File"), T("Please enter a filename:"), function(file) {
		if (filenameValid(file)) {
			showEditDialog("0:/sys/" + file, "", function(value) {
				uploadTextFile("0:/sys/" + file, value, updateSysFiles);
			});
		} else {
			showMessage("danger", T("Error"), T("The specified filename is invalid. It may not contain quotes, colons or (back)slashes."));
		}
	});
});

$("#a_refresh_sys").click(function(e) {
	updateSysFiles();
	e.preventDefault();
});

function addSysFile(filename, size, lastModified) {
	$("#page_sysedit h1").addClass("hidden");
	$("#table_sys_files").removeClass("hidden");

	var isDisabled = false;
	isDisabled |= filename.toLowerCase().endsWith(".bin");

	var row =	'<tr data-file="' + filename + '">';
	if (filename.endsWith(".csv")) {
		row +=	'<td><button class="btn btn-success btn-view-heightmap btn-sm" title="' + T("View this heightmap") + '"><span class="glyphicon glyphicon-eye-open"></span></button></td>';
	} else {
		row +=	'<td><button class="btn btn-success btn-edit-file ' + (isDisabled ? "disabled" : "") + ' btn-sm" title="' + T("Edit this file") + '"><span class="glyphicon glyphicon-pencil"></span></button></td>';
	}
	row +=		'<td><button class="btn btn-info btn-download-file btn-sm" title="' + T("Download this file") + '"><span class="glyphicon glyphicon-download-alt"></span></button></td>';
	row +=		'<td><button class="btn btn-danger btn-delete-file btn-sm" title="' + T("Delete this file") + '"><span class="glyphicon glyphicon-trash"></span></button></td>';
	row +=		'<td><a href="#"><span class="glyphicon glyphicon-file"></span> ' + filename + '</a></td>';
	row +=		'<td>' + formatSize(size) + '</td>';
	row +=		'<td>' + ((lastModified == undefined) ? T("unknown") : lastModified.toLocaleString()) + '</td>';
	row +=		'</tr>';

	var rowElem = $(row);
	rowElem.find("a")[0].addEventListener("dragstart", fileDragStart, false);
	rowElem.find("a")[0].addEventListener("dragend", fileDragEnd, false);

	$("#table_sys_files > tbody").append(rowElem);
}

function updateSysFiles() {
	// Clear the file list
	sysLoaded = false;
	$("#table_sys_files > tbody").children().remove();
	$("#table_sys_files").addClass("hidden");
	$("#page_sysedit h1").removeClass("hidden");
	if (isConnected) {
		$("#a_refresh_sys").addClass("hidden");

		// Is the macro volume mounted?
		if ((mountedVolumes & (1 << 0)) == 0) {
			$("#page_sysedit h1").text(T("The current volume is not mounted"));
			return;
		}

		$("#page_sysedit h1").text(T("loading"));
	} else {
		$("#page_sysedit h1").text(T("Connect to your Duet to display System files"));
		return;
	}

	// Don't request updates while loading the file list
	stopUpdates();

	// Request filelist for /sys
	$.ajax(ajaxPrefix + "rr_filelist?dir=0:/sys", {
		dataType: "json",
		success: function(response) {
			if (isConnected) {
				if (response.hasOwnProperty("err")) {
					// don't proceed if the firmware has reported an error
					$("#page_sysedit h1").text(T("Failed to retrieve files of this directory"));
				} else {
					var files = response.files.sort(function (a, b) {
						return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
					});

					for(var i = 0; i < files.length; i++) {
						if (files[i].type != 'd') {
							var lastModified = files[i].hasOwnProperty("date") ? strToTime(files[i].date) : undefined;
							addSysFile(files[i].name, files[i].size, lastModified);
						}
					}

					if (files.length == 0) {
						$("#page_sysedit h1").text(T("No System Files found"));
					}

					$("#a_refresh_sys").removeClass("hidden");
					sysLoaded = true;
				}

				startUpdates();
			}
		}
	});
}

$("#table_sys_files").on("click", "a", function(e) {
	// This is only for drag&drop
	e.preventDefault();
});


/* List item events */

function getFilePath() {
	if (currentPage == "scanner") {
		return "0:/scans";
	}

	if (currentPage == "files") {
		return currentGCodeDirectory;
	}

	if (currentPage == "macros") {
		return currentMacroDirectory;
	}

	return "0:/sys";
}

$("body").on("click", ".btn-download-file", function(e) {
	var filename = $(this).parents("tr").data("file");
	var filepath = getFilePath() + "/" + filename;

	// Should use a button link instead, but for some reason it isn't properly displayed with latest Bootstrap 3.3.7
	var elem = $('<a target="_blank" href="rr_download?name=' + encodeURIComponent(filepath) + '" download="' + filename + '"></a>');
	elem.appendTo("body");
	elem[0].click();
	elem.remove();
});

function editFile(file) {
	$.ajax(ajaxPrefix + "rr_download?name=" + encodeURIComponent(file), {
		dataType: "text",
		success: function(response) {
			showEditDialog(file, response, function(value) {
				uploadTextFile(file, value, function() {
					if (currentPage == "files") {
						updateGCodeFiles();
					} else if (currentPage == "macros") {
						updateMacroFiles();
					} else if (currentPage == "settings") {
						updateSysFiles();
					}
				});
			});
		}
	});
}

$("body").on("click", ".btn-edit-file", function(e) {
	if (!$(this).is(".disabled")) {
		editFile(getFilePath() + "/" + $(this).parents("tr").data("file"));
	}
	e.preventDefault();
});

$("body").on("click", ".btn-delete-file", function(e) {
	var row = $(this).parents("tr");
	var file = row.data("file");
	showConfirmationDialog(T("Delete File"), T("Are you sure you want to delete <strong>{0}</strong>?", file), function() {
		$.ajax(ajaxPrefix + "rr_delete?name=" + encodeURIComponent(getFilePath() + "/" + file), {
			dataType: "json",
			row: row,
			file: file,
			success: function(response) {
				if (response.err == 0) {
					this.row.remove();

					if (currentPage == "scanner") {
						updateScanFiles();
					} else if (currentPage == "files") {
						if ($("#table_gcode_files > tbody").children().length == 0) {
							gcodeUpdateIndex = -1;
							updateGCodeFiles();
						}
					} else if (currentPage == "macros") {
						if ($("#table_macro_files > tbody").children().length == 0) {
							updateMacroFiles();
						}
					} else {
						if ($("#table_sys_files > tbody").children().length == 0) {
							updateSysFiles();
						}
					}
				} else {
					showMessage("warning", T("Deletion failed"), T("<strong>Warning:</strong> Could not delete file <strong>{0}</strong>!", this.file));
				}
			}
		});
	});
	e.preventDefault();
});

$("body").on("click", ".btn-delete-directory", function(e) {
	var row = $(this).parents("tr");
	var directory = row.data("directory");
	$.ajax(ajaxPrefix + "rr_delete?name=" + encodeURIComponent(getFilePath() + "/" + directory), {
		dataType: "json",
		row: row,
		directory: directory,
		success: function(response) {
			if (response.err == 0) {
				this.row.remove();

				if (currentPage == "files") {
					if ($("#table_gcode_files > tbody").children().length == 0) {
						gcodeUpdateIndex = -1;
						updateGCodeFiles();
					}
				} else if (currentPage == "macros") {
					if ($("#table_macro_files > tbody").children().length == 0) {
						updateMacroFiles();
					}
				} else {
					if ($("#table_sys_files > tbody").children().length == 0) {
						updateSysFiles();
					}
				}
			} else {
				showMessage("warning", T("Deletion failed"), T("<strong>Warning:</strong> Could not delete directory <strong>{0}</strong>!<br/><br/>Perhaps it isn't empty?", this.directory));
			}
		}
	});
	e.preventDefault();
});

$("body").on("click", ".btn-print-file, .a-gcode-file", function(e) {
	var file = $(this).parents("tr").data("file");
	showConfirmationDialog(T("Start Print"), T("Do you want to print <strong>{0}</strong>?", file), function() {
		waitingForPrintStart = true;
		if (currentGCodeVolume != 0) {
			sendGCode("M32 " + currentGCodeDirectory + "/" + file);
		} else if (currentGCodeDirectory == "0:/gcodes") {
			sendGCode("M32 " + file);
		} else {
			sendGCode("M32 " + currentGCodeDirectory.substring(10) + "/" + file);
		}
	});
	e.preventDefault();
});


$("body").on("click", ".btn-run-macro, .a-macro-file", function(e) {
	sendGCode("M98 P" + currentMacroDirectory + "/" + $(this).parents("tr").data("file"));
	e.preventDefault();
});

$("body").on("click", ".btn-view-heightmap", function(e) {
	getHeightmap(getFilePath() + "/" + $(this).parents("tr").data("file"));
	e.preventDefault();
});
