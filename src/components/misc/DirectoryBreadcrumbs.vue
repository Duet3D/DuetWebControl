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

import { mapActions } from 'vuex'

import Path from '../../utils/path.js'

export default {
	props: {
		value: {
			type: String,
			required: true
		}
	},
	computed: {
		pathItems() {
			const pathItems = this.value.split('/');
			let rootCaption = pathItems.length ? this.$t('generic.noValue') : pathItems[0];
			if (pathItems.length > 1) {
				if (this.value.startsWith(Path.gcodes)) {
					pathItems.shift();
					pathItems[0] = Path.gcodes;
					rootCaption = this.$t('directory.gcodes');
				} else if (this.value.startsWith(Path.macros)) {
					pathItems.shift();
					pathItems[0] = Path.macros;
					rootCaption = this.$t('directory.macros');
				} else if (this.value.startsWith(Path.filaments)) {
					pathItems.shift();
					pathItems[0] = Path.filaments;
					rootCaption = this.$t('directory.filaments');
				} else if (this.value.startsWith(Path.display)) {
					pathItems.shift();
					pathItems[0] = Path.display;
					rootCaption = this.$t('directory.display');
				} else if (this.value.startsWith(Path.sys)) {
					pathItems.shift();
					pathItems[0] = Path.sys;
					rootCaption = this.$t('directory.sys');
				} else if (this.value.startsWith(Path.www)) {
					pathItems.shift();
					pathItems[0] = Path.www;
					rootCaption = this.$t('directory.www');
				}
			}

			const that = this;
			let items = [], path = '';
			pathItems.forEach(function(item, index) {
				path = (path === '') ? item : path + '/' + item;
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
