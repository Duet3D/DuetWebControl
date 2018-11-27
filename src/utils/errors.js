'use strict'

// Unfortunately extending the Error class does not seem to work for the following...

// Generic Errors

function NotImplementedError(field) {
	this.name = 'NotImplementedError'
	this.message = `Field '${field} is not implemented`
}
NotImplementedError.prototype = Error.prototype;

// Login Errors

function LoginError(message) {
	this.name = 'LoginError';
	this.message = message;
}
LoginError.prototype = Error.prototype;

function InvalidPasswordError(message) {
	this.name = 'InvalidPasswordError';
	this.message = (message || 'error.invalidPassword');
}
InvalidPasswordError.prototype = LoginError.prototype;

function NoFreeSessionError(message) {
	this.name = 'NoFreeSessionError';
	this.message = (message || 'error.noFreeSession');
}
NoFreeSessionError.prototype = LoginError.prototype;

export {
	NotImplementedError,
	LoginError, InvalidPasswordError, NoFreeSessionError
}
