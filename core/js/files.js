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
var filamentsLoaded, filamentsExist;
var sysLoaded;

var multiFileOperations, doingFileTask;
var downloadNotification, zipFile;


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

	var row =	'<tr data-file="' + filename + '">';
	row +=		'<td><button class="btn btn-info btn-download-file btn-sm" title="' + T("Download this file") + '"><span class="glyphicon glyphicon-download-alt"></span></button></td>';
	row +=		'<td><button class="btn btn-danger btn-delete-file btn-sm" title="' + T("Delete this file") + '"><span class="glyphicon glyphicon-trash"></span></button></td>';
	row +=		'<td><a href="#" class="btn-download-file"><span class="glyphicon glyphicon-file"></span>' + filename + '</a></td>';
	row +=		'<td>' + formatSize(size) + '</td>';
	row +=		'<td>' + ((lastModified == undefined) ? T("unknown") : lastModified.toLocaleString()) + '</td>';
	row +=		'</tr>';
	$("#table_scan_files > tbody").append(row);
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

	// Request filelist for /scans
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

$("body").on("click", ".btn-download-file", function(e) {
	var filename = $(this).closest("tr").data("file");
	var filepath = getFilePath() + "/" + filename;

	// Should use a button link instead, but for some reason it isn't properly displayed with latest Bootstrap 3.3.7
	var elem = $('<a target="_blank" href="' + ajaxPrefix + 'rr_download?name=' + encodeURIComponent(filepath) + '" download="' + filename + '"></a>');
	elem.appendTo("body");
	elem[0].click();
	elem.remove();

	e.preventDefault();
});

$("body").on("click", ".btn-delete-file", function(e) {
	var row = $(this).closest("tr");
	var file = row.data("file");
	showConfirmationDialog(T("Delete File"), T("Are you sure you want to delete <strong>{0}</strong>?", file), function() {
		deletePath(file, row);
	});

	e.preventDefault();
});


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
		if (mountRequested && (bitmap & (1 << i)) != (oldBitmap & (1 << i))) {
			mountRequested = false;
			changeGCodeVolume(i);
			return;
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

	var lastModifiedValue = (lastModified == undefined) ? 0 : lastModified.getTime();
	var row =	'<tr draggable="true" data-file="' + filename + '"' + title + ' data-size="' + size + '" data-last-modified="' + lastModifiedValue + '">';
	row +=		'<td><input type="checkbox"></td>';
	row +=		'<td class="name"><span class="glyphicon glyphicon-asterisk"></span> ' + filename + '</td>';
	row +=		'<td class="hidden-xs">' + formatSize(size) + '</td>';
	row +=		'<td class="hidden-xs hidden-sm last-modified">' + ((lastModified == undefined) ? T("n/a") : lastModified.toLocaleString()) + '</td>';
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

	var row =	'<tr draggable="true" data-directory="' + name + '">';
	row +=		'<td><input type="checkbox"></td>';
	row +=		'<td colspan="7"><a href="#" class="a-gcode-directory"><span class="glyphicon glyphicon-folder-open"></span> ' + name + '</a></td>';
	row +=		'</tr>';

	var rowElem = $(row);
	rowElem[0].addEventListener("dragstart", fileDragStart, false);
	rowElem[0].addEventListener("dragend", fileDragEnd, false);

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
	// Make entry interactive and link the missing data attributes to it
	var linkCell = row.children().eq(1);
	linkCell.find("span").removeClass("glyphicon-asterisk").addClass("glyphicon-file");
	linkCell.html('<a href="#" class="a-gcode-file">' + linkCell.html() + '</a>');
	row.data("height", height);
	row.data("first-layer-height", firstLayerHeight);
	row.data("layer-height", layerHeight);
	row.data("filament-usage", filamentUsage);
	row.data("generated-by", generatedBy);

	// Add drag&drop handlers
	row[0].addEventListener("dragstart", fileDragStart, false);
	row[0].addEventListener("dragend", fileDragEnd, false);

	// Set slicer
	var slicer = generatedBy.match(/(.*\d\.\d)\s/);
	if (slicer == null) {
		slicer = generatedBy;
	} else {
		slicer = slicer[1];
	}
	slicer = slicer.replace(" Version", "");
	row.find(".generated-by").text((slicer != "") ? slicer : T("n/a"));

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
}

function clearGCodeFiles() {
	gcodeLastDirectory = undefined;
	
	$("#table_gcode_files > thead input[type='checkbox']:first-child").prop("checked", false);
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
						knownGCodeFiles = response.files;
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
	var table = $("#table_gcode_files").css("cursor", "");
	sortTable(table);

	if (isConnected) {
		$(".span-refresh-files").toggleClass("hidden", currentPage != "files");
		startUpdates();
	} else {
		$(".span-refresh-files").addClass("hidden");
	}
}

$("body").on("click", ".a-gcode-directory", function(e) {
	setGCodeDirectory(currentGCodeDirectory + "/" + $(this).closest("tr").data("directory"));
	gcodeUpdateIndex = -1;
	updateGCodeFiles();
	e.preventDefault();
});

$("body").on("click", ".a-gcode-file", function(e) {
	var file = $(this).closest("tr").data("file");
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

$("#a_new_macro_directory").click(function(e) {
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
	e.preventDefault();
});

$("#a_new_macro_file").click(function(e) {
	showTextInput(T("New macro"), T("Please enter a filename:"), function(file) {
		if (filenameValid(file)) {
			showEditDialog(currentMacroDirectory + "/" + file, "", function(value) {
				uploadTextFile(currentMacroDirectory + "/" + file, value, updateMacroFiles);
			});
		} else {
			showMessage("danger", T("Error"), T("The specified filename is invalid. It may not contain quotes, colons or (back)slashes."));
		}
	});
	e.preventDefault();
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

	var lastModifiedValue = (lastModified == undefined) ? 0 : lastModified.getTime();
	var row =	'<tr draggable="true" data-file="' + filename + '" data-size="' + size + '" data-last-modified="' + lastModifiedValue + '">';
	row +=		'<td><input type="checkbox"></td>';
	row +=		'<td><a href="#" class="a-macro-file"><span class="glyphicon glyphicon-file"></span> ' + filename + '</a></td>';
	row +=		'<td>' + formatSize(size) + '</td>';
	row +=		'<td>' + ((lastModified == undefined) ? T("unknown") : lastModified.toLocaleString()) + '</td>';
	row +=		'</tr>\n';

	var rowElem = $(row);
	rowElem[0].addEventListener("dragstart", fileDragStart, false);
	rowElem[0].addEventListener("dragend", fileDragEnd, false);
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

	var row =	'<tr draggable="true" data-directory="' + name + '">';
	row +=		'<td><input type="checkbox"></td>';
	row +=		'<td colspan="3"><a href="#" class="a-macro-directory"><span class="glyphicon glyphicon-folder-open"></span> ' + name + '</a></td>';
	row +=		'<td class="hidden"></td>';
	row +=		'<td class="hidden"></td>';
	row +=		'</tr>\n';

	var rowElem = $(row);
	rowElem[0].addEventListener("dragstart", fileDragStart, false);
	rowElem[0].addEventListener("dragend", fileDragEnd, false);

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
					// Sort the macros by name when we get the response, because we
					// may need to use the sorted array on the Control page
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
					} else {
						sortTable($("#table_macro_files"));
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

function clearMacroFiles() {
	// Control Page
	if (currentMacroDirectory == "0:/macros") {
		macroLastDirectoryItem = undefined;

		$("#panel_macro_buttons .btn-group-vertical").children().remove();
		if (!isConnected) {
			$("#panel_macro_buttons h4").text(T("Connect to your Duet to display Macro files"));
		} else if ((mountedVolumes & (1 << 0)) == 0) {
			$("#panel_macro_buttons h4").text(T("The first volume is not mounted"));
		} else {
			$("#panel_macro_buttons h4").text(T("Go to the Macros page to define your own actions"));
		}
		$("#panel_macro_buttons h4").removeClass("hidden");
	}

	// Macros Page
	macrosLoaded = false;
	macroLastDirectoryRow = undefined;

	$("#table_macro_files > thead input[type='checkbox']:first-child").prop("checked", false);
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
							loadMacroDropdown($(this).data("directory"), $(this).closest("ul"));
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

$("body").on("click", ".a-macro-directory", function(e) {
	setMacroDirectory(currentMacroDirectory + "/" + $(this).closest("tr").data("directory"));
	updateMacroFiles();
	e.preventDefault();
});

$("body").on("click", ".a-macro-file", function(e) {
	var file = $(this).closest("tr").data("file");
	showConfirmationDialog(T("Run Macro"), T("Do you want to run <strong>{0}</strong>?", file), function() {
		sendGCode("M98 P" + currentMacroDirectory + "/" + file);
	});
	e.preventDefault();
});


/* Filaments */

$(".span-refresh-filaments").click(function() {
	updateFilaments();
	$(".span-refresh-filaments").addClass("hidden");
});

$("#btn_new_filament").click(function() {
	showTextInput(T("New filament"), T("Please enter a name:"), function(value) {
		if (filenameValid(value)) {
			if (filamentsExist) {
				$.ajax(ajaxPrefix + "rr_mkdir?dir=" + encodeURIComponent("0:/filaments/" + value), {
					dataType: "json",
					success: function(response) {
						if (response.err == 0) {
							uploadTextFile("0:/filaments/" + value + "/load.g", "", undefined, false);
							uploadTextFile("0:/filaments/" + value + "/unload.g", "", undefined, false);
							updateFilaments();
						} else {
							showMessage("warning", T("Error"), T("Could not create this directory!"));
						}
					}
				});
			} else {
				$.ajax(ajaxPrefix + "rr_mkdir?dir=0:/filaments", {
					dataType: "json",
					success: function(response) {
						if (response.err == 0) {
							$.ajax(ajaxPrefix + "rr_mkdir?dir=" + encodeURIComponent("0:/filaments/" + value), {
								dataType: "json",
								success: function(response) {
									if (response.err == 0) {
										uploadTextFile("0:/filaments/" + value + "/load.g", "", undefined, false);
										uploadTextFile("0:/filaments/" + value + "/unload.g", "", undefined, false);
										updateFilaments();
									} else {
										showMessage("warning", T("Error"), T("Could not create this directory!"));
									}
								}
							});
						}
					}
				});
			}
		} else {
			showMessage("danger", T("Error"), T("The specified filename is invalid. It may not contain quotes, colons or (back)slashes."));
		}
	});
});

function updateFilaments() {
	clearFilaments();
	if (!isConnected) {
		$(".span-refresh-filaments").addClass("hidden");
		return;
	}

	// Is the macro volume mounted?
	if ((mountedVolumes & (1 << 0)) == 0) {
		// No - stop here
		clearFilaments();
		return;
	}

	// Yes - fetch the filelist for the current directory and proceed
	stopUpdates();

	$.ajax(ajaxPrefix + "rr_filelist?dir=0:/filaments", {
		dataType: "json",
		success: function(response) {
			if (isConnected) {
				if (response.hasOwnProperty("err")) {
					// don't proceed if the firmware has reported an error
					filamentsExist = false;
					$("#page_filaments h1").text(T("Failed to retrieve Filaments"));
				} else {
					var files = response.files, filamentsAdded = 0;
					for(var i = 0; i < files.length; i++) {
						if (files[i].type == 'd') {
							var dateCreated = files[i].hasOwnProperty("date") ? strToTime(files[i].date) : undefined;
							addFilament(files[i].name, dateCreated);
							filamentsAdded++;
						}
					}

					if (filamentsAdded == 0) {
						$("#page_filaments h1").text(T("No Filaments found"));
					} else {
						sortTable($("#table_filaments"));
					}

					if (currentPage == "filaments") {
						$(".span-refresh-filaments").removeClass("hidden");
					}
					filamentsLoaded = true;
					filamentsExist = true;
				}

				startUpdates();
			}
		}
	});
}

function addFilament(name, dateCreated) {
	$("#page_filaments h1").addClass("hidden");
	$("#table_filaments").removeClass("hidden");

	var dateCreatedValue = (dateCreated == undefined) ? 0 : dateCreated.getTime();
	var row =	'<tr data-filament="' + name + '" data-date-created="' + dateCreatedValue + '">';
	row +=		'<td><input type="checkbox"></td>';
	row +=		'<td><a href="#" class="a-filament"><span class="glyphicon glyphicon-cd"></span> ' + name + '</a></td>';
	row +=		'<td>' + ((dateCreated == undefined) ? T("unknown") : dateCreated.toLocaleString()) + '</td>';
	row +=		'</tr>';
	$("#table_filaments > tbody").append(row);
}

function clearFilaments() {
	filamentsLoaded = false;
	filamentsExist = false;

	$("#table_filaments > thead input[type='checkbox']:first-child").prop("checked", false);
	$("#table_filaments > tbody").children().remove();
	$("#table_filaments").addClass("hidden");
	$("#page_filaments h1").removeClass("hidden");
	if (isConnected) {
		if ((mountedVolumes & (1 << 0)) == 0) {
			$("#page_filaments h1").text(T("The first volume is not mounted"));
		} else {
			$("#page_filaments h1").text(T("loading"));
		}
	} else {
		$("#page_filaments h1").text(T("Connect to your Duet to display Filaments"));
	}
}

$("#table_filaments > tbody").on("click", ".a-filament", function(e) {
	e.preventDefault();
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

	var lastModifiedValue = (lastModified == undefined) ? 0 : lastModified.getTime();
	var row =	'<tr data-file="' + filename + '" data-size="' + size + '" data-last-modified="' + lastModifiedValue + '">';
	row +=		'<td><input type="checkbox"></td>';
	row +=		'<td><a href="#"><span class="glyphicon glyphicon-file"></span> ' + filename + '</a></td>';
	row +=		'<td>' + formatSize(size) + '</td>';
	row +=		'<td>' + ((lastModified == undefined) ? T("unknown") : lastModified.toLocaleString()) + '</td>';
	row +=		'</tr>';
	$("#table_sys_files > tbody").append(row);
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
					var files = response.files, filesAdded = 0;
					for(var i = 0; i < files.length; i++) {
						if (files[i].type != 'd') {
							var lastModified = files[i].hasOwnProperty("date") ? strToTime(files[i].date) : undefined;
							addSysFile(files[i].name, files[i].size, lastModified);
							filesAdded++;
						}
					}

					if (filesAdded == 0) {
						$("#page_sysedit h1").text(T("No System Files found"));
					} else {
						sortTable($("#table_sys_files"));
					}

					$("#a_refresh_sys").removeClass("hidden");
					sysLoaded = true;
				}

				startUpdates();
			}
		}
	});
}

$("#table_sys_files").on("click", "tbody a", function(e) {
	var row = $(this).closest("tr");
	var file = row.data("file");
	if (file.match("\.g$") != null) {
		// Edit .g files
		editFile(getFilePath() + "/" + file, true, row.data("size"));
	} else if (file.match("\.csv$") != null) {
		// Treat .csv files as heightmaps or open them in the editor if their header doesn't match
		getHeightmap(getFilePath() + "/" + file);
	} else {
		// Download every other file
		var elem = $('<a target="_blank" href="' + ajaxPrefix + 'rr_download?name=' + encodeURIComponent(getFilePath() + "/" + file) + '" download="' + file + '"></a>');
		elem.appendTo("body");
		elem[0].click();
		elem.remove();
	}
	e.preventDefault();
});


/* Drag & Drop */

var draggingObjects, dragImage;

function fileDragStart(e) {
	// Work out which elements shall be dragged
	draggingObjects = $(this);
	if ($(this).find("input[type='checkbox']").prop("checked")) {
		draggingObjects = $(this).closest("tbody").find("input[type='checkbox']:checked").parents("tr");
	}

	// Set an alternative drag image
	if (typeof e.dataTransfer.setDragImage === "function") {
		dragImage = draggingObjects.closest("table").clone();
		dragImage.children("thead").remove();

		if (draggingObjects.length == 1) {
			var file = draggingObjects.data("file");
			if (file != undefined) {
				dragImage.find('tr[data-file!="' + file + '"]').remove();
			} else {
				var directory = draggingObjects.data("directory");
				dragImage.find('tr[data-directory!="' + directory + '"]').remove();
			}
		} else {
			dragImage.find("input[type='checkbox']:not(:checked)").parents("tr").remove();
		}

		$(document.body).css("overflow", "none");
		dragImage.css({
			"top": (e.pageY - e.offsetY) + "px",
			"left": (e.pageX - e.offsetX) + "px",
			"opacity": 0.5,
			"position": "absolute",
			"pointerEvents": "none",
			"width": draggingObjects.closest("table").width()
		}).appendTo(document.body);

		e.dataTransfer.setDragImage(dragImage[0], e.offsetX, e.offsetY);
		setTimeout(function() {
			dragImage.remove();
			$(document.body).css("overflow", "");
		});
	}

	dobjs = draggingObjects;
	ev = e;
}

function fileDragEnd(e) {
	draggingObjects = undefined;
}

$(".table-files").on("dragover", "tr", function(e) {
	var row = $(e.target).closest("tr");
	if (draggingObjects != undefined && row != undefined) {
		var dir = row.data("directory");
		if (dir != undefined) {
			for(var i = 0; i < draggingObjects.length; i++) {
				if (dir == draggingObjects.eq(i).data("directory")) {
					return;
				}
			}

			e.stopPropagation();
			e.preventDefault();
		}
	}
});

$(".table-files").on("drop", "tr", function(e) {
	if (draggingObjects == undefined) {
		return;
	}

	var directory = $(e.target).closest("tr").data("directory");
	for(var i = 0; i < draggingObjects.length; i++) {
		var sourcePath = draggingObjects.eq(i).data("file");
		if (sourcePath == undefined) {
			sourcePath = draggingObjects.eq(i).data("directory");
		}

		var targetPath;
		if (currentPage == "files") {
			targetPath = currentGCodeDirectory + "/" + directory + "/" + sourcePath;
			sourcePath = currentGCodeDirectory + "/" + sourcePath;

			clearFileCache(sourcePath);
			clearFileCache(targetPath);
		} else {
			targetPath = currentMacroDirectory + "/" + directory + "/" + sourcePath;
			sourcePath = currentMacroDirectory + "/" + sourcePath;
		}

		moveFile(sourcePath, targetPath, undefined, undefined, draggingObjects.eq(i));
	}

	e.stopPropagation();
	e.preventDefault();
});

$("#ol_gcode_directory, #ol_macro_directory").on("dragover", "a", function(e) {
	if (draggingObjects != undefined) {
		e.stopPropagation();
		e.preventDefault();
	}
});

$("#ol_gcode_directory, #ol_macro_directory").on("drop", "a", function(e) {
	if (draggingObjects == undefined) {
		return;
	}

	var directory = $(e.target).data("directory");
	for(var i = 0; i < draggingObjects.length; i++) {
		var sourcePath = draggingObjects.eq(i).data("file");
		if (sourcePath == undefined) {
			sourcePath = draggingObjects.eq(i).data("directory");
		}

		var targetPath;
		if (currentPage == "files") {
			targetPath = directory + "/" + sourcePath;
			sourcePath = currentGCodeDirectory + "/" + sourcePath;

			clearFileCache(sourcePath);
			clearFileCache(targetPath);
		} else {
			targetPath = directory + "/" + sourcePath;
			sourcePath = currentMacroDirectory + "/" + sourcePath;
		}

		moveFile(sourcePath, targetPath, undefined, undefined, draggingObjects.eq(i));
	}
});


/* List Item Events */

$(".table-files > thead input[type='checkbox']:first-child").change(function(e) {
	$(this).closest("table").find("tbody > tr > td:first-child > input[type='checkbox']").prop("checked", $(this).prop("checked")).trigger("change");
});

$(".table-files").on("change", "td:first-child > input[type='checkbox']", function() {
	$(this).closest("tr").toggleClass("info", $(this).prop("checked"));
});

$(".table-files").on("click", "tr", function(e) {
	if ($(e.target).is("td")) {
		var row = $(e.target).closest("tr");
		var checkbox = row.find('input[type="checkbox"]');
		if (checkbox.length > 0) {
			// Toggle state of checkbox if available
			checkbox.prop("checked", !checkbox.prop("checked")).trigger("change");
		}
	}
});

$(".table-files").on("contextmenu", "tr", function(e) {
	if ($(e.target).closest("tbody").length > 0) {
		showContextMenu($(e.target).closest("tr"), e.clientX, e.clientY);
		e.stopPropagation();
	}
	e.preventDefault();
});

$(".table-files").on("dblclick", "tr", function(e) {
	if ($(e.target).is("td")) {
		var row = $(e.target).closest("tr");
		var link = row.find("a");
		if (link.length > 0) {
			// Simulate click on link when the row is double-clicked
			link.trigger("click");
		}
	}
});


/* Table Headers */

function loadTableSorting() {
	var tableSorting = localStorage.getItem("tableSorting");
	if (tableSorting != null) {
		tableSorting = JSON.parse(tableSorting);

		for(var tableId in tableSorting) {
			var tableHeader = $("#" + tableId).children("thead");
			tableHeader.find("span").removeClass("glyphicon").removeClass("glyphicon-sort-by-alphabet").removeClass("glyphicon glyphicon-sort-by-alphabet-alt");

			var link = tableHeader.find("a[data-attribute='" + tableSorting[tableId].column + "']");
			link.parent().find("span").addClass("glyphicon").addClass(tableSorting[tableId].ascending ? "glyphicon-sort-by-alphabet" : "glyphicon-sort-by-alphabet-alt");
		}
	}
}

$(".table-files > thead a").click(function(e) {
	// Determine in which way the column needs to be sorted
	var span = $(this).closest("th").children("span");
	var sortAscending = !span.hasClass("glyphicon-sort-by-alphabet");
	$(this).closest("tr").find("span").removeClass("glyphicon").removeClass("glyphicon-sort-by-alphabet").removeClass("glyphicon glyphicon-sort-by-alphabet-alt");
	if (sortAscending) {
		span.addClass("glyphicon").addClass("glyphicon-sort-by-alphabet");
	} else {
		span.addClass("glyphicon").addClass("glyphicon glyphicon-sort-by-alphabet-alt");
	}

	// Do the actual sorting
	sortTable($(this).closest("table"));

	// Make sure we remember the last sorting order
	var tableSorting = localStorage.getItem("tableSorting");
	if (tableSorting == null) {
		tableSorting = {};
	} else {
		tableSorting = JSON.parse(tableSorting);
	}
	tableSorting[$(this).closest("table").prop("id")] = { column: $(this).data("attribute"), ascending: sortAscending };
	localStorage.setItem("tableSorting", JSON.stringify(tableSorting));

	$(this).blur();
	e.preventDefault();
});

function sortTable(table) {
	var sortingSpan = table.children("thead").find("span.glyphicon");
	var attribute = sortingSpan.parent().children("a").data("attribute");
	var ascending = sortingSpan.hasClass("glyphicon-sort-by-alphabet");

	var rows = table.children("tbody").children().detach();
	if (table.prop("id") == "table_filaments") {
		sortTableArray(rows, attribute, ascending);
	} else {
		var directories = rows.filter("[data-directory]");
		var files = rows.filter("[data-file]");

		sortTableArray(directories, (attribute == "filename") ? "directory" : attribute, ascending);
		sortTableArray(files, (attribute == "filename") ? "file" : attribute, ascending);

		rows = [];
		$.each(directories, function() { rows.push(this); });
		$.each(files, function() { rows.push(this); });
	}

	var body = table.children("tbody");
	$.each(rows, function() {
		$(this).appendTo(body);
	});
}

function sortTableArray(array, attribute, ascending) {
	array.sort(function(a, b) {
		var aVal = $(a).data(attribute), bVal = $(b).data(attribute);
		if (aVal == undefined && bVal == undefined) {
			return 0;
		}
		if (aVal == undefined && bVal != undefined) {
			return (ascending) ? -1 : 1;
		}
		if (aVal != undefined && bVal == undefined) {
			return (ascending) ? 1 : -1;
		}

		var result = (ascending) ? (aVal - bVal) : (bVal - aVal);
		if (isNaN(result)) {
			aVal = aVal.toString();
			bVal = bVal.toString();
			if (ascending) {
				return aVal.toLowerCase().localeCompare(bVal.toLowerCase());
			}
			return bVal.toLowerCase().localeCompare(aVal.toLowerCase());
		}
		return result;
	});
}


/* Context Menu */

var contextMenuShown = false, contextMenuTargets;

function hideContextMenu() {
	if (contextMenuShown) {
		$("#ul_file_contextmenu").hide();

		contextMenuTargets.closest("tbody").children("tr").removeClass("info");
		contextMenuTargets.closest("tbody").find("input[type='checkbox']:checked").parents("tr").addClass("info");
		contextMenuShown = false;
	}
}

function showContextMenu(target, x, y) {
	// Context menu isn't available on the Scans page (yet)
	if (currentPage == "scanner") {
		return;
	}

	// Hide context menu if it is already shown
	if (contextMenuShown) {
		hideContextMenu();
	}

	// Apply color to selected items
	contextMenuTargets = target;
	if (target.find("input[type='checkbox']").prop("checked")) {
		contextMenuTargets = target.closest("tbody").find("input[type='checkbox']:checked").parents("tr");
	} else {
		target.closest("tbody").children("tr").removeClass("info");
	}
	contextMenuTargets.addClass("info");

	// Decide which actions can be shown
	var contextMenu = $("#ul_file_contextmenu");
	contextMenu.children().removeClass("hidden");
	if (contextMenuTargets.length > 1) { contextMenu.children(".single").addClass("hidden"); }
	if (contextMenuTargets.length < 2) { contextMenu.children(".multi").addClass("hidden"); }
	if (contextMenuTargets.filter("[data-directory], [data-filament]").length > 0) { contextMenu.children(".file").addClass("hidden"); }
	if (contextMenuTargets.filter("[data-file]").length > 0) { contextMenu.children(".directory").addClass("hidden"); }
	if (contextMenuTargets.filter("[data-file$='.csv']").length == 0) { $("#a_context_view_heightmap").closest("li").addClass("hidden"); }
	if (currentPage != "files") { contextMenu.children(".gcode-action").addClass("hidden"); }
	if (currentPage != "macros") { contextMenu.children(".macro-action").addClass("hidden"); }
	if (currentPage != "filaments") { contextMenu.children(".filament-action").addClass("hidden"); }

	// Take care of the divider visibility
	var items = $("#ul_file_contextmenu").children();
	var isPrecededByAction = false;
	for(var i = 0; i < items.length; i++) {
		var item = items.eq(i);
		if (item.hasClass("divider")) {
			item.toggleClass("hidden", !isPrecededByAction);
			isPrecededByAction = false;
		} else {
			isPrecededByAction |= !item.hasClass("hidden");
		}
	}

	// Show it
	contextMenu.css({
		left: getMenuPosition(x, "width", "scrollLeft"),
		top: getMenuPosition(y, "height", "scrollTop")
	}).show();
	contextMenuShown = true;
}

function getMenuPosition(mouse, direction, scrollDir) {
	var win = $(window)[direction](),
		scroll = $(window)[scrollDir](),
		menu = $(settings.menuSelector)[direction](),
		position = mouse + scroll;

	// opening menu would pass the side of the page
	if (mouse + menu > win && menu < mouse) {
		position -= menu;
	}

	return position;
}

$("body").click(hideContextMenu).contextmenu(hideContextMenu);


/* Context Menu Actions */

$("#a_context_print").click(function(e) {
	var file = contextMenuTargets.data("file");
	waitingForPrintStart = true;
	if (currentGCodeVolume != 0) {
		sendGCode("M32 " + currentGCodeDirectory + "/" + file);
	} else if (currentGCodeDirectory == "0:/gcodes") {
		sendGCode("M32 " + file);
	} else {
		sendGCode("M32 " + currentGCodeDirectory.substring(10) + "/" + file);
	}
	e.preventDefault();
});

$("#a_context_simulate").click(function(e) {
	var file = contextMenuTargets.data("file");
	waitingForPrintStart = true;
	if (currentGCodeVolume != 0) {
		sendGCode('M37 P"' + currentGCodeDirectory + "/" + file + '"');
	} else if (currentGCodeDirectory == "0:/gcodes" + '"') {
		sendGCode('M37 P"' + file);
	} else {
		sendGCode('M37 P"' + currentGCodeDirectory.substring(10) + "/" + file + '"');
	}
	e.preventDefault();
});

$("#a_context_run").click(function(e) {
	var file = contextMenuTargets.data("file");
	sendGCode("M98 P" + currentMacroDirectory + "/" + file);
	e.preventDefault();
});

$("#a_context_edit_load").click(function(e) {
	var filament = contextMenuTargets.data("filament");
	editFile("0:/filaments/" + filament + "/load.g", false);
	e.preventDefault();
});

$("#a_context_edit_unload").click(function(e) {
	var filament = contextMenuTargets.data("filament");
	editFile("0:/filaments/" + filament + "/unload.g", false);
	e.preventDefault();
});

$("#a_context_view_heightmap").click(function(e) {
	getHeightmap(getFilePath() + "/" + contextMenuTargets.data("file"));
	e.preventDefault();
});

$("#a_context_download_file").click(function(e) {
	var filename = contextMenuTargets.data("file");
	var filepath = getFilePath() + "/" + filename;

	// Should use a button link instead, but for some reason it isn't properly displayed with latest Bootstrap 3.3.7
	var elem = $('<a target="_blank" href="' + ajaxPrefix + 'rr_download?name=' + encodeURIComponent(filepath) + '" download="' + filename + '"></a>');
	elem.appendTo("body");
	elem[0].click();
	elem.remove();

	e.preventDefault();
});

$("#a_context_download_zip").click(function(e) {
	if (doingFileTask) {
		showMessage("warning", T("Download as ZIP"), T("Please wait until the pending operations have finished before you download more files"));
	} else {
		downloadNotification = showDownloadMessage();
		zipFile = new JSZip();

		var fileIndex = 1;
		$.each(contextMenuTargets, function() {
			var row = $(this);
			multiFileOperations.push({
				action: "download_zip",
				filename: row.data("file"),
				path: getFilePath() + "/" + row.data("file"),
				progress: fileIndex / contextMenuTargets.length * 100
			});
			fileIndex++;
		});
		doFileTask();
	}
	e.preventDefault();
});

$("#a_context_edit").click(function(e) {
	editFile(getFilePath() + "/" + contextMenuTargets.data("file"), true, contextMenuTargets.data("size"));
	e.preventDefault();
});

$("#a_context_rename").click(function(e) {
	var oldFileName = contextMenuTargets.data("file");
	if (oldFileName == undefined) {
		oldFileName = contextMenuTargets.data("directory");
	}
	if (oldFileName == undefined) {
		oldFileName = contextMenuTargets.data("filament");
	}

	showTextInput(T("Rename File or Directory"), T("Please enter a new name:"), function(newFileName) {
		// Try to move that file
		var filePath = getFilePath();
		$.ajax(ajaxPrefix + "rr_move?old=" + encodeURIComponent(filePath + "/" + oldFileName) + "&new=" + encodeURIComponent(filePath + "/" + newFileName), {
			dataType: "json",
			success: function(response) {
				if (response.err == 0) {
					if (currentPage == "scans") {
						updateScanFiles();
					} else if (currentPage == "files") {
						clearFileCache(filePath + "/" + oldFileName);

						gcodeUpdateIndex = -1;
						updateGCodeFiles();
					} else if (currentPage == "macros") {
						updateMacroFiles();
					} else if (currentPage == "filaments") {
						updateFilaments();
					} else {
						updateSysFiles();
					}
				}
				// else an error is reported via rr_reply
			}
		});
	}, oldFileName);
	e.preventDefault();
});

$("#a_context_delete").click(function(e) {
	if (contextMenuTargets.length == 1) {
		var file = contextMenuTargets.data("file");
		if (file != undefined) {
			// Delete single file
			showConfirmationDialog(T("Delete File"), T("Are you sure you want to delete <strong>{0}</strong>?", file), function() {
				deletePath(file, contextMenuTargets);
			});
		} else {
			// Delete single directory
			var directory = contextMenuTargets.data("directory");
			if (directory != undefined) {
				deletePath(directory, contextMenuTargets);
			} else {
				// Delete single filament
				var filament = contextMenuTargets.data("filament");
				showConfirmationDialog(T("Delete Filament"), T("Are you sure you want to delete <strong>{0}</strong>?", filament), function() {
					deleteFilament(filament, contextMenuTargets);
				});
			}
		}
	} else {
		// Delete multiple items
		showConfirmationDialog(T("Delete multiple Items"), T("Are you sure you want to delete the selected items?"), function() {
			$.each(contextMenuTargets, function() {
				var row = $(this);

				var file = row.data("file");
				if (file != undefined) {
					deletePath(file, row);
				} else {
					var directory = row.data("directory");
					if (directory != undefined) {
						deletePath(directory, row);
					} else {
						var filament = row.data("filament");
						deleteFilament(filament, row);
					}
				}
			});
		});
	}
	e.preventDefault();
});


/* Common functions */

function deleteFilament(filament, elementToRemove) {
	multiFileOperations.push({
		action: "delete",
		elementToRemove: elementToRemove,
		filament: filament,
		type: "filament"
	});
	doFileTask();
}

function deletePath(filename, elementToRemove, type) {
	multiFileOperations.push({
		action: "delete",
		elementToRemove: elementToRemove,
		path: getFilePath() + "/" + filename,
		type: type
	});
	doFileTask();
}

function doFileTask() {
	if (doingFileTask || !isConnected) {
		return;
	}

	doingFileTask = (multiFileOperations.length > 0);
	if (doingFileTask) {
		var task = multiFileOperations.shift();
		if (task.action == "delete") {
			if (task.type == "filament") {
				$.ajax(ajaxPrefix + "rr_filelist?dir=" + encodeURIComponent("0:/filaments/" + task.filament), {
					dataType: "json",
					success: function(response) {
						if (isConnected) {
							if (response.hasOwnProperty("err")) {
								showMessage("warning", T("Warning"), T("Could not delete filament {0}", task.filament));
							} else {
								for(var i = 0; i < response.files.length; i++) {
									$.ajax(ajaxPrefix + "rr_delete?name=" + encodeURIComponent("0:/filaments/" + task.filament + "/" + response.files[i].name));
								}

								$.ajax(ajaxPrefix + "rr_delete?name=" + encodeURIComponent("0:/filaments/" + task.filament), {
									dataType: "json",
									success: function(response) {
										if (response.err == 0) {
											task.elementToRemove.remove();
											updateFilesConditionally();
										}
									}
								});
							}
						}
					}
				});
			} else {
				$.ajax(ajaxPrefix + "rr_delete?name=" + encodeURIComponent(task.path), {
					dataType: "json",
					success: function(response) {
						if (response.err == 0) {
							task.elementToRemove.remove()
							updateFilesConditionally();
						} else if (task.type == "file") {
							showMessage("warning", T("Deletion failed"), T("<strong>Warning:</strong> Could not delete file <strong>{0}</strong>!", file));
						} else if (task.type == "directory") {
							showMessage("warning", T("Deletion failed"), T("<strong>Warning:</strong> Could not delete directory <strong>{0}</strong>!<br/><br/>Perhaps it isn't empty?", directory));
						} else {

						}

						doingFileTask = false;
						doFileTask();
					}
				});
			}
		} else if (task.action == "move") {
			if (task.from == undefined || task.from.toUpperCase() == task.to.toUpperCase()) {
				// No need to rename the file or directory
				if (task.onSuccess != undefined) {
					task.onSuccess();
				}

				doingFileTask = false;
				doFileTask();
			} else {
				// File names are different, so attempt to move the old path to the new one
				$.ajax(ajaxPrefix + "rr_move?old=" + encodeURIComponent(task.from) + "&new=" + encodeURIComponent(task.to), {
					dataType: "json",
					success: function(response) {
						if (response.err == 0) {
							// If that succeeds, return to the callback
							if (task.onSuccess != undefined) {
								task.onSuccess();
							}

							// Check if we need to remove an element
							if (task.elementToRemove != undefined) {
								task.elementToRemove.remove();
								updateFilesConditionally();
							}
						} else {
							// Could not rename the file, so delete it first. Once done, call this method again
							$.ajax(ajaxPrefix + "rr_delete?name=" + encodeURIComponent(task.to), {
								dataType: "json",
								success: function(response) {
									if (response.err == 0) {
										// File delete succeeded, attempt to rename the file once again
										moveFile(task.from, task.to, task.onSuccess, task.onError);
									} else if (task.onError != undefined) {
										// Didn't work? Should never happen
										task.onError();
									}
								}
							});
						}

						doingFileTask = false;
						doFileTask();
					}
				});
			}
		} else if (task.action == "download_zip") {
			// JQuery cannot retrieve binary data, use plain JS instead
			var xhr = new XMLHttpRequest();
			xhr.onreadystatechange = function() {
				if (isConnected && zipFile != undefined) {
					if (this.readyState == 4) {
						if (this.status == 200) {
							// Add incoming file blob
							zipFile.file(task.filename, this.response);
							downloadNotification.update("progress", task.progress);

							// See if we're done
							if (multiFileOperations.length == 0 || multiFileOperations[0].action != "download_zip") {
								if (JSZip.support.blob) {
									// Download as blob
									zipFile.generateAsync({ type: "blob" }).then(function (blob) {
										downloadNotification.close();
										downloadNotification = undefined;
										zipFile = undefined;

										saveAs(blob, "download.zip");
									});
								} else {
									// Download via data URI
									zipFile.generateAsync({ type: "base64" }).then(function (base64) {
										downloadNotification.close();
										downloadNotification = undefined;
										zipFile = undefined;

										window.location = "data:application/zip;base64," + base64;
									});
								}
							}
						}

						doingFileTask = false;
						doFileTask();
					}
				}
			}
			xhr.open('GET', ajaxPrefix + "rr_download?name=" + encodeURIComponent(task.path));
			xhr.responseType = 'arraybuffer';
			xhr.send();
		}
	}
}

var editFileNotification = undefined;
function editFile(file, mustExist, size) {
	if (size != undefined && size > 1000000) {
		editFileNotification = showMessage("info", T("Downloading File"), T("This file is quite big. It may take a while before it is fully loaded..."), 0);
	}
	if (mustExist == undefined) { mustExist = true; }

	$.ajax(ajaxPrefix + "rr_download?name=" + encodeURIComponent(file), {
		dataType: "text",
		global: mustExist,
		error: mustExist ? undefined : function(jqXHR, textStatus, errorThrown) {
			if (editFileNotification != undefined) {
				editFileNotification.close();
				editFileNotification = undefined;
			}

			showEditDialog(file, "", function(value) {
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
		},
		success: function(response) {
			if (editFileNotification != undefined) {
				editFileNotification.close();
				editFileNotification = undefined;
			}

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
		},
		timeout: 0
	});
}

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

	if (currentPage == "filaments") {
		return "0:/filaments";
	}

	return "0:/sys";
}

function moveFile(from, to, onSuccess, onError, elementToRemove) {
	multiFileOperations.push({
		action: "move",
		from: from,
		to: to,
		onSuccess: onSuccess,
		onError: onError,
		elementToRemove: elementToRemove
	});
	doFileTask();
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

	//updateFilaments();

	//updateSysFiles();

	multiFileOperations = [];
	doingFileTask = false;

	downloadNotification = undefined;
	targetZipName = undefined;
	zipFile = undefined;
}

function updateFilesConditionally() {
	if (currentPage == "scanner") {
		if ($("#table_scan_files > tbody").children().length == 0) {
			updateScanFiles();
		}
	} else if (currentPage == "files") {
		if ($("#table_gcode_files > tbody").children().length == 0) {
			gcodeUpdateIndex = -1;
			updateGCodeFiles();
		}
	} else if (currentPage == "macros") {
		if ($("#table_macro_files > tbody").children().length == 0) {
			updateMacroFiles();
		}
	} else if (currentPage == "settings") {
		if ($("#table_sys_files > tbody").children().length == 0) {
			updateSysFiles();
		}
	}
}
