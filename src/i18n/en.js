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
			// FIXME replace generic with better alternatives
			generic: {
				caption: 'Upload Files',
				title: 'Upload one or more files to the /sys or /www directory (drag&drop is supported as well)'
			},
			gcode: {
				caption: 'Upload G-Code(s)',
				title: 'Upload one or more G-Code files (drag&drop is supported as well)'
			},
			macro: {
				caption: 'Upload Macro(s)',
				title: 'Upload one or more macro files (drag&drop is supported as well)'
			},
			start: {
				caption: 'Upload & Start',
				title: 'Upload & Start one or more G-Code files (drag&drop is supported as well)'
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
	errors: {
		invalidPassword: 'Invalid password!',
		noFreeSession: 'No more free sessions!'
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
	panel: {
		status: {
			caption: 'Status',
			toolPosition: 'Tool Position',
			machinePosition: 'Machine Position',
			extruders: 'Extruder Drives',
			extruderDrive: 'Drive {0}',
			sensors: 'Sensors'
		}
	}
}
