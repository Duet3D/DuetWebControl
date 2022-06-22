'use strict'

import { version } from '../../package.json'
import { Dictionary, quickPatch } from '../utils/patch.js'

export class PluginManifest {
	constructor(initData) { quickPatch(this, initData); }
	id = ''											// Identifier of this plugin (max 32 chars). For DWC plugins, this is the Webpack chunk name too
	name = ''										// Name of the plugin (max 64 chars)
	author = ''										// Author of the plugin
	version = '1.0.0'								// Version of the plugin
	license = 'LGPL-3.0-or-later'					// License of the plugin. Should follow the SPDX format (see https://spdx.org/licenses/)
	homepage = null									// Link to the plugin homepage or source code repository
    tags = []                                       // List of user-defined tags for searching

	dwcVersion = version 							// Major/minor compatible DWC version. Mandatory for DWC plugins
	dwcDependencies = []							// List of DWC plugins this plugin depends on. Circular dependencies are not supported

	sbcRequired = false								// Set to true if a SBC is absolutely required for this plugin
	sbcDsfVersion = null							// Required DSF version for the plugin running on the SBC (ignored if there is no SBC executable)
	sbcData = new Dictionary()						// Object holding key value pairs of a plugin running on the SBC
	sbcExecutable = null							// Filename in the bin directory used to start the plugin
	sbcExecutableArguments = null					// Command-line arguments for the executable
	sbcExtraExecutables = []						// Optional list of additional executable filenames
	sbcOutputRedirected = true						// Defines if messages from stdout/stderr are output as generic messages
	sbcPermissions = []								// Permissions on the SBC. See also PluginPermissions
	sbcPackageDependencies = []						// List of packages this plugin depends on (apt packages in the case of DuetPi)
	sbcPythonDependencies = []						// List of Python packages this plugin depends on (pip)
	sbcPluginDependencies = []						// List of SBC plugins this plugin depends on. Circular dependencies are not supported

	rrfVersion = null								// Required RRF version

	check() {
		if (!this.id || this.id.trim() === '' || this.id.length > 32) {
			console.warn('Invalid plugin identifier');
			return false;
		}
		if (this.id.split('').some(c => !/[a-zA-Z0-9 .\-_]/.test(c))) {
			console.warn('Illegal plugin identifier');
			return false;
		}
		if (!this.name || this.name.trim() === '' || this.name.length > 64) {
			console.warn('Invalid plugin name');
			return false;
		}
		if (this.name.split('').some(c => !/[a-zA-Z0-9 .\-_]/.test(c))) {
			console.warn('Illegal plugin name');
			return false;
		}
		if (!this.author || this.author.trim() === '') {
			console.warn('Missing author');
			return false;
		}
		if (!this.version || this.version.trim() === '') {
			console.warn('Missing version');
			return false;
		}
		for (let i = 0; i < this.sbcPermissions.length; i++) {
			if (SbcPermission[this.sbcPermissions[i]] === undefined) {
				console.warn(`Unsupported SBC permission ${this.sbcPermissions[i]}`);
				return false;
			}
		}
		return true;
	}
}

export const SbcPermission = {
	// - DSF
	commandExecution: 'commandExecution',						// Execute generic commands
	codeInterceptionRead: 'codeInterceptionRead',				// Intercept codes but don't interact with them
	codeInterceptionReadWrite: 'codeInterceptionReadWrite',		// Intercept codes in a blocking way with options to resolve or cancel them
	managePlugins: 'managePlugins',								// Install, load, unload, and uninstall plugins
	manageUserSessions: 'manageUserSessions',					// Manage user sessions
	objectModelRead: 'objectModelRead',							// Read from the object model
	objectModelReadWrite: 'objectModelReadWrite',				// Read from and write to the object model
	registerHttpEndpoints: 'registerHttpEndpoints',				// Create new HTTP endpoints
	// - Virtual SD
	readFilaments: 'readFilaments',								// Read files from 0:/filaments
	writeFilaments: 'writeFilaments',							// Write files to 0:/filaments
	readFirmware: 'readFirmware',								// Read files from 0:/firmware
	writeFirmware: 'writeFirmware',								// Write files to 0:/firmware
	readGCodes: 'readGCodes',									// Read files from 0:/gcodes
	writeGCodes: 'writeGCodes',									// Write files to 0:/gcodes
	readMacros: 'readMacros',									// Read files from 0:/macros
	writeMacros: 'writeMacros',									// Write files to 0:/macros
	readMenu: 'readMenu',										// Read files from 0:/menu
	writeMenu: 'writeMenu',										// Write files to 0:/menu
	readSystem: 'readSystem',									// Read files from 0:/sys
	writeSystem: 'writeSystem',									// Write files to 0:/sys
	readWeb: 'readWeb',											// Read files from 0:/www
	writeWeb: 'writeWeb',										// Write files to 0:/www
	// - OS
	fileSystemAccess: 'fileSystemAccess',						// Access files outside the virtual SD directory (as DSF user)
	launchProcesses: 'launchProcesses',							// Launch new processes
	networkAccess: 'networkAccess',								// Communicate over the network
	webcamAccess: 'webcamAccess',								// Access webcam devices
	gpioAccess: 'gpioAccess',									// Access GPIO pins (includes I2C and SPI devices)
	superUser: 'superUser'										// Launch process as root user (potentially dangerous)
}
