import { defineStore } from "pinia";

import { useMachineStore } from "./machine";

// Bumped on every download so a callback from a superseded download (job switched while a
// transfer was still in flight) can detect it is stale and leave the newer state untouched
let currentDownload = 0;

/**
 * Shared cache of the currently running job file's content.
 *
 * The file is downloaded at most once and held here, so every consumer (the G-code stream
 * panel, the 3D G-code viewer, ...) reads the same copy rather than each keeping its own.
 * The cache is replaced when the running job file changes. Consumers call {@link loadContent}
 * (typically on mount and whenever `job.file.fileName` changes) and read {@link content}
 * reactively.
 */
export const useJobFileStore = defineStore("jobFile", {
	state: () => ({
		/**
		 * Name of the file the cached content belongs to ("" when nothing is cached)
		 */
		fileName: "",

		/**
		 * Content of the currently running job file ("" while unloaded or downloading)
		 */
		content: "",

		/**
		 * Whether a download is currently in flight
		 */
		loading: false,
	}),
	actions: {
		/**
		 * Ensure the content of the currently running job file is downloaded and cached.
		 * A no-op when the content is already cached or a download for the same file is in
		 * progress, so repeat callers never trigger a duplicate transfer.
		 */
		async loadContent(): Promise<void> {
			const machineStore = useMachineStore();
			const fileName = machineStore.model.job.file?.fileName ?? "";
			if (!fileName) {
				this.fileName = "";
				this.content = "";
				return;
			}
			if (this.fileName === fileName) {
				return;
			}

			const download = ++currentDownload;
			this.fileName = fileName;
			this.content = "";
			this.loading = true;
			try {
				const text = await machineStore.download({ filename: fileName, type: "text" }, false, false, false) as string;
				if (download === currentDownload) {
					this.content = text;
				}
			} catch {
				// File may have disappeared mid-job - drop the key so a later call retries
				if (download === currentDownload) {
					this.fileName = "";
				}
			} finally {
				if (download === currentDownload) {
					this.loading = false;
				}
			}
		},
	},
});
