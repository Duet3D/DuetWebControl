'use strict'

import i18n from '../i18n'

// Generic Errors

export class NotImplementedError extends Error {
	constructor(field) {
		super(i18n.t('error.notImplemented', [field]));
	}
}

// Network Errors

export class NetworkError extends Error {
	constructor(msg) {
		super(msg || i18n.t('error.network'));
	}
}

export class DisconnectedError extends NetworkError {
	constructor() {
		super(i18n.t('error.disconnected'));
	}
}

export class TimeoutError extends NetworkError {
	constructor() {
		super(i18n.t('error.timeout'));
	}
}

export class OperationCancelledError extends NetworkError {
	constructor() {
		super(i18n.t('error.cancelled'));
	}
}

export class OperationFailedError extends NetworkError {
	constructor(reason) {
		super(i18n.t('error.operationFailed', [reason]));
	}
}

// File Access Errors

export class DriveUnmountedError extends NetworkError {
	constructor() {
		super(i18n.t('error.driveUnmounted', []));
	}
}

export class FileNotFoundError extends NetworkError {
	constructor(file) {
		super(i18n.t('error.fileNotFound', [file]));
	}
}

export class DirectoryNotFoundError extends NetworkError {
	constructor(directory) {
		super(i18n.t('error.directoryNotFound', [directory]));
	}
}

// Login Errors

export class LoginError extends Error {}

export class InvalidPasswordError extends LoginError {
	constructor() {
		super(i18n.t('error.invalidPassword'));
	}
}

export class NoFreeSessionError extends LoginError {
	constructor() {
		super(i18n.t('error.noFreeSession'));
	}
}

// Code Errors

export class CodeError extends Error {}

export class CodeBufferError extends CodeError {
	constructor() {
		super(i18n.t('error.codeBuffer'));
	}
}

export class CodeResponseError extends CodeError {
	constructor() {
		super(i18n.t('error.codeResponse'));
	}
}

// Heightmap errors

export class HeightmapError extends Error {}

export class InvalidHeightmapError extends HeightmapError {
	constructor() {
		super(i18n.t('error.invalidHeightmap'));
	}
}
