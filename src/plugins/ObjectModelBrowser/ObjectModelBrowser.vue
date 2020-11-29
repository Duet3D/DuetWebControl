<template>
	<div class="mt-3">
		<v-toolbar class="mb-3">
			Selected node: {{ (active.length > 0) ? active[0] : 'None' }}

			<v-spacer></v-spacer>

			<v-btn color="info" :disabled="uiFrozen" @click="refresh">
				<v-icon class="mr-1">mdi-refresh</v-icon> {{ $t('button.refresh.caption') }}
			</v-btn>
		</v-toolbar>

		<v-treeview :items="modelTree" open-on-click activatable :active.sync="active">
			<template #append="{ item }">
				<v-chip v-if="item.type">{{ item.type }}</v-chip>
			</template>
		</v-treeview>
	</div>
</template>

<script>
'use strict'

import { mapState, mapGetters } from 'vuex'

export default {
	computed: {
		...mapState('machine', ['model']),
		...mapGetters(['uiFrozen'])
	},
	data() {
		return {
			active: [],
			modelTree: [],
		}
	},
	mounted() {
		this.refresh();
	},
	methods: {
		makeModelTree(obj, path) {
			if (obj instanceof Array) {
				return obj.map(function(item, index) {
					const itemPath = path.slice(0);
					itemPath[itemPath.length - 1] += `[${index}]`;

					return {
						id: itemPath.join('.'),
						name: this.getItemLabel(index, item),
						type: this.getItemType(item),
						children: this.makeModelTree(item, itemPath)
					}
				}, this);
			}
			if (obj !== null && obj instanceof Object) {
				return Object.keys(obj)
					.filter(key => (path.length > 0) || (obj[key] !== null))
					.map(function(key) {
						const itemPath = path.slice(0);
						itemPath.push(key);

						return {
							id: itemPath.join('.'),
							name: this.getItemLabel(key, obj[key]),
							type: this.getItemType(obj[key]),
							children: this.makeModelTree(obj[key], itemPath)
						};
					}, this);
			}
			return [];
		},
		getItemLabel(name, value) {
			if (value === null) {
				return `${name} = null`;
			}
			if ((value || value === '') && value.constructor === String) {
				return `${name} = "${value}"`;
			}
			if (value instanceof Object) {
				return name;
			}
			return `${name} = ${value}`;
		},
		getItemType(obj) {
			if (obj instanceof Array) {
				return 'array';
			}
			if (obj !== null && obj instanceof Object) {
				return 'object';
			}
			return 'value';
		},
		refresh() {
			this.modelTree = this.makeModelTree(this.model, []);
		}
	}
}
</script>
