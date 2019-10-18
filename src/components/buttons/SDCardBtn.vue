<template>
	<v-menu offset-y v-if="storages.length > 1">
		<template #activator="{ on }">
			<v-btn v-bind="$props" v-on="on" color="success">
				<v-icon class="mr-1">mdi-sd</v-icon> {{ $t('generic.sdCard', [storageIndex]) }} <v-icon class="ml-1">mdi-menu-down</v-icon>
			</v-btn>
		</template>

		<v-list ref="list">
			<v-list-item v-for="(storage, index) in storages" :key="index" @click="$emit('storageSelected', index)">
				<v-icon class="mr-1">{{ storage.mounted ? 'mdi-check' : 'mdi-close' }}</v-icon>
				{{ $t('generic.sdCard', [index]) }} ({{ $t(storage.mounted ? 'generic.mounted' : 'generic.notMounted') }})
			</v-list-item>
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
