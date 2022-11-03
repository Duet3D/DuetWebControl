<style scoped>
.list-icon {
	display: flex;
	flex-shrink: 0;
	align-content: center;
	justify-content: center;
	width: 48px;
}
</style>

<template>
	<div>
		<v-toolbar>
			<sd-card-btn v-if="volumes.length > 1" v-model="volume" class="hidden-sm-and-down" />
			<directory-breadcrumbs v-model="directory" />

			<v-spacer />

			<v-btn class="hidden-sm-and-down mr-3" :disabled="uiFrozen" :elevation="1" @click="showNewDirectory = true">
				<v-icon class="mr-1">mdi-folder-plus</v-icon> {{ $t("button.newDirectory.caption") }}
			</v-btn>
			<v-btn class="hidden-sm-and-down mr-3" color="info" :loading="loading || fileinfoProgress !== -1"
				   :disabled="uiFrozen" :elevation="1" @click="refresh">
				<v-icon class="mr-1">mdi-refresh</v-icon> {{ $t("button.refresh.caption") }}
			</v-btn>
			<upload-btn class="hidden-sm-and-down" :elevation="1" :directory="directory" target="gcodes"
						color="primary" />
		</v-toolbar>

		<base-file-list ref="filelist" v-model="selection" :headers="headers" :directory.sync="directory"
						:filelist.sync="filelist" :loading.sync="loading" sort-table="jobs"
						@directoryLoaded="directoryLoaded" @fileClicked="fileClicked" no-files-text="list.jobs.noJobs">
			<v-progress-linear slot="progress" :indeterminate="fileinfoProgress === -1"
							   :value="(fileinfoProgress / filelist.length) * 100" />

			<template #folder="{ item }">
				<div :class="{ 'list-icon mr-2': hasThumbnails, 'mr-1': !hasThumbnails }">
					<v-icon> mdi-folder</v-icon>
				</div>
				{{ item.name }}
			</template>
			<template #file="{ item }">
				<div :class="{ 'list-icon mr-2': hasThumbnails, 'mr-1': !hasThumbnails }">
					<v-icon v-if="!(item.thumbnails instanceof Array) || !getSmallThumbnail(item.thumbnails)">
						{{ (item.thumbnails instanceof Array) ? "mdi-file" : "mdi-asterisk" }}
					</v-icon>
					<v-menu v-else right offset-x open-on-hover open-on-focus close-on-content-click :min-width="16">
						<template #activator="{ on, attrs }">
							<div v-bind="attrs" v-on="on" @click.stop="" tabindex="0">
								<thumbnail-img :thumbnail="getSmallThumbnail(item.thumbnails)" icon />
							</div>
						</template>

						<v-card class="d-flex">
							<thumbnail-img :thumbnail="getBigThumbnail(item.thumbnails)" />
						</v-card>
					</v-menu>
				</div>
				{{ item.name }}
			</template>

			<template #context-menu>
				<v-list-item v-show="isFile && !isPrinting" @click="start">
					<v-icon class="mr-1">mdi-play</v-icon> {{ $t("list.jobs.start") }}
				</v-list-item>
				<v-list-item v-show="isFile && !isPrinting" @click="simulate">
					<v-icon class="mr-1">mdi-fast-forward</v-icon> {{ $t("list.jobs.simulate") }}
				</v-list-item>
				<v-list-item v-show="isFile" v-for="(menuItem, index) in contextMenuItems" :key="index"
							 @click="contextMenuAction(menuItem)">
					<v-icon class="mr-1">{{ menuItem.icon }}</v-icon> {{ menuItem.name }}
				</v-list-item>
			</template>
		</base-file-list>

		<v-speed-dial v-model="fab" bottom right fixed direction="top" transition="scale-transition"
					  class="hidden-md-and-up">
			<template #activator>
				<v-btn v-model="fab" dark color="primary" fab>
					<v-icon v-if="fab">mdi-close</v-icon>
					<v-icon v-else>mdi-dots-vertical</v-icon>
				</v-btn>
			</template>

			<v-btn fab :disabled="uiFrozen" @click="showNewDirectory = true">
				<v-icon>mdi-folder-plus</v-icon>
			</v-btn>

			<v-btn fab color="info" :loading="loading || fileinfoProgress !== -1" :disabled="uiFrozen" @click="refresh">
				<v-icon>mdi-refresh</v-icon>
			</v-btn>

			<upload-btn fab dark :directory="directory" target="gcodes" color="primary">
				<v-icon>mdi-cloud-upload</v-icon>
			</upload-btn>
		</v-speed-dial>

		<new-directory-dialog :shown.sync="showNewDirectory" :directory="directory" />
		<confirm-dialog :shown.sync="startJobDialog.shown" :title="startJobDialog.title" :prompt="startJobDialog.prompt"
						@confirmed="start(startJobDialog.item)" />
	</div>
</template>

<script lang="ts">
import { ThumbnailInfo, Volume } from "@duet3d/objectmodel";
import Vue from "vue";

import { UploadType } from "@/components/buttons/UploadBtn.vue";
import i18n from "@/i18n";
import store from "@/store";
import { ContextMenuItem } from "@/store/uiInjection";
import { isPrinting } from "@/utils/enums";
import { DisconnectedError, getErrorMessage, InvalidPasswordError } from "@/utils/errors";
import { LogType } from "@/utils/logging";
import Path, { escapeFilename } from "@/utils/path";

import { BaseFileListHeader, BaseFileListItem } from "./BaseFileList.vue";

interface JobListItemProperties {
	height?: number | null;
	layerHeight?: number | null;
	filament?: Array<number> | null;
	generatedBy?: string | null;
	printTime?: number | bigint | null;
	simulatedTime: number | bigint | null;
	thumbnails?: Array<ThumbnailInfo> | null;
}

type JobListItem = BaseFileListItem & JobListItemProperties;

export default Vue.extend({
	computed: {
		isConnected(): boolean { return store.getters["isConnected"]; },
		uiFrozen(): boolean { return store.getters["uiFrozen"]; },
		contextMenuItems(): Array<ContextMenuItem> { return store.state.uiInjection.contextMenuItems.jobFileList; },
		gcodesDirectory(): string { return store.state.machine.model.directories.gCodes; },
		lastJobFile(): string | null { return store.state.machine.model.job.lastFileName; },
		volumes(): Array<Volume> { return store.state.machine.model.volumes; },
		/*
		...mapState("machine/cache", ["fileInfos"]),
		...mapState("machine/model", {
			gCodesDirectory: state => state.directories.gCodes,
			lastJobFile: state => state.job.lastFileName,
			status: state => state.state.status,
			volumes: state => state.volumes
		}),
		...mapState("settings", ["language"]),
		...mapState("uiInjection", ["contextMenuItems"]),
		...mapGetters(["isConnected", "uiFrozen"]),
		*/
		headers(): Array<BaseFileListHeader> {
			return [
				{
					class: "pl-0",
					cellClass: "pl-0",
					text: i18n.t("list.baseFileList.fileName"),
					value: "name"
				},
				{
					text: i18n.t("list.baseFileList.size"),
					value: "size",
					unit: "bytes"
				},
				{
					text: i18n.t("list.baseFileList.lastModified"),
					value: "lastModified",
					unit: "date"
				},
				{
					text: i18n.t("list.jobs.height"),
					value: "height",
					precision: 2,
					unit: "mm"
				},
				{
					text: i18n.t("list.jobs.layerHeight"),
					value: "layerHeight",
					precision: 2,
					unit: "mm"
				},
				{
					text: i18n.t("list.jobs.filament"),
					value: "filament",
					unit: "filaments"
				},
				{
					text: i18n.t("list.jobs.printTime"),
					value: "printTime",
					unit: "time"
				},
				{
					text: i18n.t("list.jobs.simulatedTime"),
					value: "simulatedTime",
					unit: "time"
				},
				{
					text: i18n.t("list.jobs.generatedBy"),
					value: "generatedBy"
				}
			];
		},
		isFile(): boolean {
			return (this.selection.length === 1) && !this.selection[0].isDirectory;
		},
		isPrinting(): boolean {
			return isPrinting(store.state.machine.model.state.status);
		},
		loading: {
			get(): boolean { return this.loadingValue || this.fileinfoProgress !== -1; },
			set(value: boolean) { this.loadingValue = value; }
		},
		volume: {
			get(): number { return Path.getVolume(this.directory); },
			set(value: number) { this.directory = (value === Path.getVolume(this.gcodesDirectory)) ? this.gcodesDirectory : `${value}:`; }
		}
	},
	data() {
		return {
			directory: Path.gCodes,
			selection: new Array<JobListItem>,
			hasThumbnails: false,
			filelist: new Array<JobListItem>,
			loadingValue: false,
			fileinfoDirectory: null as string | null,
			fileinfoProgress: -1,
			startJobDialog: {
				title: "",
				prompt: "",
				item: null as JobListItem | null,
				shown: false
			},
			showNewDirectory: false,
			fab: false
		}
	},
	methods: {
		/*
		...mapActions("machine", ["sendCode", "getFileInfo"]),
		...mapMutations("machine/cache", ["clearFileInfo", "setFileInfo"]),
		*/
		getBigThumbnail(thumbnails: Array<ThumbnailInfo>) {
			let biggestThumbnail = null;
			for (const thumbnail of thumbnails) {
				if (thumbnail.data !== null && (!biggestThumbnail || thumbnail.height > biggestThumbnail.height)) {
					biggestThumbnail = thumbnail;
				}
			}
			return biggestThumbnail;
		},
		getSmallThumbnail(thumbnails: Array<ThumbnailInfo>) {
			let smallestThumbnail = null;
			for (const thumbnail of thumbnails) {
				if (thumbnail.data !== null && (!smallestThumbnail || Math.abs(48 - thumbnail.height) < Math.abs(48 - smallestThumbnail.height))) {
					smallestThumbnail = thumbnail;
				}
			}
			return smallestThumbnail;
		},
		refresh() {
			store.commit("machine/cache/clearFileInfo", this.directory);
			(this.$refs.filelist as any).refresh();
		},
		async requestFileInfo(directory: string, fileIndex: number, fileCount: number) {
			if (fileIndex === 0) {
				this.hasThumbnails = false;
			}

			if (this.fileinfoDirectory === directory) {
				if (this.isConnected && fileIndex < fileCount) {
					// Update progress
					this.fileinfoProgress = fileIndex;

					// Try to get file info for the next file
					const file = this.filelist[fileIndex];
					if (!file.isDirectory) {
						let gotFileInfo = false;
						try {
							// Check if it is possible to parse this file
							const filename = Path.combine(directory, file.name);
							if (Path.isGCodePath(file.name, this.gcodesDirectory)) {
								// Get the fileinfo either from our cache or from the Duet
								let fileInfo = store.state.machine.cache.fileInfos[filename];
								if (!fileInfo) {
									fileInfo = await store.dispatch("machine/getFileInfo", { filename, readThumbnailContent: true });
									store.commit("machine/cache/setFileInfo", { filename, fileInfo });
								}

								// Start again if the number of files has changed
								if (fileCount !== this.filelist.length) {
									fileIndex = -1;
									fileCount = this.filelist.length;
									this.requestFileInfo(directory, fileIndex, fileCount);
									return;
								}

								// Set file info
								gotFileInfo = true;
								file.height = fileInfo.height;
								file.layerHeight = fileInfo.layerHeight;
								file.filament = fileInfo.filament;
								file.generatedBy = fileInfo.generatedBy;
								file.printTime = fileInfo.printTime ? fileInfo.printTime : null;
								file.simulatedTime = fileInfo.simulatedTime ? fileInfo.simulatedTime : null;
								file.thumbnails = fileInfo.thumbnails ? fileInfo.thumbnails : [];
								if (fileInfo.thumbnails && fileInfo.thumbnails.length !== 0) {
									this.hasThumbnails = true;
								}
							}
						} catch (e) {
							// Deal with the error. If the connection has been terminated, the next call will invalidate everything
							if (!(e instanceof DisconnectedError) && !(e instanceof InvalidPasswordError)) {
								console.warn(e);
								this.$log(LogType.error, this.$t("error.fileinfoRequestFailed", [file.name]), getErrorMessage(e));
							}
						}

						// Remove loading state from the items if no info could be found
						if (!gotFileInfo) {
							file.height = null;
							file.layerHeight = null;
							file.filament = [];
							file.generatedBy = null;
							file.printTime = null;
							file.simulatedTime = null;
							file.thumbnails = null;
						}
					}

					// Move on to the next item
					this.requestFileInfo(directory, fileIndex + 1, fileCount);
				} else {
					// No longer connected or finished
					this.fileinfoProgress = -1;
					this.fileinfoDirectory = null;
				}
			}
		},
		async directoryLoaded(directory: string) {
			if (this.fileinfoDirectory !== directory) {
				this.fileinfoDirectory = directory;
				for (const item of this.filelist) {
					if (item.isDirectory) {
						item.height = null;
						item.layerHeight = null;
						item.filament = null;
						item.generatedBy = null;
						item.printTime = null;
						item.simulatedTime = null;
						item.thumbnails = null;
					}
				}

				await this.requestFileInfo(directory, 0, this.filelist.length);
			}
		},
		fileClicked(item: JobListItem) {
			if (!this.isPrinting) {
				this.startJobDialog.title = this.$t("dialog.startJob.title", [item.name]);
				this.startJobDialog.prompt = this.$t("dialog.startJob.prompt", [item.name]);
				this.startJobDialog.item = item;
				this.startJobDialog.shown = true;
			}
		},
		async start(item: JobListItem | null) {
			if (item !== null) {
				await store.dispatch("machine/sendCode", `M32 "${escapeFilename(Path.combine(this.directory, (item && item.name) ? item.name : this.selection[0].name))}"`);
			}
		},
		async simulate(item: JobListItem) {
			await store.dispatch("machine/sendCode", `M37 P"${escapeFilename(Path.combine(this.directory, (item && item.name) ? item.name : this.selection[0].name))}"`);
		},
		async contextMenuAction(menuItem: ContextMenuItem) {
			let path = Path.combine(this.directory, this.selection[0].name);
			if (menuItem.path) {
				await this.$router.push(menuItem.path);
			}
			this.$root.$emit(menuItem.action, path);
		}
	},
	mounted() {
		this.directory = this.gcodesDirectory;
	},
	watch: {
		gCodesDirectory(to: string, from: string) {
			if (Path.equals(this.directory, from) || !Path.startsWith(this.directory, to)) {
				this.directory = to;
			}
		},
		lastJobFile(to: string | null) {
			if (to !== null && Path.equals(this.directory, Path.extractDirectory(to))) {
				// Refresh the filelist after a short moment so DSF and RRF can update the simulation time first
				setTimeout((this.$refs.filelist as any).refresh.bind(this), 2000);
			}
		}
	}
});
</script>
