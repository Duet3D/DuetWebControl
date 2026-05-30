/**
 * Trigger a browser "save as" download of a blob via a temporary object URL
 * @param filename Suggested filename for the download
 * @param blob Data to save
 */
export function saveBlob(filename: string, blob: Blob): void {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	URL.revokeObjectURL(url);
}
