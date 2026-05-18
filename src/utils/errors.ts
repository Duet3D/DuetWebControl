import i18n from "@/i18n";

/**
 * Get the message from a thrown error
 * @param e Error item
 * @param optional When true, returns null for nullish input instead of the localised "no value" string
 * @returns Error message
 */
export function getErrorMessage<B extends boolean | undefined = undefined>(
	e: unknown,
	optional?: B,
): B extends true ? string | null : string {
	type Result = B extends true ? string | null : string;
	if (e === null || e === undefined) {
		return (optional === true ? null : i18n.global.t("generic.noValue")) as Result;
	}
	if (typeof e === "object") {
		const candidate = e as { reason?: unknown; message?: unknown };
		if (typeof candidate.reason === "string") {
			return candidate.reason as Result;
		}
		if (typeof candidate.message === "string") {
			return candidate.message as Result;
		}
	}
	return String(e) as Result;
}

//#region Heightmap errors

/**
 * Base error class for heightmap errors
 */
export class HeightmapError extends Error {
	override name: string = "HeightmapError";
}

/**
 * Error thrown when a heightmap is invalid
 */
export class InvalidHeightmapError extends HeightmapError {
	override name: string = "InvalidHeightmapError";

	constructor() {
		super(i18n.global.t("error.invalidHeightmap"));
	}
}

//#endregion
