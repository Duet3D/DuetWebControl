<style>
.empty-table-fix td {
	padding-left: 0px !important;
	padding-right: 0px !important;
}
</style>

<style scoped>
td.content {
	padding-top: 8px !important;
	padding-bottom: 8px !important;
	height: auto !important;
}
</style>

<template>
	<v-data-table :headers="headers" :items="events" :pagination="{ sortBy: 'date', descending: true, rowsPerPage: -1 }" hide-actions v-auto-size="'table'" class="elevation-3" :class="{ 'empty-table-fix' : events.length === 0 }">
		<template slot="no-data">
			<v-alert :value="true" type="info" class="ma-0">{{ $t('table.eventLog.noEvents') }}</v-alert>
		</template>

		<template slot="items" slot-scope="props">
			<td class="content" :class="props.item.type">{{ props.item.date.toLocaleString() }}</td>
			<td class="content" :class="props.item.type">
				{{ props.item.title }}
				<template v-if="props.item.message">
					<br/>
					{{ props.item.message }}
				</template>
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
	}
}
</script>
