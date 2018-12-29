<template>
	<v-menu offset-y v-if="storages.length > 1" v-tab-control.dynamic>
		<v-btn slot="activator" color="success">
			<v-icon class="mr-1">sd_storage</v-icon> SD Card {{ storageIndex }} <v-icon class="ml-1">arrow_drop_down</v-icon>
		</v-btn>

		<v-list ref="list">
			<v-list-tile v-for="(storage, index) in storages" :key="index" @click="$emit('storageSelected', index)" v-tab-control>
				<v-icon class="mr-1">{{ storage.mounted ? 'done' : 'clear' }}</v-icon>
				SD Card {{ index }} ({{ storage.mounted ? 'mounted' : 'not mounted' }})
			</v-list-tile>
		</v-list>
	</v-menu>
</template>

<script>
'use strict'

import { mapState } from 'vuex'

export default {
	props: {
		directory: {
			type: String,
			required: true
		}
	},
	computed: {
		...mapState('machine/model', ['storages']),
		storageIndex() {
			const matches = /^(\d+)/.exec(this.directory);
			if (matches) {
				return parseInt(matches[1]);
			}
			return 0;
		}
	}
}
</script>
