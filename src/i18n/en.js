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
		compensation: {
			caption: 'Auto Bed Compensation',
			captionDelta: 'Auto Delta Calibration',
			title: 'Perform automatic bed compensation (G32)',
			titleDelta: 'Perform automatic delta compensation (G32)'
		},
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
		home: {
			caption: 'Home {0}',
			captionAll: 'Home All',
			title: 'Home the {0} axis (G28 {0})',
			titleAll: 'Home all axes (G28)'
		},
		upload: {
			gcodes: {
				caption: 'Upload G-Code File(s)',
				title: 'Upload one or more G-Code files (drag&drop is supported as well)'
			},
			start: {
				caption: 'Upload & Start',
				title: 'Upload & Start one or more G-Code files (drag&drop is supported as well)'
			},
			macros: {
				caption: 'Upload Macro File(s)',
				title: 'Upload one or more macro files (drag&drop is supported as well)'
			},
			filaments: {
				caption: 'Upload Filament Configs',
				title: 'Upload one or more filament configurations (drag&drop is supported as well)'
			},
			sys: {
				caption: 'Upload System Files',
				title: 'Upload one or more system files (drag&drop is supported as well)'
			},
			www: {
				caption: 'Upload Web Files',
				title: 'Upload one or more web files (drag&drop is supported as well)'
			},
			update: {
				caption: 'Upload Update',
				title: 'Upload an update package (drag&drop is supported as well)'
			}
		}
	},
	chart: {
		temperature: {
			caption: 'Temperature Chart',
			heater: 'Heater {0}'
		}
	},
	dialog: {
		connect: {
			title: 'Connect to Machine',
			prompt: 'Please enter the hostname of the machine that you would like to connect to:',
			placeholder: 'Hostname',
			hostRequired: 'Hostname is required',
			connect: 'Connect'
		},
		filament: {
			titleChange: 'Change Filament',
			titleLoad: 'Load Filament',
			prompt: 'Please choose a filament:'
		},
		resetHeaterFault: {
			title: 'Reset Heater Fault',
			prompt: 'A heater fault has occurred on heater {0}. It is strongly advised to turn off your machine now and to check your wiring before you continue. If you are absolutely sure that this is not a phsical problem, you can reset the heater fault ON YOUR OWN RISK. Be aware that this is NOT RECOMMENDED and can lead to further problems. How would you like to proceed?',
			resetFault: 'Reset Fault'
		}
	},
	error: {
		notImplemented: '{0} is not implemented',
		invalidPassword: 'Invalid password!',
		noFreeSession: 'No more free sessions!',
		connectError: 'Failed to connect to {0}',
		disconnectError: 'Could not disconnect cleanly from {0}',
		disconnectedError: 'Could not complete action because the connection has been terminated',
		invalidHeightmap: 'Invalid Height Map',
		timeoutError: 'HTTP request timed out',
		cancelled: 'Operation has been cancelled',
		operationFailed: 'Operation failed (Reason: {0})',
		uploadStartWrongFileCount: 'Only a single file can be uploaded & started',
		codeResponseError: 'Could not run code because a bad response has been received',
		codeBufferError: 'Could run code because the buffer space has been exhausted',
		enterValidNumber: 'Please enter a valid number',
		turnOffEverythingFailed: 'Failed to turn everything off',
		statusUpdateFailed: 'Failed to get status update for {0}',
		filelistRequestFailed: 'Failed to get file list',
		fileinfoRequestFailed: 'Failed to get file info'
	},
	generic: {
		ok: 'OK',
		cancel: 'Cancel',
		yes: 'Yes',
		no: 'No',
		close: 'Close',
		reset: 'Reset',
		novalue: 'n/a',
		loading: 'loading',
		error: 'Error',
		info: 'Info',
		warning: 'Warning',
		success: 'Success',
		heaterStates: [
			'off',
			'standby',
			'active',
			'fault',
			'tuning'
		],
		status: {
			updating: 'Updating',
			off: 'Off',
			halted: 'Halted',
			pausing: 'Pausing',
			paused: 'Paused',
			resuming: 'Resuming',
			printing: 'Printing',
			processing: 'Processing',
			simulating: 'Simulating',
			busy: 'Busy',
			changingTool: 'Changing Tool',
			idle: 'Idle',
			unknown: 'Unknown'
		},
		rpm: 'RPM'
	},
	input: {
		code: {
			send: 'Send',
			placeholder: 'Send Code...'
		}
	},
	list: {
		eventLog: {
			date: 'Date',
			type: 'Type',
			message: 'Event',
			noEvents: 'No Events',
			clear: 'Clear',
			downloadText: 'Download as Text',
			downloadCSV: 'Download as CSV'
		}
	},
	menu: {
		control: {
			caption: 'Machine Control',
			dashboard: 'Dashboard',
			console: 'G-Code Console',
			heightmap: 'Height Map'
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
		disconnected: 'Disconnected from {0}',
		download: {
			title: 'Downloading {0} @ {1}, {2}% complete',
			message: 'Please stand by while the file is being downloaded...',
			success: 'Download of {0} successful after {1}',
			error: 'Failed to download {0}'
		},
		message: 'Message',
		responseTooLong: 'Response too long, see Console',
		upload: {
			title: 'Uploading {0} @ {1}, {2}% complete',
			message: 'Please stand by while the file is being uploaded...',
			success: 'Upload of {0} successful after {1}',
			error: 'Failed to upload {0}'
		}
	},
	panel: {
		movement: {
			caption: 'Machine Movement',
			compensationInUse: 'Compensation in use: {0}',
			disableBedCompensation: 'Disable Bed Compensation (M561)',
			disableMeshCompensation: 'Disable Grid Compensation (G29 S2)',
			editMeshGrid: 'Define Area for Mesh Grid Compensation (M557)',
			runMeshGrid: 'Run Mesh Grid Compensation (G29)',
			loadMeshGrid: 'Load Saved Heightmap from SD Card (G29 S1)',
			axisNotHomed: 'The following axis is not homed:',
			axesNotHomed: 'The following axes are not homed:'
		},
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
			mcuTemp: 'MCU Temperature',
			mcuTempTitle: 'Minimum: {0}, Maximum: {1}',
			vIn: 'Vin',
			vInTitle: 'Minimum: {0}, Maximum {1}',
			probe: 'Z-Probe | Z-Probes'
		},
		tools: {
			caption: 'Tools',
			controlAll: 'Control All',
			turnEverythingOff: 'Turn Everything Off',
			tool: 'Tool {0}',
			loadFilament: 'Load Filament',
			changeFilament: 'Change Filament',
			unloadFilament: 'Unload Filament',
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
		}
	}
}
