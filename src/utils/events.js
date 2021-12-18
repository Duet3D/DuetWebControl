'use strict'

// Enumeration of the available global events
//
// All these event types are emitted on the Vue root instance.
// These events are restricted to cases where Vuex cannot be used
// or where subscription hooks to the Vuex store would be required.

export default {
	// Machine has been added
	// Payload: machine
	machineAdded: 'machineAdded',

	// Machine has been removed
	// Payload: machine
	machineRemoved: 'machineRemoved',

	// Machine model has been updated
	// Payload: machine
	machineModelUpdated: 'machineModelUpdated',

	// G/M/T-code has been executed
	// Payload: { machine, code, reply }
	codeExecuted: 'codeExecuted',

	// Files or directories have been changed
	// Payload: { machine, files: [ file1, ... ] }
	filesOrDirectoriesChanged: 'filesOrDirectoriesChanged',

	// Single file is being uploaded
	// Payload: { machine, filename, content, showProgress, showSuccess, showError, cancellationToken }
	fileUploading: 'fileUploading',

	// Multiple files are being uploaded
	// Payload: { machine, files: [{ filename, content, startTime, progress, speed, error }, ...], showProgress, closeProgressOnSuccess, cancellationToken }
	multipleFilesUploading: 'multipleFilesUploading',

	// File has been uploaded
	// Payload: { machine, filename, content, num, count }
	fileUploaded: 'fileUploaded',

	// File could not be uploaded
	// Payload: { machine, filename, content, error }
	fileUploadError: 'fileUploadError',

	// File or directory has been moved
	// Payload: { machine, from, to, force }
	fileOrDirectoryMoved: 'fileOrDirectoryMoved',

	// Directory has been created
	// Payload: { machine, directory }
	directoryCreated: 'directoryCreated',

	// File has been deleted
	// Payload: { machine, file }
	fileOrDirectoryDeleted: 'fileOrDirectoryDeleted',

	// Single file is being downloaded
	// Payload: { machine, filename, type, showProgress, showSuccess, showError, cancellationToken }
	fileDownloading: 'fileDownloading',

	// Multiple files are being downloaded
	// Payload: { machine, files: [{ filename, type, startTime, size, progress, speed, error }, ...], showProgress, closeProgressOnSuccess, cancellationToken }
	multipleFilesDownloading: 'multipleFilesDownloading',

	// File has been downloaded
	// Payload: { machine, filename, response, type, showProgress, showSuccess, showError, num, count }
	fileDownloaded: 'fileDownloaded',

	// File could not be downloaded
	// Payload: { machine, filename, type, error }
	fileDownloadError: 'fileDownloadError',

	// Request plugin to be installed (shows plugin wizard)
	// Payload: { machine, zipFilename, zipBlob, zipFile, start }
	installPlugin: 'installPlugin'
}
