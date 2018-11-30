'use strict'

import i18n from '../i18n'

// Generic Errors

class NotImplementedError extends Error {
	constructor(field) {
		const message = i18n.t('error.notImplemented', [field]);
		super(message);
		this.name = this.constructor.name;
		if (typeof Error.captureStackTrace === 'function') {
			Error.captureStackTrace(this, this.constructor);
		} else {
			this.stack = (new Error(message)).stack;
		}
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

// GCode Errors

class GCodeError extends Error {}

class GCodeBufferError extends GCodeError {
	constructor() {
		super(i18n.t('error.gcodeBufferError'));
	}
}

class GCodeResponseError extends GCodeError {
	constructor() {
		super(i18n.t('error.gcodeResponseError'));
	}
}

class GCodeDisconnectedError extends GCodeError {
	constructor() {
		super(i18n.t('error.gcodeDisconnectedError'));
	}
}

// Exports

export {
	NotImplementedError,
	LoginError, InvalidPasswordError, NoFreeSessionError,
	GCodeError, GCodeResponseError, GCodeBufferError, GCodeDisconnectedError
}
