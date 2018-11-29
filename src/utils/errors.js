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

// GCode Errors

function GCodeError(message) {
	this.name = 'GCodeError';
	this.message = message;
}
GCodeError.prototype = Error.prototype;

function GCodeBufferError(message) {
	this.name = 'GCodeBufferError';
	this.message = (message || 'error.gcodeBufferError');
}
GCodeBufferError.prototype = GCodeError.prototype;

function GCodeResponseError(message) {
	this.name = 'GCodeResponseError';
	this.message = (message || 'error.gcodeResponseError');
}
GCodeResponseError.prototype = GCodeError.prototype;

function GCodeDisconnectedError(message) {
	this.name = 'GCodeDisconnectedError';
	this.message = (message || 'error.gcodeDisconnectedError');
}
GCodeDisconnectedError.prototype = GCodeError.prototype;


export {
	NotImplementedError,
	LoginError, InvalidPasswordError, NoFreeSessionError,
	GCodeError, GCodeResponseError, GCodeBufferError, GCodeDisconnectedError
}
