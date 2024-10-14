import i18n from "@/i18n";

/**
 * Get the message from a thrown error
 * @param e Error item
 * @param optional Whether the error is optional
 * @returns Error message
 */
export function getErrorMessage<B extends boolean | undefined = undefined>(e: any, optional?: B): B extends true ? string | null : string {
	return e ? (e.reason ?? (e.message ?? e.toString())) : ((optional !== true) ? i18n.global.t("generic.noValue") : null);
}

// Heightmap errors

export class HeightmapError extends Error {}

export class InvalidHeightmapError extends HeightmapError {
	constructor() {
		super(i18n.global.t("error.invalidHeightmap"));
	}
}
