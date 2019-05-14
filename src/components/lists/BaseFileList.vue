<style scoped>
td {
	cursor: pointer;
}

th.checkbox {
	width: 1%;
}

.loading-cursor {
	cursor: wait;
}
.loading-cursor td {
	cursor: wait;
}
</style>

<template>
	<div>
		<v-data-table v-model="innerValue" v-bind="$props" :items="innerFilelist" :loading="loading || innerLoading" :custom-sort="sort" :pagination.sync="innerPagination" select-all hide-actions item-key="name" class="elevation-3" :class="{ 'empty-table-fix' : innerFilelist.length === 0, 'loading-cursor' : (loading || innerLoading || doingFileOperation || innerDoingFileOperation) }">
			<template slot="progress">
				<slot name="progress">
				<v-progress-linear indeterminate></v-progress-linear>
				</slot>
			</template>

			<template slot="no-data">
				<slot name="no-data">
					<v-alert :value="true" type="info" class="ma-0" @contextmenu.prevent="">
						{{ $t('list.baseFileList.noFiles') }}
					</v-alert>
				</slot>
			</template>

			<template slot="headers" slot-scope="props">
				<tr>
					<th class="checkbox pr-0">
						<v-checkbox :input-value="props.all" :indeterminate="props.indeterminate" primary hide-details @click.stop.prevent="toggleAll"></v-checkbox>
					</th>
					<th v-for="header in props.headers" :key="header.value" :class="['text-xs-left column sortable', innerPagination.descending ? 'desc' : 'asc', header.value === innerPagination.sortBy ? 'active' : '']" @click="changeSort(header.value)" v-tab-control>
						{{ getHeaderText(header) }}
						<v-icon small>arrow_upward</v-icon>
					</th>
				</tr>
			</template>

			<template slot="items" slot-scope="props">
				<tr :active="props.selected" @touchstart="onItemTouchStart(props, $event)" @touchend="onItemTouchEnd" @click="onItemClick(props)" @contextmenu.prevent="onItemContextmenu(props, $event)" :data-filename="(props.item.isDirectory ? '*' : '') + props.item.name" draggable="true" @dragstart="onItemDragStart(props.item, $event)" @dragover="onItemDragOver(props.item, $event)" @drop.prevent="onItemDragDrop(props.item, $event)" v-tab-control.contextmenu @keydown.space="props.selected = !props.selected">
					<td class="pr-0">
						<v-checkbox :input-value="props.selected" @touchstart.stop="" @touchend.stop="" @click.stop.prevent="props.selected = !props.selected" primary hide-details></v-checkbox>
					</td>
					<template v-for="header in headers">
						<td v-if="header.value === 'name'" :key="header.value">
							<v-layout row align-center>
								<v-icon class="mr-1">{{ props.item.isDirectory ? 'folder' : 'assignment' }}</v-icon>
								<span>{{ props.item.name }}</span>
							</v-layout>
						</td>
						<td v-else-if="header.unit === 'bytes'" :key="header.value">
							{{ (props.item[header.value] !== null) ? $displaySize(props.item[header.value]) : '' }}
						</td>
						<td v-else-if="header.unit === 'date'" :key="header.value">
							{{ props.item.lastModified ? props.item.lastModified.toLocaleString() : $t('generic.noValue') }}
						</td>
						<td v-else-if="header.unit === 'filaments'" :key="header.value">
							<v-tooltip bottom :disabled="!props.item[header.value] || props.item[header.value].length <= 1">
								<span slot="activator">
									{{ displayLoadingValue(props.item, header.value, 1, 'mm') }}
								</span>

								<span>
									{{ $display(props.item[header.value], 1, 'mm') }}
								</span>
							</v-tooltip>
						</td>
						<td v-else-if="header.unit === 'time'" :key="header.value">
							{{ displayTimeValue(props.item, header.value) }}
						</td>
						<td v-else :key="header.value">
							{{ displayLoadingValue(props.item, header.value, header.precision, header.unit) }}
						</td>
					</template>
				</tr>
			</template>
		</v-data-table>

		<v-menu v-model="contextMenu.shown" :position-x="contextMenu.x" :position-y="contextMenu.y" absolute offset-y v-tab-control.contextmenu>
			<v-list>
				<slot name="context-menu"></slot>

				<v-list-tile v-show="!noDownload && innerValue.length === 1 && filesSelected" @click="download">
					<v-icon class="mr-1">cloud_download</v-icon> {{ $tc('list.baseFileList.download', innerValue.length) }}
				</v-list-tile>
				<v-list-tile v-show="!noEdit && innerValue.length === 1 && filesSelected" :disabled="!canEditFile" @click="edit(innerValue[0])">
					<v-icon class="mr-1">edit</v-icon> {{ $t('list.baseFileList.edit') }}
				</v-list-tile>
				<v-list-tile v-show="!noRename && innerValue.length === 1" @click="rename">
					<v-icon class="mr-1">short_text</v-icon> {{ $t('list.baseFileList.rename') }}
				</v-list-tile>
				<v-list-tile v-show="!noDelete" @click="remove">
					<v-icon class="mr-1">delete</v-icon> {{ $t('list.baseFileList.delete') }}
				</v-list-tile>
				<v-list-tile v-show="!foldersSelected && innerValue.length > 1" @click="downloadZIP">
					<v-icon class="mr-1">archive</v-icon> {{ $t('list.baseFileList.downloadZIP') }}
				</v-list-tile>
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

import { mapState, mapGetters, mapActions, mapMutations } from 'vuex'

import i18n from '../../i18n'
import { getModifiedDirectories } from '../../store/machine'
import { DisconnectedError, OperationCancelledError } from '../../utils/errors.js'
import Path from '../../utils/path.js'

const bigFileThreshold = 1048576;		// 1 MiB
const maxEditFileSize = 15728640;		// 15 MiB

export default {
	props: {
		headers: {
			type: Array,
			default: () => [
				{
					text: () => i18n.t('list.baseFileList.fileName'),
					value: 'name'
				},
				{
					text: () => i18n.t('list.baseFileList.size'),
					value: 'size',
					unit: 'bytes'
				},
				{
					text: () => i18n.t('list.baseFileList.lastModified'),
					value: 'lastModified',
					unit: 'date'
				}
			]
		},
		items: {
			default: () => [],
			required: false
		},
		sortBy: {
			type: String,
			default: 'name'
		},
		descending: {
			type: Boolean,
			default: false
		},
		sortTable: String,
		directory: {
			type: String,
			required: true
		},
		filelist: Array,
		value: Array,
		loading: Boolean,
		doingFileOperation: Boolean,
		noDragDrop: Boolean,
		noDownload: Boolean,
		noEdit: Boolean,
		noRename: Boolean,
		noDelete: Boolean
	},
	computed: {
		...mapState(['selectedMachine']),
		...mapGetters(['isConnected']),
		...mapState('machine', ['isReconnecting']),
		...mapState('machine/cache', ['sorting']),
		...mapState('machine/model', ['storages']),
		storageIndex() {
			const matches = /^(\d+)/.exec(this.innerDirectory);
			if (matches) {
				return parseInt(matches[1]);
			}
			return 0;
		},
		foldersSelected() {
			return this.innerValue.some(item => item.isDirectory)
		},
		filesSelected() {
			return this.innerValue.some(item => !item.isDirectory)
		},
		canEditFile() {
			return (this.innerValue.length > 0) && (this.innerValue[0].size < maxEditFileSize);
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
			innerPagination: {
				sortBy: this.sortBy,
				descending: this.descending,
				rowsPerPage: -1
			},
			innerValue: [],
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
		getHeaderText: (header) => (header.text instanceof(Function)) ? header.text() : header.text,
		toggleAll() {
			this.innerValue = this.innerValue.length ? [] : this.innerFilelist.slice();
		},
		changeSort(column) {
			if (this.innerPagination.sortBy === column) {
				this.innerPagination.descending = !this.innerPagination.descending;
			} else {
				this.innerPagination.sortBy = column;
				this.innerPagination.descending = true;
			}

			this.$emit('update:sortBy', this.innerPagination.sortBy);
			this.$emit('update:descending', this.innerPagination.descending);
			this.$nextTick(function() {
				this.$emit('changedSort');
			});
		},
		sort(items, index, isDescending) {
			// Sort by index
			items.sort(function(a, b) {
				if (a[index] === b[index]) {
					return 0;
				}
				if (a[index] === null || a[index] === undefined) {
					return -1;
				}
				if (b[index] === null || b[index] === undefined) {
					return 1;
				}
				if (a[index].constructor === String && b[index].constructor === String) {
					return a[index].localeCompare(b[index], undefined, { sensivity: 'base' });
				}
				if (a[index] instanceof Array && b[index] instanceof Array) {
					const reducedA = a[index].length ? a.filament.reduce((a, b) => a + b) : 0;
					const reducedB = b[index].length ? b.filament.reduce((a, b) => a + b) : 0;
					return reducedA - reducedB;
				}
				return a[index] - b[index];
			});

			// Deal with descending order
			if (isDescending) {
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
			if (!this.isConnected || this.innerLoading) {
				return;
			}

			if (this.storageIndex >= this.storages.length || !this.storages[this.storageIndex].mounted) {
				this.innerDirectory = (this.storageIndex === 0) ? this.initialDirectory : `${this.storageIndex}:`;
				this.innerFilelist = [];
				return;
			}

			this.innerLoading = true;
			try {
				// Load file list and create missing props
				const files = await this.getFileList(directory);
				files.forEach(function(item) {
					this.headers.forEach(function(header) {
						if (!item.hasOwnProperty(header.value)) {
							item[header.value] = undefined;
						}
					});
				}, this);

				this.innerDirectory = directory;
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
			this.onItemTouchEnd();

			// Deal with selection
			if (!props.selected) {
				props.selected = true;
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
			if (this.noDragDrop) {
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
					Array.from(row.children).forEach((td, index) => td.style.width = `${firstRow.children[index].offsetWidth}px`);
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
			tableClone.style.opacity = 0.5;
			tableClone.style.position = 'absolute';
			tableClone.style.pointerEvents = 'none';
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
				let notification, showDelay = 0;
				if (item.size > bigFileThreshold) {
					notification = this.$makeNotification('warning', this.$t('notification.loadingFile.title'), this.$t('notification.loadingFile.message'), false);
					showDelay = 1000;
				}

				const filename = Path.combine(this.innerDirectory, item.name);
				const response = await this.machineDownload({ filename, type: 'text', showSuccess: false });
				const editDialog = this.editDialog;
				setTimeout(function() {
					editDialog.filename = filename;
					editDialog.content = response;
					editDialog.shown = true;

					if (notification) {
						setTimeout(notification.hide, 1000);
					}
				}, showDelay);
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
				this.$log('error', this.$t('notification.rename.error'), e.message);
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
			this.wasMounted = (this.storages.length > this.storageIndex) && this.storages[this.storageIndex].mounted;
			this.loadDirectory(this.innerDirectory);
		}

		// Keep track of file changes
		const that = this;
		this.unsubscribe = this.$store.subscribeAction(async function(action, state) {
			if (!that.doingFileOperation && !that.innerDoingFileOperation) {
				const modifiedDirectories = getModifiedDirectories(action, state);
				if (Path.pathAffectsFilelist(modifiedDirectories, that.innerDirectory, that.innerFilelist)) {
					// Refresh when an external operation has caused a change
					await that.refresh();
				}
			}
		});

		// Get sorting from cache
		if (this.sortTable) {
			const column = this.sorting[this.sortTable].column;
			const descending = this.sorting[this.sortTable].descending;
			if (column !== this.innerPagination.sortBy || descending !== this.innerPagination.descending) {
				this.innerPagination.sortBy = column;
				this.innerPagination.descending = descending;
			}
		}
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
		storages: {
			deep: true,
			handler() {
				// Refresh file list when the selected storage is mounted or unmounted
				if (this.storages.length <= this.storageIndex || this.wasMounted !== this.storages[this.storageIndex].mounted) {
					this.loadDirectory(this.wasMounted ? this.initialDirectory : this.innerDirectory);
					this.wasMounted = (this.storages.length > this.storageIndex) && this.storages[this.storageIndex].mounted;
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
		innerPagination: {
			deep: true,
			handler(to) {
				if (this.sortTable && (this.sorting[this.sortTable].column !== to.sortBy || this.sorting[this.sortTable].descending !== to.descending)) {
					this.setSorting({ table: this.sortTable, column: to.sortBy, descending: to.descending });
				}
			}
		},
		sorting: {
			deep: true,
			handler(to) {
				const column = to[this.sortTable].column;
				const descending = to[this.sortTable].descending;
				if (column !== this.innerPagination.sortBy || descending !== this.innerPagination.descending) {
					this.innerPagination.sortBy = column;
					this.innerPagination.descending = descending;
				}
			}
		}
	}
}
</script>
