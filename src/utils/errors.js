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

class DisconnectedError extends NetworkError {
	constructor() {
		super(i18n.t('error.disconnectedError'));
	}
}

class TimeoutError extends NetworkError {
	constructor() {
		super(i18n.t('error.timeoutError'));
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

class FileNotFoundError extends NetworkError {
	constructor(file) {
		super(i18n.t('error.fileNotFound', [file]));
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
		super(i18n.t('error.codeBufferError'));
	}
}

class CodeResponseError extends CodeError {
	constructor() {
		super(i18n.t('error.codeResponseError'));
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
	NetworkError, DisconnectedError, TimeoutError, OperationCancelledError, OperationFailedError, FileNotFoundError,
	LoginError, InvalidPasswordError, NoFreeSessionError,
	CodeError, CodeResponseError, CodeBufferError,
	HeightmapError, InvalidHeightmapError
}
