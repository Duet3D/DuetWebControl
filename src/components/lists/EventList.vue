<style>
.empty-table-fix td {
	padding-left: 0px !important;
	padding-right: 0px !important;
}

td.log-cell {
	padding-top: 8px !important;
	padding-bottom: 8px !important;
	height: auto !important;
}

td.title-cell {
	vertical-align: top;
}
</style>

<style scoped>
.message {
	white-space: pre-wrap;
}
</style>

<template>
	<v-data-table :headers="headers" :items="events" :pagination="{ sortBy: 'date', descending: true, rowsPerPage: -1 }" hide-actions v-auto-size="'table'" class="elevation-3" :class="{ 'empty-table-fix' : events.length === 0 }">
		<template slot="no-data">
			<v-alert :value="true" type="info" class="ma-0">{{ $t('table.eventLog.noEvents') }}</v-alert>
		</template>

		<template slot="items" slot-scope="props">
			<td class="log-cell title-cell" :class="getClassByEvent(props.item.type)">{{ props.item.date.toLocaleString() }}</td>
			<td class="log-cell content-cell" :class="getClassByEvent(props.item.type)">
				<strong>{{ props.item.title }}</strong>
				<br v-if="props.item.title && props.item.message"/>
				<span v-if="props.item.message" class="message">{{ props.item.message }}</span>
			</td>
		</template>
	</v-data-table>
</template>

<script>
'use strict'

import { mapState } from 'vuex'

export default {
	computed: mapState('machine', ['events']),
	data() {
		return {
			headers: [
				{
					text: this.$t('table.eventLog.date'),
					value: 'date',
					width: '15%'
				},
				{
					text: this.$t('table.eventLog.message'),
					value: 'message',
					sortable: false,
					width: '75%'
				}
			]
		}
	},
	methods: {
		getClassByEvent(type) {
			switch (type) {
				case 'success': return 'green accent-3';
				case 'warning': return 'amber accent-2';
				case 'error': return 'red accent-2';
			}
			return 'light-blue accent-1';
		}
	}
}
</script>
