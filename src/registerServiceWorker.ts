// Service worker registration.
//
// SW is built by vite-plugin-pwa with skipWaiting + clientsClaim, so a new build takes over
// open clients as soon as the browser sees a byte-different /service-worker.js. We reload on
// controllerchange so the page actually starts using the new shell instead of running the old
// code against a now-different cache. Skipped on the very first install (page was loaded
// uncontrolled), since there is no stale content to flush yet
if (import.meta.env.PROD && "serviceWorker" in navigator) {
	const wasControlled = navigator.serviceWorker.controller != null;
	let reloading = false;
	navigator.serviceWorker.addEventListener("controllerchange", () => {
		if (!wasControlled || reloading) {
			return;
		}
		reloading = true;
		window.location.reload();
	});

	window.addEventListener("load", () => {
		navigator.serviceWorker
			.register(`${import.meta.env.BASE_URL}service-worker.js`)
			.then(() => {
				console.log("Service worker has been registered.");
			})
			.catch((error: unknown) => {
				console.error("Error during service worker registration:", error);
			});
	});
}
