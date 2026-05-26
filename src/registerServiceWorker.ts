import { register } from "register-service-worker";

if (process.env.NODE_ENV === "production") {
	// Reload once when a new service worker takes control of this page.
	// Skipped on the very first install (when the page was loaded uncontrolled),
	// since there is no stale content to flush yet
	const wasControlled = navigator.serviceWorker?.controller != null;
	let reloading = false;
	navigator.serviceWorker?.addEventListener("controllerchange", () => {
		if (!wasControlled || reloading) {
			return;
		}
		reloading = true;
		window.location.reload();
	});

	register(`${process.env.BASE_URL}service-worker.js`, {
		ready() {
			console.log(
				"App is being served from cache by a service worker.\n" +
				"For more details, visit https://goo.gl/AFskqB"
			)
		},
		registered() {
			console.log("Service worker has been registered.")
		},
		cached() {
			console.log("Content has been cached for offline use.")
		},
		updatefound() {
			console.log("New content is downloading.")
		},
		updated() {
			console.log("New content is available; reloading.")
		},
		offline() {
			console.log("No internet connection found. App is running in offline mode.")
		},
		error(error) {
			console.error("Error during service worker registration:", error)
		}
	})
}
