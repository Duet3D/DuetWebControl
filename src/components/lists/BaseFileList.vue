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
		<v-data-table v-model="innerValue" v-bind="$props"
			:items="innerFilelist" item-key="name" :headers="headers || defaultHeaders" show-select 
			:loading="loading || innerLoading"
			:custom-sort="sort" :sort-by.sync="internalSortBy" :sort-desc.sync="internalSortDesc" must-sort
			disable-pagination hide-default-footer :mobile-breakpoint="0"
			class="base-file-list elevation-3" :class="{ 'empty-table-fix' : !innerFilelist.length, 'loading-cursor' : isLoading }">

			<template #progress>
				<slot name="progress">
					<v-progress-linear indeterminate></v-progress-linear>
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
				<tr v-ripple :active="props.isSelected" @keydown.space.prevent="props.select(!props.isSelected)"
					@touchstart="onItemTouchStart(props, $event)" @touchend="onItemTouchEnd"
					@click="onItemClick(props)" @keydown.enter.prevent="onItemClick(props)"
					@contextmenu.prevent="onItemContextmenu(props, $event)" @keydown.escape.prevent="contextMenu.shown = false"
					@dragstart="onItemDragStart(props.item, $event)" @dragover="onItemDragOver(props.item, $event)" @drop.prevent="onItemDragDrop(props.item, $event)"
					:data-filename="(props.item.isDirectory ? '*' : '') + props.item.name" draggable="true" tabindex="0">

					<td v-for="header in props.headers" :key="header.value" :class="{ 'pr-0': header.value === 'data-table-select' }">
						<template v-if="header.value === 'data-table-select'">
							<v-checkbox :input-value="props.isSelected" @touchstart.stop="" @touchend.stop="" @click.stop.prevent="props.select(!props.isSelected)" primary hide-details class="mt-n1" tabindex="-1"></v-checkbox>
						</template>
						<template v-else-if="header.value === 'name'">
							<div class="d-inline-flex align-center">
								<slot :name="`${props.item.isDirectory ? 'folder' : 'file'}.${props.item.name}`">
									<v-icon class="mr-1">{{ props.item.isDirectory ? folderIcon : fileIcon }}</v-icon> {{ props.item.name }}
								</slot>
							</div>
						</template>
						<template v-else-if="header.unit === 'bytes'">
							{{ (props.item[header.value] !== null) ? $displaySize(props.item[header.value]) : '' }}
						</template>
						<template v-else-if="header.unit === 'date'">
							{{ props.item.lastModified ? props.item.lastModified.toLocaleString() : $t('generic.noValue') }}
						</template>
						<template v-else-if="header.unit === 'filaments'">
							<v-tooltip bottom :disabled="!props.item[header.value] || props.item[header.value].length <= 1">
								<template #activator="{ on }">
									<span v-on="on">
										{{ displayLoadingValue(props.item, header.value, 1, 'mm') }}
									</span>
								</template>

								{{ $display(props.item[header.value], 1, 'mm') }}
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
					<v-icon class="mr-1">mdi-cloud-download</v-icon> {{ $tc('list.baseFileList.download', innerValue.length) }}
				</v-list-item>
				<v-list-item v-show="!noEdit && innerValue.length === 1 && filesSelected" :disabled="!canEditFile" @click="edit(innerValue[0])">
					<v-icon class="mr-1">mdi-file-document-edit</v-icon> {{ $t('list.baseFileList.edit') }}
				</v-list-item>
				<v-list-item v-show="!noRename && innerValue.length === 1" @click="rename">
					<v-icon class="mr-1">mdi-rename-box</v-icon> {{ $t('list.baseFileList.rename') }}
				</v-list-item>
				<v-list-item v-show="!noDelete" @click="remove">
					<v-icon class="mr-1">mdi-delete</v-icon> {{ $t('list.baseFileList.delete') }}
				</v-list-item>
				<v-list-item v-show="!foldersSelected && innerValue.length > 1" @click="downloadZIP">
					<v-icon class="mr-1">mdi-package-down</v-icon> {{ $t('list.baseFileList.downloadZIP') }}
				</v-list-item>
			</v-list>
		</v-menu>

		<file-edit-dialog :shown.sync="editDialog.shown" :filename="editDialog.filename" v-model="editDialog.content" @editComplete="$emit('fileEdited', $event)"></file-edit-dialog>
		<input-dialog :shown.sync="renameDialog.shown" :title="$t('dialog.renameFile.title')" :prompt="$t('dialog.renameFile.prompt')" :preset="renameDialog.item && renameDialog.item.name" @confirmed="renameCallback"></input-dialog>
	</div>
</template>

<script>
'use strict'

import JSZip from 'jszip'
import saveAs from 'file-saver'
import { VDataTable } from 'vuetify/lib'

import Vue from 'vue'
import { mapState, mapGetters, mapActions, mapMutations } from 'vuex'

import i18n from '../../i18n'
import { defaultMachine, getModifiedDirectories } from '../../store/machine'
import { DisconnectedError, OperationCancelledError } from '../../utils/errors.js'
import Path from '../../utils/path.js'

const maxEditFileSize = 15728640;		// 15 MiB

export default {
	props: {
		headers: Array,
		sortTable: String,
		directory: {
			type: String,
			required: true
		},
		filelist: Array,
		value: Array,
		fileIcon: {
			type: String,
			default: 'mdi-file'
		},
		folderIcon: {
			type: String,
			default: 'mdi-folder'
		},
		loading: Boolean,
		doingFileOperation: Boolean,
		noDragDrop: Boolean,
		noDownload: Boolean,
		noEdit: Boolean,
		noFilesText:
		{
			type: String,
			default: ''
		},
		noRename: Boolean,
		noDelete: Boolean
	},
	computed: {
		...mapState(['selectedMachine']),
		...mapGetters(['isConnected']),
		...mapState('machine', ['isReconnecting']),
		...mapState('machine/cache', ['sorting']),
		...mapState('machine/model', ['volumes']),
		defaultHeaders() {
			return [
				{
					text: i18n.t('list.baseFileList.fileName'),
					value: 'name'
				},
				{
					text: i18n.t('list.baseFileList.size'),
					value: 'size',
					unit: 'bytes'
				},
				{
					text: i18n.t('list.baseFileList.lastModified'),
					value: 'lastModified',
					unit: 'date'
				}
			];
		},
		isLoading() {
			return this.loading || this.innerLoading || this.doingFileOperation || this.innerDoingFileOperation;
		},
		foldersSelected() {
			return this.innerValue.some(item => item.isDirectory)
		},
		filesSelected() {
			return this.innerValue.some(item => !item.isDirectory)
		},
		canEditFile() {
			return (this.innerValue.length > 0) && (this.innerValue[0].size < maxEditFileSize);
		},
		noItemsText() {
			if (this.selectedMachine === defaultMachine) {
				return this.noFilesText;
			}
			const volume = Path.getVolume(this.innerDirectory);
			return (volume >= 0 && volume < this.volumes.length && this.volumes[volume].mounted) ? this.noFilesText : 'list.baseFileList.driveUnmounted';
		},
		internalSortBy: {
			get() { return this.sorting[this.sortTable].column; },
			set(value) {
				this.setSorting({ table: this.sortTable, column: value, descending: this.internalSortDesc });
			}
		},
		internalSortDesc: {
			get() { return this.sorting[this.sortTable].descending; },
			set(value) {
				this.setSorting({ table: this.sortTable, column: this.internalSortBy, descending: value });
			}
		}
	},
	data() {
		return {
			unsubscribe: undefined,
			wasMounted: false,
			initialDirectory: this.directory,
			innerDirectory: this.directory,
			innerFilelist: [],
			innerLoading: false,
			innerDoingFileOperation: false,
			innerValue: [],
			prevSelection: [],
			contextMenu: {
				shown: false,
				touchTimer: undefined,
				x: 0,
				y: 0
			},
			editDialog: {
				shown: false,
				filename: '',
				content: ''
			},
			renameDialog: {
				shown: false,
				directory: '',
				item: null
			}
		}
	},
	extends: VDataTable,
	methods: {
		...mapActions('machine', {
			machineDownload: 'download',
			machineMove: 'move',
			machineDelete: 'delete',
			getFileList: 'getFileList'
		}),
		...mapMutations('machine/cache', ['setSorting']),
		toggleAll() {
			this.innerValue = this.innerValue.length ? [] : this.innerFilelist.slice();
		},
		sort(items, sortBy, sortDesc) {
			sortBy = sortBy.length ? sortBy[0] : 'name';
			sortDesc = sortDesc[0];

			// Sort by index
			items.sort(function(a, b) {
				if (a[sortBy] === b[sortBy]) {
					return 0;
				}
				if (a[sortBy] === null || a[sortBy] === undefined) {
					return -1;
				}
				if (b[sortBy] === null || b[sortBy] === undefined) {
					return 1;
				}
				if (a[sortBy].constructor === String && b[sortBy].constructor === String) {
					return a[sortBy].localeCompare(b[sortBy], undefined, { sensivity: 'base' });
				}
				if (a[sortBy] instanceof Array && b[sortBy] instanceof Array) {
					const reducedA = a[sortBy].length ? a.filament.reduce((a, b) => a + b) : 0;
					const reducedB = b[sortBy].length ? b.filament.reduce((a, b) => a + b) : 0;
					return reducedA - reducedB;
				}
				return a[sortBy] - b[sortBy];
			});

			// Deal with descending order
			if (sortDesc) {
				items.reverse();
			}

			// Then make sure directories come first
			items.sort((a, b) => (a.isDirectory === b.isDirectory) ? 0 : (a.isDirectory ? -1 : 1));
			return items;
		},
		async refresh() {
			await this.loadDirectory(this.innerDirectory);
		},
		async loadDirectory(directory) {
			if (!this.isConnected) {
				return;
			}

			// Update our path even if we're still busy loading
			this.innerDirectory = directory;
			if (this.innerLoading) {
				return;
			}

			// Make sure the current volume is actually available
			const volume = Path.getVolume(this.innerDirectory);
			if (volume < 0 || volume >= this.volumes.length || !this.volumes[volume].mounted) {
				this.innerDirectory = (volume === 0) ? this.initialDirectory : `${volume}:`;
				this.innerFilelist = [];
				return;
			}

			// Load file list
			this.innerLoading = true;
			try {
				const files = await this.getFileList(directory);

				// Create missing props if required
				if (this.headers) {
					files.forEach(function(item) {
						this.headers.forEach(function(header) {
							if (item[header.value] === undefined) {
								Vue.set(item, header.value, undefined);
							}
						});
					}, this);
				}

				// Check if another directory was requested while files were being loaded
				if (directory !== this.innerDirectory) {
					this.innerLoading = false;
					this.loadDirectory(this.innerDirectory);
					return;
				}

				// Assign new file list
				this.innerFilelist = files;
				this.innerValue = [];
				this.$nextTick(function() {
					this.$emit('directoryLoaded', directory);
				});
			} catch (e) {
				if (!(e instanceof DisconnectedError)) {
					console.warn(e);
					this.$makeNotification('error', this.$t('error.filelistRequestFailed'), e.message);
				}
			}
			this.innerLoading = false;
		},
		displayLoadingValue(item, prop, precision, unit = '') {
			if (item.isDirectory) {
				return '';
			}
			if (!item[prop]) {
				return this.$t((item[prop] === undefined) ? 'generic.loading' : 'generic.noValue');
			}

			let displayValue;
			if (item[prop] instanceof Array) {
				if (!item[prop].length) {
					return this.$t('generic.noValue');
				}
				displayValue = item[prop].reduce((a, b) => a + b);
			} else {
				displayValue = item[prop];
			}

			if (precision !== undefined) {
				displayValue = displayValue.toFixed(precision);
			}
			return `${displayValue} ${unit}`;
		},
		displayTimeValue(item, prop) {
			if (item.isDirectory) {
				return '';
			}
			return (item[prop] !== null) ? this.$displayTime(item[prop]) : this.$t('generic.noValue');
		},
		onItemTouchStart(props, e) {
			const that = this;
			this.contextMenu.touchTimer = setTimeout(function() {
				that.contextMenu.touchTimer = undefined;
				that.onItemContextmenu(props, { clientX: e.targetTouches[0].clientX, clientY: e.targetTouches[0].clientY });
			}, 1000);
		},
		onItemTouchEnd() {
			if (this.contextMenu.touchTimer) {
				clearTimeout(this.contextMenu.touchTimer);
				this.contextMenu.touchTimer = undefined;
			}
		},
		onItemClick(props) {
			if (props.item.isDirectory) {
				this.loadDirectory(Path.combine(this.innerDirectory, props.item.name));
			} else {
				this.$emit('fileClicked', props.item);
			}
		},
		onItemContextmenu(props, e) {
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
		onItemDragStart(item, e) {
			if (this.noDragDrop || this.contextMenu.touchTimer || this.contextMenu.shown) {
				return;
			}

			const itemsToDrag = this.innerValue;
			if (itemsToDrag.indexOf(item) === -1) {
				itemsToDrag.push(item);
			}
			e.dataTransfer.setData('application/json', JSON.stringify({
				type: 'dwcFiles',
				directory: this.innerDirectory,
				items: itemsToDrag
			}));
			e.dataTransfer.effectAllowed = 'move';

			const table = this.$el.querySelector('table'), firstRow = table.tBodies[0].rows[0];
			const tableClone = table.cloneNode(true), itemFilename = (item.isDirectory ? '*' : '') + item.name;
			let offsetY = 0, countingOffset = true;

			tableClone.tHead.remove();
			Array.from(tableClone.tBodies[0].rows).forEach(function(row) {
				const filename = row.dataset.filename;
				if (itemsToDrag.some(item => (item.isDirectory ? '*' : '') + item.name === filename)) {
					Array.from(row.children).forEach(function(td, index) {
						if (td.tagName === 'TD') {
							td.style.width = `${firstRow.children[index].offsetWidth}px`;
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
			tableClone.style.backgroundColor = this.$vuetify.theme.isDark ? '#424242' : '#FFFFFF';
			tableClone.style.opacity = 0.7;
			tableClone.style.position = 'absolute';
			tableClone.style.pointerEvents = 'none';
			Array.from(tableClone.querySelectorAll('[class^="v-ripple"]')).forEach(function(item) {
				item.classList = Array.from(item.classList).filter(c => !c.startsWith('v-ripple'));
			});
			table.parentNode.append(tableClone);

			const x = e.clientX - table.getClientRects()[0].left;
			const y = e.clientY - e.target.closest('tr').getClientRects()[0].top + offsetY;
			e.dataTransfer.setDragImage(tableClone, x, y);

			setTimeout(() => tableClone.remove(), 0);
		},
		onItemDragOver(item, e) {
			if (!this.noDragDrop && item.isDirectory) {
				const jsonData = e.dataTransfer.getData('application/json');
				if (jsonData) {
					const data = JSON.parse(jsonData);
					if (data.type === 'dwcFiles' && !data.items.some(dataItem => dataItem.isDirectory && dataItem.name === item.name)) {
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
		async onItemDragDrop(item, e) {
			const jsonData = e.dataTransfer.getData('application/json');
			if (jsonData) {
				const data = JSON.parse(jsonData);
				if (data.type === 'dwcFiles' && !data.items.some(dataItem => dataItem.isDirectory && dataItem.name === item.name)) {
					const directory = this.innerDirectory;
					for (let i = 0; i < data.items.length; i++) {
						const from = Path.combine(data.directory, data.items[i].name);
						const to = Path.combine(directory, item.name, data.items[i].name);
						try {
							await this.machineMove({ from, to });
						} catch (e) {
							this.$makeNotification('error', `Failed to move ${data.items[i].name} to ${directory}`, e.message);
							break;
						}
					}
				}
			}
		},
		async download(item) {
			try {
				const filename = (item && item.name) ? item.name : this.innerValue[0].name;
				const blob = await this.machineDownload({ filename: Path.combine(this.innerDirectory, filename), type: 'blob' });
				saveAs(blob, filename);
			} catch (e) {
				if (!(e instanceof DisconnectedError) && !(e instanceof OperationCancelledError)) {
					// should be handled before we get here
					console.warn(e);
				}
			}
		},
		async edit(item) {
			try {
				const filename = Path.combine(this.innerDirectory, item.name);
				const response = await this.machineDownload({ filename, type: 'text', showSuccess: false });
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
		async rename(item) {
			this.renameDialog.directory = this.innerDirectory;
			this.renameDialog.item = (item && item.name) ? item : this.innerValue[0];
			this.renameDialog.shown = true;
		},
		async renameCallback(newFilename) {
			const oldFilename = this.renameDialog.item.name;
			if (this.innerDoingFileOperation) {
				return;
			}

			this.innerDoingFileOperation = true;
			try {
				await this.machineMove({
					from: Path.combine(this.renameDialog.directory, oldFilename),
					to: Path.combine(this.renameDialog.directory, newFilename)
				});

				this.innerFilelist.some(function(file) {
					if (file.isDirectory === this.isDirectory && file.name === this.name) {
						file.name = newFilename;
						return true;
					}
					return false;
				}, this.renameDialog.item);

				this.$makeNotification('success', this.$t('notification.rename.success', [oldFilename, newFilename]));
			} catch (e) {
				console.warn(e);
				this.$log('error', this.$t('notification.rename.error', [oldFilename, newFilename]), e.message);
			}
			this.innerDoingFileOperation = false;
		},
		async remove(items) {
			if (!items || !(items instanceof Array)) {
				items = this.innerValue.slice();
			}

			if (this.innerDoingFileOperation) {
				return;
			}

			this.innerDoingFileOperation = true;
			const deletedItems = [], directory = this.directory;
			for (let i = 0; i < items.length; i++) {
				try {
					const item = items[i];
					await this.machineDelete(Path.combine(directory, item.name));

					deletedItems.push(items[i]);
					this.innerFilelist = this.innerFilelist.filter(file => file.isDirectory !== item.isDirectory || file.name !== item.name);
					this.innerValue = this.innerValue.filter(file => file.isDirectory !== item.isDirectory || file.name !== item.name);
				} catch (e) {
					this.$makeNotification('error', this.$t('notification.delete.errorTitle', [items[i].name]), items[i].isDirectory ? this.$t('notification.delete.errorMessageDirectory') : e.message);
				}
			}

			if (deletedItems.length) {
				this.$log('success', (deletedItems.length > 1) ? this.$t('notification.delete.successMultiple', [deletedItems.length]) : this.$t('notification.delete.success', [deletedItems[0].name]));
			}
			this.innerDoingFileOperation = false;
		},
		async downloadZIP(items) {
			if (!items || !(items instanceof Array)) { items = this.innerValue.slice(); }
			const directory = this.directory;

			// Download files
			const zip = new JSZip();
			for (let i = 0; i < items.length; i++) {
				try {
					const blob = await this.machineDownload({ filename: Path.combine(directory, items[i].name), type: 'blob', num: i + 1, count: items.length });
					zip.file(items[i].name, blob);
				} catch (e) {
					if (!(e instanceof DisconnectedError) && !(e instanceof OperationCancelledError)) {
						// should be handled before we get here
						console.warn(e);
					}
					return;
				}
			}

			// Compress files and save the new archive
			const notification = this.$makeNotification('info', this.$t('notification.compress.title'), this.$t('notification.compress.message'));
			try {
				const zipBlob = await zip.generateAsync({ type: 'blob' });
				saveAs(zipBlob, 'download.zip');
			} catch (e) {
				console.warn(e);
				this.$makeNotification('error', this.$t('notification.compress.errorTitle'), e.message);
			}
			notification.hide();
		}
	},
	mounted() {
		// Perform initial load
		if (this.isConnected) {
			const volume = Path.getVolume(this.innerDirectory);
			this.wasMounted = (volume >= 0) && (volume >= this.volumes.length) && this.volumes[volume].mounted;
			this.refresh();
		}

		// Keep track of file changes
		const that = this;
		this.unsubscribe = this.$store.subscribeAction(async function(action, state) {
			if (!that.doingFileOperation && !that.innerDoingFileOperation &&
				getModifiedDirectories(action, state).some(directory => Path.equals(directory, that.innerDirectory))) {
				// Refresh the list when a file or directory has been changed
				await that.refresh();
			}
		});
	},
	beforeDestroy() {
		this.unsubscribe();
	},
	watch: {
		isConnected(to) {
			if (to) {
				this.refresh();
			} else {
				this.innerDirectory = this.initialDirectory;
				this.innerFilelist = [];

				this.editDialog.shown = false;
				this.renameDialog.shown = false;
			}
		},
		selectedMachine() {
			// TODO store current directory per selected machine
			this.innerDirectory = this.initialDirectory;
			this.innerFilelist = [];

			this.editDialog.shown = false;
			this.renameDialog.shown = false;
		},
		volumes: {
			deep: true,
			handler() {
				if (this.isConnected) {
					const volume = Path.getVolume(this.directory);
					if (volume >= 0 && volume < this.volumes.length) {
						const mounted = this.volumes[volume].mounted;
						if (this.wasMounted !== mounted) {
							this.wasMounted = mounted;
							this.refresh();
						}
					} else {
						this.wasMounted = false;
						this.refresh();
					}
				}
			}
		},
		directory(to) {
			if (to !== this.innerDirectory) {
				this.loadDirectory(to);
			}
		},
		innerDirectory(to) {
			if (this.directory !== to) {
				this.$emit('update:directory', to);
			}
		},
		innerFilelist(to) {
			if (this.filelist !== to) {
				this.$emit('update:filelist', to);
			}
		},
		innerLoading(to) {
			if (this.loading !== to) {
				this.$emit('update:loading', to);
			}
		},
		innerValue(to) {
			if (this.value !== to) {
				this.$emit('input', to);
			}
		},
		'contextMenu.shown'(to) {
			if (!to) {
				// Restore previously selected items
				this.innerValue = this.prevSelection;
			}
		}
	}
}
</script>
