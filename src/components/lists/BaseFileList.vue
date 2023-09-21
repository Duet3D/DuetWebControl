<style scoped>
td {
	cursor: pointer;
}

.loading-cursor {
	cursor: wait;
}

.loading-cursor td {
	cursor: wait;
}
</style>

<style>
.base-file-list th {
	white-space: nowrap;
}
</style>

<template>
	<div>
		<v-data-table v-model="innerValue" v-bind="$props" @toggle-select-all="toggleAll" :items="innerFilelist"
					  item-key="name" :headers="headers || defaultHeaders" show-select
					  :loading="loading || innerLoading" :custom-sort="sort" :sort-by.sync="internalSortBy"
					  :sort-desc.sync="internalSortDesc" must-sort disable-pagination hide-default-footer
					  :mobile-breakpoint="0" class="base-file-list elevation-3"
					  :class="{ 'empty-table-fix' : !innerFilelist.length, 'loading-cursor' : isLoading }">

			<template #progress>
				<slot name="progress">
					<v-progress-linear indeterminate />
				</slot>
			</template>

			<template #no-data>
				<slot name="no-data">
					<v-alert :value="true" type="info" class="text-left ma-0" @contextmenu.prevent="">
						{{ $t(noItemsText) }}
					</v-alert>
				</slot>
			</template>

			<template #item="props">
				<tr :data-filename="(props.item.isDirectory ? '*' : '') + props.item.name" draggable="true" tabindex="0"
					@keydown.space.prevent="props.select(!props.isSelected)"
					@touchstart="onItemTouchStart(props, $event)" @touchend="onItemTouchEnd" @click="onItemClick(props)"
					@keydown.enter.prevent="onItemClick(props)"
					@contextmenu.stop.prevent="onItemContextmenu(props, $event)"
					@keydown.escape.prevent="contextMenu.shown = false" @dragstart="onItemDragStart(props.item, $event)"
					@dragover="onItemDragOver(props.item, $event)" @drop.prevent="onItemDragDrop(props.item, $event)">

					<td v-for="header in props.headers" :key="header.value" :class="header.cellClass">
						<template v-if="header.value === 'data-table-select'">
							<v-simple-checkbox :value="props.isSelected" @touchstart.stop="" @touchend.stop=""
											   @input="props.select($event)" class="mt-n1" tabindex="-1" />
						</template>
						<template v-else-if="header.value === 'name'">
							<div class="d-inline-flex align-center">
								<slot :name="`${props.item.isDirectory ? 'folder' : 'file'}.${props.item.name}`"
									  :item="props.item">
									<slot :name="props.item.isDirectory ? 'folder' : 'file'" :item="props.item">
										<v-icon class="mr-1">{{ props.item.isDirectory ? folderIcon : fileIcon }}</v-icon>
										{{ props.item.name }}
									</slot>
								</slot>
							</div>
						</template>
						<template v-else-if="header.unit === 'bytes'">
							{{ (props.item[header.value] !== null && !props.item.isDirectory) ? $displaySize(props.item[header.value]) : "" }}
						</template>
						<template v-else-if="header.unit === 'date'">
							{{ props.item.lastModified ? props.item.lastModified.toLocaleString() : $t("generic.noValue") }}
						</template>
						<template v-else-if="header.unit === 'filaments'">
							<v-tooltip bottom :disabled="!props.item[header.value] || props.item[header.value].length <= 1">
								<template #activator="{ on }">
									<span v-on="on">
										{{ displayLoadingValue(props.item, header.value, 1, "mm") }}
									</span>
								</template>

								{{ $display(props.item[header.value], 1, "mm") }}
							</v-tooltip>
						</template>
						<template v-else-if="header.unit === 'time'">
							{{ displayTimeValue(props.item, header.value) }}
						</template>
						<template v-else>
							{{ displayLoadingValue(props.item, header.value, header.precision, header.unit) }}
						</template>
					</td>
				</tr>
			</template>
		</v-data-table>

		<v-menu v-model="contextMenu.shown" :position-x="contextMenu.x" :position-y="contextMenu.y" absolute offset-y>
			<v-list>
				<slot name="context-menu"></slot>

				<v-list-item v-show="!noDownload && innerValue.length === 1 && filesSelected" @click="download">
					<v-icon class="mr-1">mdi-cloud-download</v-icon>
					{{ $tc("list.baseFileList.download", innerValue.length) }}
				</v-list-item>
				<v-list-item v-show="!noEdit && innerValue.length === 1 && filesSelected" :disabled="!canEditFile"
							 @click="edit(innerValue[0])">
					<v-icon class="mr-1">mdi-file-document-edit</v-icon>
					{{ $t("list.baseFileList.edit") }}
				</v-list-item>
				<v-list-item v-show="!noRename && innerValue.length === 1" @click="rename">
					<v-icon class="mr-1">mdi-rename-box</v-icon>
					{{ $t("list.baseFileList.rename") }}
				</v-list-item>
				<v-list-item v-show="!noDelete" @click="remove()">
					<v-icon class="mr-1">mdi-delete</v-icon>
					{{ $t("list.baseFileList.delete") }}
				</v-list-item>
				<v-list-item v-show="!foldersSelected && innerValue.length > 1" @click="downloadZIP()">
					<v-icon class="mr-1">mdi-package-down</v-icon>
					{{ $t("list.baseFileList.downloadZIP") }}
				</v-list-item>
			</v-list>
		</v-menu>

		<file-edit-dialog :shown.sync="editDialog.shown" :filename="editDialog.filename" v-model="editDialog.content"
						  @editComplete="$emit('fileEdited', $event)" />
		<input-dialog :shown.sync="renameDialog.shown" :title="$t('dialog.renameFile.title')"
					  :prompt="$t('dialog.renameFile.prompt')" :preset="renameDialog.item && renameDialog.item.name"
					  @confirmed="renameCallback" />
	</div>
</template>

<script lang="ts">
import JSZip from "jszip";
import saveAs from "file-saver";
import { mapState } from "pinia";
import Vue, { PropType } from "vue";
import { DataItemProps, DataTableHeader } from "vuetify";
import { VDataTable } from "vuetify/lib";

import i18n from "@/i18n";
import { SortingTable, useCacheStore } from "@/store/cache";
import { FileListItem } from "@/store/connector/BaseConnector";
import { FileTransferItem, useMachineStore } from "@/store/machine";
import { DisconnectedError, getErrorMessage, OperationCancelledError } from "@/utils/errors";
import Events from "@/utils/events";
import Path from "@/utils/path";
import { LogType, log } from "@/utils/logging";
import { makeNotification } from "@/utils/notifications";
import { displayTime } from "@/utils/display";

/**
 * Maximum permitted size of files to edit (defaults to 32MiB)
 */
const maxEditFileSize = 33554432;

interface ExtraFileListItemOptions {
	filaments?: Array<number>;
}

export type BaseFileListHeader = DataTableHeader & { precision?: number, unit?: string };
export type BaseFileListItem = FileListItem & ExtraFileListItemOptions;

export interface BaseFileListDataTransfer {
	type: string;
	directory: string;
	items: Array<BaseFileListItem>;
}

export function isBaseFileListDataTransfer(data: any): data is BaseFileListDataTransfer {
	return (data.type === "dwcFiles" && typeof data.directory === "string" && data.items instanceof Array);
}

export default VDataTable.extend({
	props: {
		headers: Array as PropType<Array<BaseFileListHeader>>,
		sortTable: String as PropType<SortingTable>,
		directory: {
			type: String,
			required: true
		},
		filelist: Array as PropType<Array<BaseFileListItem>>,
		value: Array as PropType<Array<BaseFileListItem>>,
		fileIcon: {
			type: String,
			default: "mdi-file"
		},
		folderIcon: {
			type: String,
			default: "mdi-folder"
		},
		loading: Boolean,
		doingFileOperation: Boolean,
		noDragDrop: Boolean,
		noDownload: Boolean,
		noEdit: Boolean,
		noFilesText:
		{
			type: String,
			default: ""
		},
		noRename: Boolean,
		noDelete: Boolean
	},
	computed: {
		...mapState(useMachineStore, ["isConnected", "changingMultipleFiles"]),
		isMounted(): boolean {
			const volume = Path.getVolume(this.innerDirectory), machineStore = useMachineStore();
			return (volume >= 0) && (volume < machineStore.model.volumes.length) && machineStore.model.volumes[volume].mounted;
		},
		defaultHeaders(): Array<BaseFileListHeader> {
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
				}
			];
		},
		isLoading(): boolean {
			return this.loading || this.innerLoading || this.doingFileOperation || this.innerDoingFileOperation;
		},
		foldersSelected(): boolean {
			return this.innerValue.some(item => item.isDirectory)
		},
		filesSelected(): boolean {
			return this.innerValue.some(item => !item.isDirectory)
		},
		canEditFile(): boolean {
			return (this.innerValue.length > 0) && (this.innerValue[0].size < maxEditFileSize);
		},
		noItemsText(): string {
			return (this.innerFilelistLoaded || this.isMounted || !this.isConnected) ? this.noFilesText : "list.baseFileList.driveUnmounted";
		},
		internalSortBy: {
			get(): string { return useCacheStore().sorting[this.sortTable].column; },
			set(value: string) { useCacheStore().sorting[this.sortTable].column = value; }
		},
		internalSortDesc: {
			get(): boolean { return useCacheStore().sorting[this.sortTable].descending; },
			set(value: boolean) { useCacheStore().sorting[this.sortTable].descending = value; }
		}
	},
	data() {
		return {
			initialDirectory: this.directory,
			innerDirectory: this.directory,
			innerFilelist: new Array<BaseFileListItem>(),
			innerFilelistLoaded: false,
			innerLoading: false,
			innerDoingFileOperation: false,
			refreshAfterTransfer: false,
			innerValue: new Array<BaseFileListItem>(),
			prevSelection: new Array<BaseFileListItem>(),
			contextMenu: {
				shown: false,
				touchTimer: null as NodeJS.Timeout | null,
				x: 0,
				y: 0
			},
			editDialog: {
				shown: false,
				filename: "",
				content: ""
			},
			renameDialog: {
				shown: false,
				directory: "",
				item: null as BaseFileListItem | null
			}
		}
	},
	methods: {
		toggleAll() {
			this.innerValue = this.innerValue.length ? [] : this.innerFilelist.slice();
		},
		sort(items: Array<BaseFileListItem>, sortBy: Array<keyof BaseFileListItem> = ["name"], sortDesc: Array<boolean>) {
			// Sort by index
			items.sort((a, b) => {
				const first = a[sortBy[0]], second = b[sortBy[0]];
				if (first === second) {
					return 0;
				}
				if (first === null || first === undefined) {
					return -1;
				}
				if (second === null || second === undefined) {
					return 1;
				}
				if (typeof first === "number" && typeof second === "number") {
					return first - second;
				}
				if (typeof first === "string" && typeof second === "string") {
					return first.localeCompare(second, undefined, { sensitivity: "base" });
				}
				if (first instanceof Array && second instanceof Array) {
					const firstSum = first.length ? first.reduce((a: number, b: number) => a + b) : 0;
					const secondSum = second.length ? second.reduce((a: number, b: number) => a + b) : 0;
					return firstSum - secondSum;
				}
				if (first instanceof Date && second instanceof Date) {
					return first.getTime() - second.getTime();
				}
				console.warn(`[base-file-list] Invalid sort key type ${sortBy} (${typeof first})`);
				return 0;
			});

			// Deal with descending order
			if (sortDesc[0]) {
				items.reverse();
			}

			// Then make sure directories come first
			items.sort((a, b) => (a.isDirectory === b.isDirectory) ? 0 : (a.isDirectory ? -1 : 1));
			return items;
		},
		refresh() {
			this.$nextTick(() => this.loadDirectory(this.innerDirectory));
		},
		async loadDirectory(directory: string) {
			// Make sure the requested volume is actually available
			const volume = Path.getVolume(this.directory), machineStore = useMachineStore();
			if (!this.isConnected || ((volume >= 0) && (volume < machineStore.model.volumes.length) && !machineStore.model.volumes[volume].mounted)) {
				this.innerDirectory = (volume === Path.getVolume(this.initialDirectory)) ? this.initialDirectory : `${volume}:`;
				this.innerFilelist = [];
				this.innerFilelistLoaded = false;
				return;
			}

			// Update our path even if we"re still busy loading
			this.innerDirectory = directory;
			if (this.innerLoading) {
				return;
			}

			// Load file list
			this.innerLoading = true;
			this.innerFilelistLoaded = false;
			try {
				const files = await machineStore.getFileList(directory);

				// Create missing props if required
				if (this.headers) {
					for (const file of files) {
						for (const header of this.headers) {
							if (!(header.value in file)) {
								Vue.set(file, header.value, undefined);
							}
						}
					}
				}

				// Check if another directory was requested while files were being loaded
				if (directory !== this.innerDirectory) {
					this.innerLoading = false
					this.loadDirectory(this.innerDirectory);
					return;
				}

				// Assign new file list
				this.innerFilelist = files;
				this.innerFilelistLoaded = true;
				this.innerValue = [];
				this.$nextTick(function () {
					this.$emit("directoryLoaded", directory);
				});
			} catch (e) {
				if (!(e instanceof DisconnectedError)) {
					console.warn(e);
					makeNotification(LogType.error, this.$t("error.filelistRequestFailed"), getErrorMessage(e));
				}
			}
			this.innerLoading = false;
		},
		displayLoadingValue(item: BaseFileListItem, prop: keyof BaseFileListItem, precision?: number, unit = "") {
			if (item.isDirectory) {
				return "";
			}

			const itemValue = item[prop];
			if (itemValue === undefined) {
				return this.$t("generic.loading");
			}
			if (itemValue === null) {
				return this.$t("generic.noValue");
			}

			let displayValue: string | number | bigint | boolean | Date;
			if (itemValue instanceof Array) {
				if (itemValue.length === 0) {
					return this.$t("generic.noValue");
				}
				displayValue = itemValue.reduce((a, b) => a + b);
			} else {
				displayValue = itemValue;
			}

			if (typeof displayValue === "number" && precision !== undefined) {
				displayValue = displayValue.toFixed(precision);
			}
			return `${displayValue} ${unit}`;
		},
		displayTimeValue(item: BaseFileListItem, prop: keyof BaseFileListItem) {
			if (item.isDirectory) {
				return "";
			}
			const itemValue = item[prop];
			return (typeof itemValue === "number") ? displayTime(itemValue) : this.$t("generic.noValue");
		},
		onItemTouchStart(props: DataItemProps, e: TouchEvent) {
			const that = this;
			this.contextMenu.touchTimer = setTimeout(function () {
				that.contextMenu.touchTimer = null;
				that.onItemContextmenu(props, new MouseEvent("contextmenu", { clientX: e.targetTouches[0].clientX, clientY: e.targetTouches[0].clientY }));
			}, 1000);
		},
		onItemTouchEnd() {
			if (this.contextMenu.touchTimer) {
				clearTimeout(this.contextMenu.touchTimer);
				this.contextMenu.touchTimer = null;
			}
		},
		onItemClick(props: DataItemProps) {
			if (props.item.isDirectory) {
				this.loadDirectory(Path.combine(this.innerDirectory, props.item.name));
			} else {
				this.$emit("fileClicked", props.item);
			}
		},
		onItemContextmenu(props: DataItemProps, e: MouseEvent) {
			if (this.contextMenu.shown) {
				return;
			}
			this.onItemTouchEnd();

			// Deal with selection
			this.prevSelection = this.innerValue;
			if (!props.isSelected) {
				this.innerValue = [];
				this.$nextTick(() => props.select(true));
			}

			// Open the context menu
			this.contextMenu.shown = false;
			this.contextMenu.x = e.clientX;
			this.contextMenu.y = e.clientY;
			this.$nextTick(() => {
				this.contextMenu.shown = true;
			});
		},
		onItemDragStart(item: BaseFileListItem, e: DragEvent) {
			if (this.noDragDrop || this.contextMenu.touchTimer || this.contextMenu.shown || e.target === null || e.dataTransfer === null) {
				return;
			}

			const itemsToDrag = this.innerValue;
			if (itemsToDrag.indexOf(item) === -1) {
				itemsToDrag.push(item);
			}
			e.dataTransfer.setData("application/json", JSON.stringify({
				type: "dwcFiles",
				directory: this.innerDirectory,
				items: itemsToDrag
			} as BaseFileListDataTransfer));
			e.dataTransfer.effectAllowed = "move";

			const table = this.$el.querySelector("table") as HTMLTableElement, firstRow = table.tBodies[0].rows[0];
			const tableClone = table.cloneNode(true) as HTMLTableElement, itemFilename = (item.isDirectory ? "*" : "") + item.name;
			let offsetY = 0, countingOffset = true;

			tableClone.tHead?.remove();
			Array.from(tableClone.tBodies[0].rows).forEach(function (row) {
				const filename = row.dataset.filename;
				if (itemsToDrag.some(item => (item.isDirectory ? "*" : "") + item.name === filename)) {
					Array.from(row.children).forEach((td, index) => {
						if (td.tagName === "TD") {
							(td as HTMLTableCellElement).style.width = `${(firstRow.children[index] as HTMLTableCellElement).offsetWidth}px`;
						} else {
							td.remove();
						}
					});

					if (countingOffset) {
						if (filename === itemFilename) {
							countingOffset = false;
						} else {
							offsetY += firstRow.offsetHeight;
						}
					}
				} else {
					row.remove();
				}
			}, this);
			tableClone.style.backgroundColor = this.$vuetify.theme.dark ? "#424242" : "#FFFFFF";
			tableClone.style.position = "absolute";
			tableClone.style.top = "-1000px";
			tableClone.style.left = "0px";
			tableClone.style.pointerEvents = "none";
			Array.from(tableClone.querySelectorAll("[class^='v-ripple']")).forEach((item) => {
				Array.from(item.classList)
					.filter(c => c.startsWith("v-ripple"))
					.forEach(c => item.classList.remove(c));
			});
			table.parentNode?.append(tableClone);

			const x = e.clientX - table.getClientRects()[0].left;
			const y = e.clientY - (e.target as HTMLTableRowElement).getClientRects()[0].top + offsetY;
			e.dataTransfer.setDragImage(tableClone, x, y);

			setTimeout(() => tableClone.remove(), 0);
		},
		onItemDragOver(item: BaseFileListItem, e: DragEvent) {
			if (!this.noDragDrop && item.isDirectory && e.dataTransfer !== null) {
				const jsonData = e.dataTransfer.getData("application/json");
				if (jsonData) {
					const data = JSON.parse(jsonData);
					if (isBaseFileListDataTransfer(data) && !data.items.some(dataItem => dataItem.isDirectory && dataItem.name === item.name)) {
						e.preventDefault();
						e.stopPropagation();
					}
				} else {
					// Fix for Chrome: It does not grant access to dataTransfer on the same domain "for security reasons"...
					e.preventDefault();
					e.stopPropagation();
				}
			}
		},
		async onItemDragDrop(item: BaseFileListItem, e: DragEvent) {
			if (e.dataTransfer === null) {
				return;
			}

			const jsonData = e.dataTransfer.getData("application/json");
			if (jsonData) {
				const data = JSON.parse(jsonData);
				if (isBaseFileListDataTransfer(data) && !data.items.some(dataItem => dataItem.isDirectory && dataItem.name === item.name)) {
					const directory = this.innerDirectory, machineStore = useMachineStore();
					for (const dragItem of data.items) {
						const from = Path.combine(data.directory, dragItem.name), to = Path.combine(directory, item.name, dragItem.name);
						try {
							await machineStore.move(from, to);
						} catch (e) {
							makeNotification(LogType.error, `Failed to move ${dragItem.name} to ${directory}`, getErrorMessage(e));
							break;
						}
					}
				}
			}
		},
		async download(item: BaseFileListItem) {
			try {
				const filename = (item && item.name) ? item.name : this.innerValue[0].name, machineStore = useMachineStore();
				const data: Blob = await machineStore.download({ filename: Path.combine(this.innerDirectory, filename), type: "blob" });
				saveAs(data, filename);
			} catch (e) {
				if (!(e instanceof DisconnectedError) && !(e instanceof OperationCancelledError)) {
					// should be handled before we get here
					console.warn(e);
				}
			}
		},
		async edit(item: BaseFileListItem) {
			try {
				const filename = Path.combine(this.innerDirectory, item.name), machineStore = useMachineStore();
				const response: string = await machineStore.download({ filename, type: "text" }, true, false);
				this.editDialog.filename = filename;
				this.editDialog.content = response;
				this.editDialog.shown = true;
			} catch (e) {
				if (!(e instanceof DisconnectedError) && !(e instanceof OperationCancelledError)) {
					// should be handled before we get here
					console.warn(e);
				}
			}
		},
		rename(item: BaseFileListItem) {
			this.renameDialog.directory = this.innerDirectory;
			this.renameDialog.item = (item && item.name) ? item : this.innerValue[0];
			this.renameDialog.shown = true;
		},
		async renameCallback(newFilename: string) {
			const oldFilename = this.renameDialog.item!.name;
			if (this.innerDoingFileOperation) {
				return;
			}

			this.innerDoingFileOperation = true;
			try {
				const machineStore = useMachineStore();
				await machineStore.move(Path.combine(this.renameDialog.directory, oldFilename), Path.combine(this.renameDialog.directory, newFilename));
				makeNotification(LogType.success, this.$t("notification.rename.success", [oldFilename, newFilename]));
			} catch (e) {
				console.warn(e);
				log(LogType.error, this.$t("notification.rename.error", [oldFilename, newFilename]), getErrorMessage(e));
			}
			this.innerDoingFileOperation = false;
		},
		async remove(items?: Array<BaseFileListItem>) {
			if (!items) {
				items = this.innerValue.slice();
			}

			if (this.innerDoingFileOperation) {
				return;
			}

			this.innerDoingFileOperation = true;
			const deletedItems = [], directory = this.directory, machineStore = useMachineStore();
			for (let i = 0; i < items.length; i++) {
				try {
					const item = items[i];
					await machineStore.delete(Path.combine(directory, item.name), item.isDirectory ? true : undefined);

					deletedItems.push(items[i]);
					this.innerFilelist = this.innerFilelist.filter(file => file.isDirectory !== item.isDirectory || file.name !== item.name);
					this.innerValue = this.innerValue.filter(file => file.isDirectory !== item.isDirectory || file.name !== item.name);
				} catch (e) {
					makeNotification(LogType.error, this.$t("notification.delete.errorTitle", [items[i].name]), getErrorMessage(e));
				}
			}

			if (deletedItems.length) {
				log(LogType.success, (deletedItems.length > 1) ? this.$t("notification.delete.successMultiple", [deletedItems.length]) : this.$t("notification.delete.success", [deletedItems[0].name]));
			}
			this.innerDoingFileOperation = false;
		},
		async downloadZIP(items?: Array<BaseFileListItem>) {
			if (!items || !(items instanceof Array)) {
				items = this.innerValue.slice();
			}

			// Download the selected files
			let downloadedFiles: Array<FileTransferItem>;
			try {
				const machineStore = useMachineStore();
				downloadedFiles = await machineStore.download(items.map(item => ({ filename: Path.combine(this.directory, item.name), type: "blob" })), true, true, true, true);
			} catch (e) {
				if (!(e instanceof DisconnectedError) && !(e instanceof OperationCancelledError)) {
					// should be handled before we get here
					console.warn(e);
				}
				return;
			}

			// Compress downloaded files and save the new archive
			const notification = makeNotification(LogType.info, this.$t("notification.compress.title"), this.$t("notification.compress.message"), 0);
			try {
				const zip = new JSZip();
				for(const file of downloadedFiles) {
					zip.file(Path.extractFileName(file.filename), file.content);
				}

				const zipBlob = await zip.generateAsync({ type: "blob" });
				saveAs(zipBlob, "download.zip");
			} catch (e) {
				console.warn(e);
				makeNotification(LogType.error, this.$t("notification.compress.errorTitle"), getErrorMessage(e));
			}
			notification.close();
		},

		filesOrDirectoriesChanged({ files, volume }: { files?: Array<string>, volume?: number }) {
			if ((files !== undefined && Path.filesAffectDirectory(files, this.directory)) || (volume === Path.getVolume(this.directory))) {
				// File or directory has been changed in the current directory
				if (this.changingMultipleFiles) {
					this.refreshAfterTransfer = true;
				} else {
					this.refresh();
				}
			}
		}
	},
	mounted() {
		// Perform initial load
		if (this.isConnected) {
			this.refresh();
		}

		// Keep track of file changes
		Events.on("filesOrDirectoriesChanged", this.filesOrDirectoriesChanged);
	},
	beforeDestroy() {
		// No longer keep track of file changes
		Events.off("filesOrDirectoriesChanged", this.filesOrDirectoriesChanged);
	},
	watch: {
		isConnected(to: boolean) {
			if (to) {
				this.refresh();
			} else {
				this.innerDirectory = this.initialDirectory;
				this.innerFilelist = [];

				this.editDialog.shown = false;
				this.renameDialog.shown = false;
			}
		},
		isMounted(to: boolean) {
			if (!to || !this.innerFilelistLoaded) {
				this.refresh();
			}
		},
		transferringFiles(to: boolean) {
			if (!to && this.refreshAfterTransfer) {
				this.refreshAfterTransfer = false;
				this.refresh();
			}
		},
		directory(to: string) {
			this.loadDirectory(to);
		},
		innerDirectory(to: string) {
			if (this.directory !== to) {
				this.$emit("update:directory", to);
			}
		},
		innerFilelist(to: Array<BaseFileListItem>) {
			if (this.filelist !== to) {
				this.$emit("update:filelist", to);
			}
		},
		innerLoading(to: boolean) {
			if (this.loading !== to) {
				this.$emit("update:loading", to);
			}
		},
		innerValue(to: Array<BaseFileListItem>) {
			if (this.value !== to) {
				this.$emit("input", to);
			}
		},
		"contextMenu.shown"(to: boolean) {
			if (!to) {
				// Restore previously selected items
				this.innerValue = this.prevSelection;
			}
		}
	}
});
</script>
