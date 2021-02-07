'use strict'

import { version } from '../../package.json'
import { Dictionary, quickPatch } from '../utils/patch.js'

export class PluginManifest {
	constructor(initData) { quickPatch(this, initData); }
	name = ''										// Name of the plugin
	author = ''										// Author of the plugin
	version = '1.0.0'								// Version of the plugin
	license = 'LGPL-3.0-or-later'					// License of the plugin. Should follow the SPDX format (see https://spdx.org/licenses/)
	sourceRepository = null							// Link to the source code repository

	dwcVersion = version 							// Major/minor compatible DWC version
	dwcDependencies = []							// List of DWC plugins this plugin depends on. Circular dependencies are not supported
	dwcWebpackChunk = null							// Name of the generated webpack chunk

	sbcRequired = false								// Set to true if a SBC is absolutely required for this plugin
	sbcDsfVersion = null							// Required DSF version for the plugin running on the SBC (ignored if there is no SBC executable)
	sbcData = new Dictionary()						// Object holding key value pairs of a plugin running on the SBC
	sbcExecutable = null							// Filename in the bin directory used to start the plugin
	sbcExecutableArguments = null					// Command-line arguments for the executable
	sbcOutputRedirected = true						// Defines if messages from stdout/stderr are output as generic messages
	sbcPermissions = []								// Permissions on the SBC. See also PluginPermissions
	sbcPackageDependencies = []						// List of packages this plugin depends on (apt packages in the case of DuetPi)
	sbcPluginDependencies = []						// List of SBC plugins this plugin depends on. Circular dependencies are not supported

	rrfVersion = null								// Required RRF version
}

export const SbcPermission = {
	// - DSF
	commandExecution: 'commandExecution',						// Execute generic commands
	codeInterceptionRead: 'codeInterceptionRead',				// Intercept codes but don't interact with them
	codeInterceptionReadWrite: 'codeInterceptionReadWrite',		// Intercept codes in a blocking way with options to resolve or cancel them
	managePlugins: 'managePlugins',								// Install, load, unload, and uninstall plugions
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
	superUser: 'superUser'										// Launch process as root user (potentially dangerous)
}
