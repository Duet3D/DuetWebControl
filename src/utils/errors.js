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

class CodeDisconnectedError extends CodeError {
	constructor() {
		super(i18n.t('error.codeDisconnectedError'));
	}
}

// Exports

export {
	NotImplementedError,
	LoginError, InvalidPasswordError, NoFreeSessionError,
	CodeError, CodeResponseError, CodeBufferError, CodeDisconnectedError
}
