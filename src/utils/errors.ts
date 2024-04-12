import i18n from "@/i18n";

/**
 * Get the message from a thrown error
 * @param e Error item
 * @returns Error message
 */
export function getErrorMessage(e: any): string {
	return e ? (e.reason ?? (e.message ?? e.toString())) : i18n.global.t("generic.noValue");
}

// Heightmap errors

export class HeightmapError extends Error {}

export class InvalidHeightmapError extends HeightmapError {
	constructor() {
		super(i18n.global.t('error.invalidHeightmap'));
	}
}
