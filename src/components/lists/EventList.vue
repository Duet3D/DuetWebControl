<style>
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

th:last-child {
	padding-right: 0 !important;
	width: 1%;
}
</style>

<template>
	<div class="component">
		<v-data-table
			:headers="headers" :items="events" item-key="date"
			disable-pagination hide-default-footer :mobile-breakpoint="0"
			:custom-sort="sort" :sort-by.sync="sortBy" :sort-desc.sync="sortDesc" must-sort
			class="elevation-3" :class="{ 'empty-table-fix' : !events.length }">

			<template #no-data>
				<v-alert :value="true" type="info" class="text-left ma-0">
					{{ $t('list.eventLog.noEvents') }}
				</v-alert>
			</template>

			<template #header.btn>
				<v-menu offset-y>
					<template #activator="{ on }">
						<v-btn v-on="on" icon>
							<v-icon small>mdi-menu</v-icon>
						</v-btn>
					</template>

					<v-list>
						<v-list-item @click="clearLog">
							<v-icon class="mr-1">mdi-notification-clear-all</v-icon> {{ $t('list.eventLog.clear') }}
						</v-list-item>
						<v-list-item :disabled="!events.length" @click="downloadText">
							<v-icon class="mr-1">mdi-file-download</v-icon> {{ $t('list.eventLog.downloadText') }}
						</v-list-item>
						<v-list-item :disabled="!events.length" @click="downloadCSV">
							<v-icon class="mr-1">mdi-cloud-download</v-icon> {{ $t('list.eventLog.downloadCSV') }}
						</v-list-item>
					</v-list>
				</v-menu>
			</template>

			<template #item="{ item }">
				<tr :class="getClassByEvent(item.type)">
					<td class="log-cell title-cell">
						{{ item.date.toLocaleString() }}
					</td>
					<td class="log-cell content-cell" colspan="2">
						<strong>{{ item.title }}</strong>
						<br v-if="item.title && item.message">
						<span v-if="item.message" class="message" v-html="formatMessage(item.message)"></span>
					</td>
				</tr>
			</template>
		</v-data-table>
	</div>
</template>

<script>
'use strict'

import i18n from '../../i18n'

import saveAs from 'file-saver'
import { mapState, mapMutations } from 'vuex'

export default {
	computed: {
		...mapState('machine', ['events']),
		...mapState('machine/cache', ['sorting']),
		...mapState('settings', ['darkTheme']),
		headers() {
			return [
				{
					text: i18n.t('list.eventLog.date'),
					value: 'date',
					width: '15%'
				},
				{
					text: i18n.t('list.eventLog.message'),
					value: 'message',
					sortable: false,
					width: '74%'
				},
				{
					text: '',
					value: 'btn',
					sortable: false,
					width: '1%'
				}
			]
		},
		sortBy: {
			get() { return this.sorting.events.column; },
			set(value) {
				this.setSorting({ table: 'events', column: value, descending: this.sortDesc });
			}				
		},
		sortDesc: {
			get() { return this.sorting.events.descending; },
			set(value) {
				this.setSorting({ table: 'events', column: this.sortBy, descending: value });
			}
		}
	},
	methods: {
		...mapMutations('machine', ['clearLog']),
		...mapMutations('machine/cache', ['setSorting']),
		getHeaderText: (header) => (header.text instanceof(Function)) ? header.text() : header.text,
		getClassByEvent(type) {
			if (this.darkTheme) {
				switch (type) {
					case 'success': return 'green darken-1';
					case 'warning': return 'amber darken-1';
					case 'error': return 'red darken-1';
				}
				return 'blue darken-1';
			} else {
				switch (type) {
					case 'success': return 'green accent-2';
					case 'warning': return 'amber accent-1';
					case 'error': return 'red accent-1';
				}
				return 'light-blue accent-1';
			}
		},
		formatMessage(message) {
			return message.replace(/Error:/g, '<strong>Error:</strong>').replace(/Warning:/g, '<strong>Warning:</strong>');
		},
		downloadText() {
			let textContent = '';
			this.events.forEach(function(e) {
				const title = e.title.replace(/\n/g, '\r\n');
				const message = e.message ? e.message.replace(/\n/g, '\r\n') : '';
				textContent += `${e.date.toLocaleString()}: ${message ? (title + ": " + message) : title}\r\n`;
			});

			const file = new File([textContent], 'console.txt', { type: 'text/plain;charset=utf-8' });
			saveAs(file);
		},
		downloadCSV() {
			var csvContent = '"date","time","title","message"\r\n';
			this.events.forEach(function(e) {
				const title = e.title.replace(/"/g, '""').replace(/\n/g, '\r\n');
				const message = e.message ? e.message.replace(/"/g, '""').replace(/\n/g, '\r\n') : '';
				csvContent += `"${e.date.toLocaleDateString()}","${e.date.toLocaleTimeString()}","${title}","${message}"\r\n`;
			});

			const file = new File([csvContent], 'console.csv', { type: 'text/csv;charset=utf-8' });
			saveAs(file);
		},
		sort(items, sortBy, sortDesc) {
			// FIXME This method should not be needed but it appears like Vuetify's default
			// sort algorithm only takes into account times but not dates

			// Sort by datetime - everything else is unsupported
			items.sort(function(a, b) {
				if (a.date === b.date) {
					return 0;
				}
				if (a.date === null || a.date === undefined) {
					return -1;
				}
				if (b.date === null || b.date === undefined) {
					return 1;
				}
				return a.date - b.date;
			});

			// Deal with descending order
			if (sortDesc[0]) {
				items.reverse();
			}
			return items;
		}
	}
}
</script>
