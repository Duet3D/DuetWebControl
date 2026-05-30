/**
 * Copy text to the clipboard. Uses the async Clipboard API on secure (HTTPS) origins and falls
 * back to a hidden textarea + execCommand on plain HTTP, where the Clipboard API is unavailable -
 * many machines are reached over unencrypted HTTP, so the fallback matters
 * @param text Text to copy
 */
export async function copyToClipboard(text: string): Promise<void> {
	if (window.isSecureContext && navigator.clipboard) {
		await navigator.clipboard.writeText(text);
		return;
	}

	const textarea = document.createElement("textarea");
	textarea.value = text;
	textarea.setAttribute("readonly", "");
	// Keep it off-screen so selecting it doesn't scroll the page
	textarea.style.position = "fixed";
	textarea.style.top = "-9999px";
	document.body.appendChild(textarea);
	textarea.select();
	try {
		document.execCommand("copy");
	} finally {
		document.body.removeChild(textarea);
	}
}
