'use strict'

import i18n from '../i18n'

// Generic Errors

class NotImplementedError extends Error {
	constructor(field) {
		super(i18n.t('error.notImplemented', [field]));
	}
}

// Network Errors

class NetworkError extends Error {}

class CORSError extends NetworkError {
	constructor() {
		super(i18n.t('error.cors'));
	}
}

class DisconnectedError extends NetworkError {
	constructor() {
		super(i18n.t('error.disconnected'));
	}
}

class TimeoutError extends NetworkError {
	constructor() {
		super(i18n.t('error.timeout'));
	}
}

class OperationCancelledError extends NetworkError {
	constructor() {
		super(i18n.t('error.cancelled'));
	}
}

class OperationFailedError extends NetworkError {
	constructor(reason) {
		super(i18n.t('error.operationFailed', [reason]));
	}
}

// File Access Errors

class DriveUnmountedError extends NetworkError {
	constructor() {
		super(i18n.t('error.driveUnmounted', []));
	}
}

class FileNotFoundError extends NetworkError {
	constructor(file) {
		super(i18n.t('error.fileNotFound', [file]));
	}
}

class DirectoryNotFoundError extends NetworkError {
	constructor(directory) {
		super(i18n.t('error.directoryNotFound', [directory]));
	}
}

// Login Errors

class LoginError extends Error {}

class InvalidPasswordError extends LoginError {
	constructor() {
		super(i18n.t('error.invalidPassword'));
	}
}

class NoFreeSessionError extends LoginError {
	constructor() {
		super(i18n.t('error.noFreeSession'));
	}
}

// Code Errors

class CodeError extends Error {}

class CodeBufferError extends CodeError {
	constructor() {
		super(i18n.t('error.codeBuffer'));
	}
}

class CodeResponseError extends CodeError {
	constructor() {
		super(i18n.t('error.codeResponse'));
	}
}

// Heightmap errors

class HeightmapError extends Error {}

class InvalidHeightmapError extends HeightmapError {
	constructor() {
		super(i18n.t('error.invalidHeightmap'));
	}
}

// Exports

export {
	NotImplementedError,
	NetworkError, CORSError, DisconnectedError, TimeoutError, OperationCancelledError, OperationFailedError,
	DriveUnmountedError, FileNotFoundError, DirectoryNotFoundError,
	LoginError, InvalidPasswordError, NoFreeSessionError,
	CodeError, CodeResponseError, CodeBufferError,
	HeightmapError, InvalidHeightmapError
}
