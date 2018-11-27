export default {
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
			filanent: {
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
		invalidPassword: 'Invalid password!',
		noFreeSession: 'No more free sessions!',
		uploadStartWrongFileCount: 'Only a single file can be uploaded & started'
	},
	generic: {
		novalue: 'n/a'
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
			sensors: 'Sensors'
		}
	}
}
