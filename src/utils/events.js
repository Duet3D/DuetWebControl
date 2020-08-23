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

	// Machine has been renamed (e.g. connected to DUET3 but the hostname was updated to duet3)
	// Payload: { from, to }
	machineRenamed: 'machineRenamed',

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

	// File has been uploaded
	// Payload: { machine, filename, content, showProgress, showSuccess, showError, num, count }
	fileUploaded: 'fileUploaded',

	// File or directory has been moved
	// Payload: { machine, from, to, force }
	fileOrDirectoryMoved: 'fileOrDirectoryMoved',

	// Directory has been created
	// Payload: { machine, directory }
	directoryCreated: 'directoryCreated',

	// File has been deleted
	// Payload: { machine, file }
	fileOrDirectoryDeleted: 'fileOrDirectoryDeleted',

	// File has been downloaded
	// Payload: { machine, filename, response, type, showProgress, showSuccess, showError, num, count }
	fileDownloaded: 'fileDownloaded'
}
