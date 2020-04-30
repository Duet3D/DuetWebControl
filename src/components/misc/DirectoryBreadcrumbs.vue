<template>
	<v-breadcrumbs :items="pathItems" divider=">">
		<template #item="props">
			<v-breadcrumbs-item href="javascript:void(0)" :disabled="props.item.disabled" @click="changeDirectory(props.item.href)" @dragover="dragOver(props.item.href, $event)" @drop.prevent="dragDrop(props.item.href, $event)">
				{{ props.item.text }}
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
		...mapState('machine/model', ['directories']),
		pathItems() {
			const pathItems = this.value.split('/').filter(item => item !== '');
			let rootCaption = (pathItems.length === 0) ? this.$t('generic.noValue') : pathItems[0];
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
				} else if (Path.startsWith(this.value, Path.system)) {
					pathItems.shift();
					pathItems[0] = Path.system;
					rootCaption = this.$t('directory.system');
				} else if (Path.startsWith(this.value, this.directories.system)) {
					pathItems.shift();
					pathItems[0] = this.directories.system;
					rootCaption = this.$t('directory.system');
				} else if (Path.startsWith(this.value, this.directories.web)) {
					pathItems.shift();
					pathItems[0] = this.directories.web;
					rootCaption = this.$t('directory.web');
				}
			}

			const that = this;
			let items = [], path = '';
			pathItems.forEach(function(item, index) {
				path = Path.combine(path, item);
				if (index === 0) {
					items.push({
						text: item.startsWith('0:') ? rootCaption : that.$t('generic.sdCard', [/^(\d+)/.exec(item)[1]]),
						disabled: index === pathItems.length - 1,
						href: path
					});
				} else {
					items.push({
						text: item,
						disabled: index === pathItems.length - 1,
						href: path
					});
				}
			});
			return items;
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
