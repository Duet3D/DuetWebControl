/**
 * Bridge object injected by the FindMyDuet Android app, which hosts DWC in a WebView.
 * It is not present when DWC runs in a regular browser
 */
interface NativeApp {
	/** Close the web interface and return to the app's list of discovered boards */
	listDevices(): void;

	/** Save a file generated in the browser, called from the app's own blob download hook */
	saveFile(fileName: string, dataUrl: string): void;
}

declare global {
	interface Window {
		app?: Partial<NativeApp>;
	}
}

/** Whether DWC is running inside the FindMyDuet app and can hand control back to it */
export const canListDevices = typeof window.app?.listDevices === "function";

/** Leave the web interface and return to the app's list of discovered boards */
export function listDevices(): void {
	window.app?.listDevices?.();
}
