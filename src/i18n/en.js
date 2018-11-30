export default {
	'$vuetify': {
		dataIterator: {
			rowsPerPageText: 'Items per page:',
			rowsPerPageAll: 'All',
			pageText: '{0}-{1} of {2}',
			noResultsText: 'No matching records found',
			nextPage: 'Next page',
			prevPage: 'Previous page'
		},
		dataTable: {
			rowsPerPageText: 'Rows per page:'
		},
		noDataText: 'No data available'
	},
	button: {
		connect: {
			connect: 'Connect',
			connecting: 'Connecting...',
			disconnect: 'Disconnect',
			disconnecting: 'Disconnecting...'
		},
		emergencyStop: {
			caption: 'Emergency Stop',
			title: 'Enforce an immediate software reset (M112+M999)'
		},
		upload: {
			gcode: {
				caption: 'Upload G-Code File(s)',
				title: 'Upload one or more G-Code files (drag&drop is supported as well)'
			},
			gcodeStart: {
				caption: 'Upload & Start',
				title: 'Upload & Start one or more G-Code files (drag&drop is supported as well)'
			},
			macro: {
				caption: 'Upload Macro File(s)',
				title: 'Upload one or more macro files (drag&drop is supported as well)'
			},
			filament: {
				caption: 'Upload Filament Configs',
				title: 'Upload one or more filament configurations (drag&drop is supported as well)'
			},
			sys: {
				caption: 'Upload System Files',
				title: 'Upload one or more system files (drag&drop is supported as well)'
			},
			update: {
				caption: 'Upload Update Package',
				title: 'Upload an update package (drag&drop is supported as well)'
			}
		}
	},
	dialog: {
		connect: {
			title: 'Connect to Machine',
			prompt: 'Please enter the hostname of the machine that you would like to connect to:',
			placeholder: 'Hostname',
			hostRequired: 'Hostname is required'
		}
	},
	error: {
		notImplemented: '{0} is not implemented',
		invalidPassword: 'Invalid password!',
		noFreeSession: 'No more free sessions!',
		uploadStartWrongFileCount: 'Only a single file can be uploaded & started',
		codeResponseError: 'Could not run code because a bad response has been received',
		codeBufferError: 'Could run code because the buffer space has been exhausted',
		codeDisconnectedError: 'Failed to wait for G-code because the connection has been terminated',
		enterValidNumber: 'Please enter a valid number',
		turnOffEverythingFailed: 'Failed to turn everything off'
	},
	generic: {
		error: 'Error',
		info: 'Info',
		novalue: 'n/a',
		warning: 'Warning',
		success: 'Success',
		heaterStates: [
			'off',
			'standby',
			'active',
			'fault',
			'tuning'
		]
	},
	input: {
		code: {
			send: 'Send',
			placeholder: 'Send Code...'
		}
	},
	menu: {
		control: {
			caption: 'Machine Control',
			dashboard: 'Dashboard',
			console: 'G-Code Console'
		},
		job: {
			caption: 'Current Job',
			status: 'Status',
			visualiser: 'Visualiser'
		},
		files: {
			caption: 'File Management',
			jobs: 'G-Code Jobs',
			filaments: 'Filaments',
			macros: 'Macros',
			system: 'System',
			web: 'Web'
		},
		settings: {
			caption: 'Settings',
			interface: 'User Interface',
			machine: 'Machine',
			update: 'Update'
		}
	},
	notification: {
		connected: 'Connected to {0}',
		connectFailed: 'Failed to connect to {0}',
		disconnected: 'Disconnected from {0}',
		disconnectFailed: 'Could not disconnect cleanly from {0}'
	},
	panel: {
		status: {
			caption: 'Status',
			mode: 'Mode: {0}',
			toolPosition: 'Tool Position',
			machinePosition: 'Machine Position',
			extruders: 'Extruder Drives',
			extruderDrive: 'Drive {0}',
			speeds: 'Speeds',
			requestedSpeed: 'Requested Speed',
			topSpeed: 'Top Speed',
			sensors: 'Sensors',
			probe: 'Z-Probe | Z-Probes'
		},
		tools: {
			caption: 'Tools',
			controlAll: 'Control All',
			turnEverythingOff: 'Turn Everything Off',
			tool: 'Tool {0}',
			loadFilament: 'Load Filament',
			heater: 'Heater {0}',
			current: 'Current',
			active: 'Active',
			standby: 'Standby',
			bed: 'Bed {0}',
			chamber: 'Chamber {0}',
			extra: {
				caption: 'Extra',
				sensor: 'Sensor',
				value: 'Value',
				showInChart: 'Show in Chart'
			}
		},
		tempChart: {
			caption: 'Temperature Chart'
		}
	},
	table: {
		eventLog: {
			date: 'Date',
			type: 'Type',
			message: 'Event',
			noEvents: 'No Events'
		}
	}
}
