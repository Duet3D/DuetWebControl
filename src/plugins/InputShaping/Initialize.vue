<style scoped>
</style>

<template>
	<div>
		Initialize Session Component

		<v-row v-if="value">
			<v-col>
				name: {{ value.name }} id: {{ value.id }} date: {{ value.date }}<br>
			</v-col>
		</v-row>

		<v-data-table
			v-model="sessionSelected"
			:headers="sessionTableHeaders"
			:items="sessions"
			:single-select="true"
			item-key="id"
			show-select
		></v-data-table>

		<v-row>
			<v-btn color="primary" @click="newSession">
					<v-icon class="mr-2">mdi-plus-outline</v-icon> {{ $t('plugins.inputShaping.new') }}
			</v-btn>
			<v-btn color="primary" @click="loadSession">
					<v-icon class="mr-2">mdi-plus-outline</v-icon> {{ $t('plugins.inputShaping.load') }}
			</v-btn>
			<v-btn color="warning" @click="deleteSession" :disabled="sessionSelected.length == 0">
					<v-icon class="mr-2">mdi-plus-outline</v-icon> {{ $t('plugins.inputShaping.delete') }}
			</v-btn>
		</v-row>

	</div>
</template>

<script>

'use strict';

import { Session } from './InputShapingSession.js';

export default {
	props: [ 'value' ],
	data() {
		return {
			sessions: [],
			sessionSelected: [ this.value ],
			sessionTableHeaders: [
          {
            text: 'Id', value: 'id', align: 'start', sortable: true
          },
          { text: 'Name', value: 'name', sortable: true },
          { text: 'Date', value: 'date', sortable: true },
        ],
		};
	},
	computed: {
	},
	methods: {
		newSession() {
			console.log("Created new session");
			let session = new Session();

			this.sessions.push(session);
		},
		loadSession() {
			console.log("TODO load session from storage");
		},
		deleteSession() {
			console.log("TODO delete selected session from list and internal storage")
		}
	},
	watch: {
		sessionSelected: function(value) {
			if (value.length > 0)
				this.$emit('input', value[0])
		}
	},
	mounted() {
	}
}
</script>
