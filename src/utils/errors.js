'use strict'

import i18n from '../i18n'

// Generic Errors

class NotImplementedError extends Error {
	constructor(field) {
		super(i18n.t('error.notImplemented', [field]));
	}
}

class DisconnectedError extends Error {
	constructor() {
		super(i18n.t('error.disconnectedError'));
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

// File Tranmission Errors

class FileTransmissionError extends Error {}

class FileTransmissionCancelledError extends FileTransmissionError {
	constructor() {
		super(i18n.t('error.fileTransmissionCancelled'));
	}
}

// Exports

export {
	NotImplementedError, DisconnectedError,
	LoginError, InvalidPasswordError, NoFreeSessionError,
	CodeError, CodeResponseError, CodeBufferError,
	FileTransmissionError, FileTransmissionCancelledError
}
