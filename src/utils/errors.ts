import i18n from "../i18n";

/**
 * Get the message from a thrown error
 * @param e Error item
 * @returns Error message
 */
export function getErrorMessage(e: any) {
	return e ? (e.reason ?? (e.message ?? e.toString())) : i18n.t("generic.noValue");
}

// Generic Errors

export class NotImplementedError extends Error {
	constructor(field: string) {
		super(i18n.t('error.notImplemented', [field]));
	}
}

// Network Errors

export class NetworkError extends Error {
	constructor(msg?: string | null) {
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
	reason: string | null = null;

	constructor(reason: string) {
		super(i18n.t('error.operationFailed', [reason]));
		this.reason = reason;
	}
}

// File Access Errors

export class DriveUnmountedError extends NetworkError {
	constructor() {
		super(i18n.t('error.driveUnmounted', []));
	}
}

export class FileNotFoundError extends NetworkError {
	constructor(file?: string | null) {
		super(i18n.t('error.fileNotFound', [file || 'n/a']));
	}
}

export class DirectoryNotFoundError extends NetworkError {
	constructor(directory?: string | null) {
		super(i18n.t('error.directoryNotFound', [directory || 'n/a']));
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

export class BadVersionError extends LoginError {
	constructor() {
		super(i18n.t('error.badVersion'));
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
