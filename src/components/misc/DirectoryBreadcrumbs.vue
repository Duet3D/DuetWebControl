<template>
	<v-breadcrumbs :items="pathItems" divider=">">
		<template #item="{ item }">
			<v-menu v-if="item.showDropdown" offset-y>
				<template #activator="{ on, attrs }">
					<v-breadcrumbs-item href="javascript:void(0)" v-bind="attrs" v-on="on" @dragover="dragOver(item.href, $event)" @drop.prevent="dragDrop(item.href, $event)">
						{{ item.text }}
						<v-icon class="ml-1">mdi-menu-down</v-icon>
					</v-breadcrumbs-item>
				</template>
				<v-list>
					<v-list-item v-if="firmwareDirectoryDiffers" @click="changeDirectory(directories.firmware)">
						<v-icon class="mr-3">mdi-update</v-icon> {{ $t('directory.firmware') }}
					</v-list-item>
					<v-list-item v-if="hasDirectDisplay" @click="changeDirectory(directories.menu)">
						<v-icon class="mr-3">mdi-format-list-numbered</v-icon> {{ $t('directory.menu') }}
					</v-list-item>
					<v-list-item @click="changeDirectory(directories.system)">
						<v-icon class="mr-3">mdi-cog</v-icon> {{ $t('directory.system') }}
					</v-list-item>
				</v-list>
			</v-menu>
			<v-breadcrumbs-item v-else href="javascript:void(0)" :disabled="item.disabled" @click="changeDirectory(item.href)" @dragover="dragOver(item.href, $event)" @drop.prevent="dragDrop(item.href, $event)">
				{{ item.text }}
			</v-breadcrumbs-item>
		</template>
	</v-breadcrumbs>
</template>

<script>
'use strict'

import { mapState, mapActions } from 'vuex'

import Path from '../../utils/path.js'

export default {
	props: {
		value: {
			type: String,
			required: true
		}
	},
	computed: {
		...mapState('machine/model', ['boards', 'directories']),
		pathItems() {
			let pathItems = this.value.split('/');
			if (pathItems[0] === '') {
				pathItems[0] = '0:';
			}
			pathItems = pathItems.filter(item => item !== '');

			let rootCaption = (pathItems.length === 0) ? this.$t('generic.noValue') : pathItems[0], showDropdown = false;
			if (pathItems.length > 1) {
				if (Path.startsWith(this.value, this.directories.gCodes)) {
					pathItems.shift();
					pathItems[0] = this.directories.gCodes;
					rootCaption = this.$t('directory.gcodes');
				} else if (Path.startsWith(this.value, this.directories.macros)) {
					pathItems.shift();
					pathItems[0] = this.directories.macros;
					rootCaption = this.$t('directory.macros');
				} else if (Path.startsWith(this.value, this.directories.filaments)) {
					pathItems.shift();
					pathItems[0] = this.directories.filaments;
					rootCaption = this.$t('directory.filaments');
				} else if (Path.startsWith(this.value, this.directories.menu)) {
					pathItems.shift();
					pathItems[0] = this.directories.menu;
					rootCaption = this.$t('directory.menu');
					showDropdown = true;
				} else if (Path.startsWith(this.value, Path.system)) {
					pathItems.shift();
					pathItems[0] = Path.system;
					rootCaption = this.$t('directory.system');
					showDropdown = true;
				} else if (Path.startsWith(this.value, this.directories.system)) {
					pathItems.shift();
					pathItems[0] = this.directories.system;
					rootCaption = this.$t('directory.system');
					showDropdown = true;
				} else if (Path.startsWith(this.value, this.directories.firmware)) {
					pathItems.shift();
					pathItems[0] = this.directories.firmware;
					rootCaption = this.$t('directory.firmware');
					showDropdown = true;
				} else if (Path.startsWith(this.value, this.directories.web)) {
					pathItems.shift();
					pathItems[0] = this.directories.web;
					rootCaption = this.$t('directory.web');
				}
			}
			showDropdown &= (pathItems.length === 1) && (this.hasDirectDisplay || this.firmwareDirectoryDiffers);

			let items = [], path = '';
			pathItems.forEach(function(item, index) {
				path = Path.combine(path, item);
				if (index === 0) {
					items.push({
						showDropdown,
						text: item.startsWith('0:') ? rootCaption : this.$t('generic.sdCard', [/^(\d+)/.exec(item)[1]]),
						disabled: !showDropdown && (index === pathItems.length - 1),
						href: path
					});
				} else {
					items.push({
						text: item,
						disabled: index === pathItems.length - 1,
						href: path
					});
				}
			}, this);
			return items;
		},
		firmwareDirectoryDiffers() {
			return !Path.equals(this.directories.firmware, this.directories.system);
		},
		hasDirectDisplay() {
			return (this.boards.length > 0) && (this.boards[0].directDisplay !== null);
		}
	},
	methods: {
		...mapActions('machine', ['move']),
		changeDirectory(directory) {
			this.$emit('input', directory);
		},
		dragOver(directory, e) {
			const jsonData = e.dataTransfer.getData('application/json');
			if (jsonData) {
				const data = JSON.parse(jsonData);
				if (data.type === 'dwcFiles' && !data.items.some(dataItem => dataItem.isDirectory && directory === Path.combine(data.directory, dataItem.name))) {
					e.preventDefault();
					e.stopPropagation();
				}
			} else {
				// Fix for Chrome: It does not grant access to dataTransfer on the same domain "for security reasons"...
				e.preventDefault();
				e.stopPropagation();
			}
		},
		async dragDrop(directory, e) {
			const jsonData = e.dataTransfer.getData('application/json');
			if (jsonData) {
				const data = JSON.parse(jsonData);
				if (data.type === 'dwcFiles' && !data.items.some(dataItem => dataItem.isDirectory && directory === Path.combine(data.directory, dataItem.name))) {
					const data = JSON.parse(jsonData);
					for (let i = 0; i < data.items.length; i++) {
						const from = Path.combine(data.directory, data.items[i].name);
						const to = Path.combine(directory, data.items[i].name);
						try {
							await this.move({ from, to });
						} catch (e) {
							this.$log('error', this.$t('error.move', [data.items[i].name, directory]), e.message);
							break;
						}
					}
				}
			}
		}
	}
}
</script>
