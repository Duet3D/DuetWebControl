'use strict'

import { version } from '../../package.json'
import { quickPatch } from '../utils/patch.js'

export class PluginManifest {
	constructor(initData) { quickPatch(this, initData); }
	name = ''										// Name of the plugin
	author = ''										// Author of the plugin
	version = '1.0.0'								// Version of the plugin
	license = 'LGPL-3.0'							// License of the plugin
	sourceRepository = null							// Link to the source code repository

	dwcVersion = version 							// Major/minor compatible DWC version
	dwcDependencies = []							// List of DWC plugins this plugin depends on. Circular dependencies are not supported
	jsFiles = []									// List of JavaScript files to import
	cssFiles = []									// List of CSS files to import

	dsfVersion = null								// Major/minor compatible DSF version or null if not required
	sbcFiles = []									// List of binary files to install on the SBC
	sbcExecutable = ''								// Executable to launch when the plugin starts
	sbcPermissions = []								// Permissions on the SBC. See also PluginPermissions
	sbcPluginDependencies = []						// List of SBC plugins this plugin depends on. Circular dependencies are not supported
	sbcDependencies = []							// List of apt dependency packages

	rrfVersion = null								// Major/minor compatible RRF version or null if not required
	rrfFiles = []									// List of RRF files on the (virtual) SD excluding web files (TBD - reserved)
}

export const SbcPermission = {
	// - DSF
	objectModelRead: 'objectModelRead',							// Read from the object model
	objectModelReadWrite: 'objectModelReadWrite',				// Write to the object model
	codeInterceptionRead: 'codeInterceptionRead',				// Intercept codes in a non-blocking way
	codeInterceptionReadWrite: 'codeInterceptionReadWrite',		// Intercept codes in a blocking way with options to resolve or cancel them
	commandExecution: 'commandExecution',						// Execute DSF API commands
	// - Virtual SD
	readFilaments: 'readFilaments',								// Read files in 0:/filaments
	writeFilaments: 'writeFilaments',							// Read and write files in 0:/filaments
	readFirmware: 'readFirmware',								// Read files in 0:/firmware
	writeFirmware: 'writeFirmware',								// Read and write files in 0:/firmware
	readGCodes: 'readGCodes',									// Read files in 0:/gcodes
	writeGCodes: 'writeGCodes',									// Read and write files in 0:/gcodes
	readMacros: 'readMacros',									// Read files in 0:/macros
	writeMacros: 'writeMacros',									// Read and write files in 0:/macros
	readSystem: 'readSystem',									// Read files in 0:/sys
	writeSystem: 'writeSystem',									// Read and write files in 0:/sys
	readWeb: 'readWeb',											// Read files in 0:/www
	writeWeb: 'writeWeb',										// Read and write files in 0:/www
	// - OS
	fileSystemAccess: 'fileSystemAccess',						// Access files outside the virtual SD directory (as DSF user)
	launchProcesses: 'launchProcesses',							// Launch new processes
	networkAccess: 'networkAccess',								// Communicate over the network
	superUser: 'superUser'										// Launch process as root (for full device control)
}
