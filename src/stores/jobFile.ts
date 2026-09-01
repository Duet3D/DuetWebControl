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
 * (typically on mount and whenever {@link fileKey} changes) and read {@link content}
 * reactively.
 */
export const useJobFileStore = defineStore("jobFile", {
	state: () => ({
		/**
		 * Key of the file the cached content belongs to ("" when nothing is cached)
		 */
		cachedFileKey: "",

		/**
		 * Content of the currently running job file ("" while unloaded or downloading)
		 */
		content: "",

		/**
		 * Whether a download is currently in flight
		 */
		loading: false,
	}),
	getters: {
		/**
		 * Identity of the currently running job file ("" if no job is running).
		 * Size and timestamp are part of it so that re-uploading a file under the same name
		 * and printing it again invalidates the cached content
		 */
		fileKey(): string {
			const file = useMachineStore().model.job.file;
			return (file !== null && file.fileName) ? `${file.fileName}\n${file.size}\n${file.lastModified}` : "";
		},
	},
	actions: {
		/**
		 * Ensure the content of the currently running job file is downloaded and cached.
		 * A no-op when the content is already cached or a download for the same file is in
		 * progress, so repeat callers never trigger a duplicate transfer.
		 */
		async loadContent(): Promise<void> {
			const machineStore = useMachineStore();
			const file = machineStore.model.job.file;
			if (file === null || !file.fileName) {
				this.cachedFileKey = "";
				this.content = "";
				return;
			}
			if (this.cachedFileKey === this.fileKey) {
				return;
			}

			const download = ++currentDownload;
			this.cachedFileKey = this.fileKey;
			this.content = "";
			this.loading = true;
			try {
				const text = await machineStore.download({ filename: file.fileName, type: "text" }, false, false, false) as string;
				if (download === currentDownload) {
					this.content = text;
				}
			} catch {
				// File may have disappeared mid-job - drop the key so a later call retries
				if (download === currentDownload) {
					this.cachedFileKey = "";
				}
			} finally {
				if (download === currentDownload) {
					this.loading = false;
				}
			}
		},
	},
});
