<style scoped>
.content {
	position: relative;
	min-height: 480px;
}

.content > canvas {
	position: absolute;
}
</style>

<template>
	<div>
		<v-row v-if="session">
			<v-col>
				Session: name: {{ session.name }} id: {{ session.id }} date: {{ session.date }}
			</v-col>
		</v-row>

		<v-tabs v-model="selectedTab">
			<v-tab href="#setupSession">
				<v-icon class="mr-1">mdi-motion-play-outline</v-icon> {{ $t('plugins.inputShaping.setupSession') }}
			</v-tab>
			<v-tab href="#recording">
				<v-icon class="mr-1">mdi-tune</v-icon> {{ $t('plugins.inputShaping.recordProfiles') }}
			</v-tab>
			<v-tab href="#analysis">
				<v-icon class="mr-1">mdi-chart-timeline-variant</v-icon> {{ $t('plugins.inputShaping.analysis') }}
			</v-tab>
		</v-tabs>

		<v-tabs-items v-model="selectedTab">
			<!-- Setup session -->
			<v-tab-item value="setupSession" class="pa-3">
				<session v-model="session"></session>
			</v-tab-item>

			<!-- Recording -->
			<v-tab-item value="recording" class="pa-3">
				<recorder v-model="session"></recorder>
			</v-tab-item>

			<!-- Profile Analysis -->
			<v-tab-item value="analysis" eager class="pa-3">
				<chart v-model="session"></chart>
			</v-tab-item>
		</v-tabs-items>

	</div>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions } from 'vuex';

import Events from '../../utils/events.js';

import { Session } from './InputShapingSession.js';
//import { makeNotification } from '../../utils/toast.js';

export default {

	computed: {
		...mapState(['selectedMachine']),
		...mapState('machine', ['model']),
		...mapGetters(['isConnected', 'uiFrozen']),
	},

	data() {
		return {
			selectedTab: 'setupSession',

			rules: {
			},

			session: new Session(),
		}
	},

	methods: {
		...mapActions('machine', ['download', 'getFileList', 'sendCode']),

		sessionAdd(record) {
			if (!this.session.addRecord(record)) {
				return;	// already in list
			}

			this.recordList.push(record.name);
		},
		sessionRemove(recordName) {
			let index = this.session.removeRecord(recordName);

			if (index < 0) {
				return; // not found in list
			}

			this.recordList.splice(index, 1);
		},
	},

	mounted() {
		// Set up initial message
		this.alertType = 'info';
		this.alertMessage = this.$t('plugins.inputShaping.noData');

		// Keep track of file changes
		this.$root.$on(Events.filesOrDirectoriesChanged, this.filesOrDirectoriesChanged);
	},
	beforeDestroy() {
		// No longer keep track of file changes
		this.$root.$off(Events.filesOrDirectoriesChanged, this.filesOrDirectoriesChanged);
	},
	watch: {
	}
}
</script>
