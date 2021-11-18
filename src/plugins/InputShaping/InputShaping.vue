<style scoped>
</style>

<template>
	<div>
		<v-row v-if="session && false">
			<v-col>
				Session: name: {{ session.name }} id: {{ session.id }} date: {{ session.date }}<br>
				test: {{ session.test.getGCode() }}
			</v-col>
		</v-row>

		<v-tabs v-model="selectedTab">
			<v-tab href="#initialize">
				<v-icon class="mr-1">mdi-motion-play-outline</v-icon> {{ $t('plugins.inputShaping.initialize') }}
			</v-tab>
			<v-tab href="#configure" :disabled="!session">
				<v-icon class="mr-1">mdi-motion-play-outline</v-icon> {{ $t('plugins.inputShaping.configure') }}
			</v-tab>
			<v-tab href="#recording" :disabled="!session || !session.algorithms.length">
				<v-icon class="mr-1">mdi-tune</v-icon> {{ $t('plugins.inputShaping.record') }}
			</v-tab>
			<v-tab href="#analysis" :disabled="!session || !session.records.length">
				<v-icon class="mr-1">mdi-chart-timeline-variant</v-icon> {{ $t('plugins.inputShaping.analysis') }}
			</v-tab>
			<v-tab href="#recommendation" :disabled="!session || !session.records.length">
				<v-icon class="mr-1">mdi-hand-extended</v-icon> {{ $t('plugins.inputShaping.recommend') }}
			</v-tab>
		</v-tabs>

		<v-tabs-items v-model="selectedTab">
			<!-- Setup session -->
			<v-tab-item value="initialize" class="pa-3">
				<initialize v-model="session"></initialize>
			</v-tab-item>

			<!-- Configure session -->
			<v-tab-item value="configure" class="pa-3">
				<session v-if="session" :session="session"></session>
			</v-tab-item>

			<!-- Recording -->
			<v-tab-item value="recording" class="pa-3">
				<recorder v-if="session && !!session.algorithms.length" :session="session"></recorder>
			</v-tab-item>

			<!-- Analysis -->
			<v-tab-item value="analysis" eager class="pa-3">
				<analysis v-if="session && !!session.records.length" :session="session"></analysis>
			</v-tab-item>

			<!-- Recommendation -->
			<v-tab-item value="recommendation" eager class="pa-3">
				<recommendation v-if="session && !!session.records.length"
					:algorithm="algorithm"
					v-on:input="addAlgorithmToSession($event)"
					:records="session.records"></recommendation>
				<!--<recommendation v-model="algorithm" :records="testRecords"></recommendation>-->
			</v-tab-item>
		</v-tabs-items>

	</div>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions } from 'vuex';

export default {

	computed: {
		...mapState(['selectedMachine']),
		...mapState('machine', ['model']),
		...mapGetters(['isConnected', 'uiFrozen']),
	},

	data() {
		return {
			selectedTab: 'initialize',

			algorithm: null,

			rules: {
			},

			session: null,
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
		addAlgorithmToSession(algorithms) {
			console.log("algorithms were emitted", algorithms);

			if (!this.session)
				return;

			algorithms.forEach(algorithm => {
				this.session.addAlgorithm(algorithm);
			});
		}
	},

	mounted() {
		// Set up initial message
		this.alertType = 'info';
		this.alertMessage = this.$t('plugins.inputShaping.noData');
	},
	beforeDestroy() {
	},
	watch: {
	}
}
</script>
