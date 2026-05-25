/**
 * Helpers for composing G-code from object-model data
 */

/**
 * Render an axis letter as it must appear in a G-code parameter. Lowercase axis letters have to
 * be quoted with a leading apostrophe - without it the firmware folds them to their upper-case
 * namesake (e.g. `a` would be treated as `A`).
 * @param letter Axis letter from the object model
 * @returns The letter ready to drop into a G-code, quoted when lowercase
 */
export function axisGCodeLetter(letter: string): string {
	return /[a-z]/.test(letter) ? `'${letter}` : letter;
}
