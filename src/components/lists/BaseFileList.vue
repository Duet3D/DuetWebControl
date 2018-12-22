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
					<v-alert :value="true" type="info" class="ma-0" @contextmenu.prevent="">No Files</v-alert>
				</slot>
			</template>

			<template slot="headers" slot-scope="props">
				<tr>
					<th class="checkbox pr-0">
						<v-checkbox :input-value="props.all" :indeterminate="props.indeterminate" primary hide-details @click="toggleAll"></v-checkbox>
					</th>
					<th v-for="header in props.headers" :key="header.text" :class="['text-xs-left column sortable', innerPagination.descending ? 'desc' : 'asc', header.value === innerPagination.sortBy ? 'active' : '']" @click="changeSort(header.value)">
						{{ header.text }}
						<v-icon small>arrow_upward</v-icon>
					</th>
				</tr>
			</template>

			<template slot="items" slot-scope="props">
				<tr :active="props.selected" @click="props.selected = !props.selected" @dblclick="itemClicked(props.item)" @contextmenu.prevent="itemContextmenu(props, $event)" :data-filename="(props.item.isDirectory ? '*' : '') + props.item.name" draggable="true" @dragstart="dragStart(props.item, $event)" @dragover="dragOver(props.item, $event)" @drop.prevent="dragDrop(props.item, $event)">
					<td class="pr-0">
						<v-checkbox :input-value="props.selected" primary hide-details></v-checkbox>
					</td>
					<template v-for="header in headers">
						<td v-if="header.value === 'name'" :key="header.value">
							<a href="#" @click.prevent.stop="itemClicked(props.item)">
								<v-icon class="mr-1">{{ props.item.isDirectory ? 'folder' : 'assignment' }}</v-icon>
								{{ props.item.name }}
							</a>
						</td>
						<td v-else-if="header.unit === 'bytes'" :key="header.value">
							{{ (props.item[header.value] !== null) ? $displaySize(props.item[header.value]) : '' }}
						</td>
						<td v-else-if="header.unit === 'date'" :key="header.value">
							{{ props.item.lastModified ? props.item.lastModified.toLocaleString() : $t('generic.novalue') }}
						</td>
						<td v-else-if="header.unit === 'filaments'" :key="header.value">
							<v-tooltip bottom :disabled="!props.item[header.value] || props.item[header.value].length <= 1">
								<span slot="activator">
									{{ displayLoadingValue(props.item, header.value, 'mm') }}
								</span>

								<span>
									$display(props.item[header.value], 1, 'mm');
								</span>
							</v-tooltip>
						</td>
						<td v-else-if="header.unit === 'time'" :key="header.value">
							{{ (props.item[header.value] !== null) ? $displayTime(props.item[header.value]) : $t('generic.i18n') }}
						</td>
						<td v-else :key="header.value">
							{{ displayLoadingValue(props.item, header.value, header.unit) }}
						</td>
					</template>
				</tr>
			</template>
		</v-data-table>

		<v-menu v-model="contextMenu.shown" :position-x="contextMenu.x" :position-y="contextMenu.y" absolute offset-y>
			<v-list>
				<slot name="context-menu"></slot>

				<v-list-tile v-show="!noDownload && innerValue.length === 1 && filesSelected" @click="download">
					<v-icon class="mr-1">cloud_download</v-icon> Download File
				</v-list-tile>
				<v-list-tile v-show="!noEdit && innerValue.length === 1 && filesSelected" :disabled="!canEditFile" @click="edit">
					<v-icon class="mr-1">edit</v-icon> Edit File
				</v-list-tile>
				<v-list-tile v-show="!noRename && innerValue.length === 1" @click="rename">
					<v-icon class="mr-1">short_text</v-icon> Rename
				</v-list-tile>
				<v-list-tile v-show="!noDelete" @click="remove">
					<v-icon class="mr-1">delete</v-icon> Delete
				</v-list-tile>
				<v-list-tile v-show="!foldersSelected && innerValue.length > 1" @click="downloadZIP">
					<v-icon class="mr-1">archive</v-icon> Download as ZIP
				</v-list-tile>
			</v-list>
		</v-menu>

		<file-edit-dialog :shown.sync="editDialog.shown" :filename="editDialog.filename" v-model="editDialog.content"></file-edit-dialog>
		<input-dialog :shown.sync="renameDialog.shown" title="Rename File or Directory" prompt="Please enter a new name:" :preset="renameDialog.item && renameDialog.item.name" @confirmed="renameCallback"></input-dialog>
	</div>
</template>

<script>
'use strict'

import JSZip from 'jszip'
import saveAs from 'file-saver'
import VDataTable from 'vuetify/es5/components/VDataTable'

import { mapState, mapGetters, mapActions } from 'vuex'

import { getModifiedDirectory } from '../../store/machine'
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
					text: 'Filename',
					value: 'name'
				},
				{
					text: 'Size',
					value: 'size',
					unit: 'bytes'
				},
				{
					text: 'Last Modified',
					value: 'lastModified',
					unit: 'date'
				}
			]
		},
		sortBy: {
			type: String,
			default: 'name'
		},
		descending: {
			type: Boolean,
			default: true
		},
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
			togglingSelected: false,
			contextMenu: {
				shown: false,
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
		toggleAll() {
			// FIXME For some reason this is called twice when the checkbox is checked
			if (!this.togglingSelected) {
				this.togglingSelected = true;
				this.innerValue = this.innerValue.length ? [] : this.innerFilelist.slice();
			} else {
				this.togglingSelected = false;
			}
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
				if (a[index] && a[index].constructor === String && b[index] && b[index].constructor === String) {
					return a[index].localeCompare(b[index], undefined, { sensivity: 'base' });
				}
				if (a[index] instanceof Array && b[index] instanceof Array) {
					const reducedA = a[index].length ? a.filament.reduce((a, b) => a + b) : 0;
					const reducedB = b[index].length ? b.filament.reduce((a, b) => a + b) : 0;
					return reducedA - reducedB;
				}
				return a[index] - b[index];
			});

			// Sort by null values
			items.sort((a, b) => (a[index] === b[index]) ? 0 : (a[index] === null ? -1 : 1));

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
		displayLoadingValue(item, prop, unit = '') {
			if (item.isDirectory) {
				return '';
			}
			if (!item[prop]) {
				return this.$t((item[prop] === undefined) ? 'generic.loading' : 'generic.novalue');
			}
			if (item[prop] instanceof Array) {
				return item[prop].length ? `${item[prop].reduce((a, b) => a + b)} ${unit}` : this.$t('generic.novalue');
			}
			return `${item[prop]} ${unit}`;
		},
		itemClicked(item) {
			if (item.isDirectory) {
				this.loadDirectory(Path.combine(this.innerDirectory, item.name));
			} else {
				this.$emit('fileClicked', item);
			}
		},
		itemContextmenu(props, e) {
			if (!props.selected) {
				props.selected = true;
			}
			e.preventDefault();

			this.contextMenu.shown = false;
			this.contextMenu.x = e.clientX;
			this.contextMenu.y = e.clientY;
			this.$nextTick(() => {
				this.contextMenu.shown = true;
			});
		},
		dragStart(item, e) {
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
			this.$nextTick(() => tableClone.remove());
		},
		dragOver(item, e) {
			if (!this.noDragDrop && item.isDirectory) {
				const jsonData = e.dataTransfer.getData('application/json');
				if (jsonData) {
					const data = JSON.parse(jsonData);
					if (data.type === 'dwcFiles' && !data.items.some(dataItem => dataItem.isDirectory && dataItem.name === item.name)) {
						e.preventDefault();
						e.stopPropagation();
					}
				}
			}
		},
		async dragDrop(item, e) {
			const data = JSON.parse(e.dataTransfer.getData('application/json'));
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
		},
		async download(item) {
			try {
				const filename = (item && item.name) ? item.name : this.innerValue[0].name;
				const response = await this.machineDownload(Path.combine(this.innerDirectory, filename));
				const blob = new Blob([response], { type: 'text/plain;charset=utf-8' })
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
				const filename = Path.combine(this.innerDirectory, (item && item.name) ? item.name : this.innerValue[0].name);
				const response = await this.machineDownload({ filename, asText: true, showSuccess: false });
				let notification, showDelay = 0;
				if (response.length > bigFileThreshold) {
					notification = this.$makeNotification('warning', 'Loading file', 'This file is relatively big so it may take a while before it is displayed.', false);
					showDelay = 1000;
				}

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

				this.$makeNotification('success', `Successfully renamed ${oldFilename} to ${newFilename}`);
			} catch (e) {
				console.warn(e);
				this.$log('error', `Failed to rename ${oldFilename} to ${newFilename}`, e.message);
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
					this.$makeNotification('error', `Failed to delete ${items[i].name}`, items[i].isDirectory ? 'Please make sure that this directory is empty' : e.message);
				}
			}

			if (deletedItems.length) {
				this.$log('success', (deletedItems.length > 1) ? `Successfully deleted ${deletedItems.length} items` : `Successfully deleted ${deletedItems[0].name}`);
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
					const file = await this.machineDownload({ filename: Path.combine(directory, items[i].name), num: i + 1, count: items.length });
					zip.file(items[i].name, file);
				} catch (e) {
					if (!(e instanceof DisconnectedError) && !(e instanceof OperationCancelledError)) {
						// should be handled before we get here
						console.warn(e);
					}
					return;
				}
			}

			// Compress files and save the new archive
			const notification = this.$makeNotification('info', 'Compressing files...', 'Please stand by while your files are being compressed...');
			try {
				const zipBlob = await zip.generateAsync({ type: 'blob' });
				saveAs(zipBlob, 'download.zip');
			} catch (e) {
				console.warn(e);
				this.$makeNotification('error', 'Failed to compress files', e.message);
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
				const modifiedDirectory = getModifiedDirectory(action, state);
				if (Path.pathAffectsFilelist(modifiedDirectory, that.innerDirectory, that.innerFilelist)) {
					// Refresh when an external operation has caused a change
					await that.refresh();
				}
			}
		});
	},
	beforeDestroy() {
		this.unsubscribe();
	},
	watch: {
		selectedMachine() {
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
		}
	}
}
</script>
