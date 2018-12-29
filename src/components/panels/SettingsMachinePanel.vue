<template>
	<v-card>
		<v-card-title>
			<span>Machine-Specific Settings</span>
			<v-spacer></v-spacer>
			<a v-if="!isLocal" href="/reprap.htm">
				<v-icon small class="mr-1">fast_rewind</v-icon> Go to Duet Web Control 1
			</a>
		</v-card-title>

		<v-container fluid grid-list-lg class="px-3">
			<v-layout row wrap align-center>
				<v-flex xs6 sm6 md4>
					<v-text-field v-model.number="ajaxRetries" type="number" step="1" min="0" label="Number of maximum AJAX retries"></v-text-field>
				</v-flex>
				<v-flex xs6 sm6 md4>
					<v-text-field v-model.number="updateInterval" type="number" step="1" min="0" label="Update interval (ms)"></v-text-field>
				</v-flex>
				<v-flex xs6 sm6 md4>
					<v-text-field v-model.number="extendedUpdateEvery" type="number" step="1" min="1" label="Extended status update interval"></v-text-field>
				</v-flex>
				<v-flex xs6 sm6 md4>
					<v-text-field v-model.number="fileTransferRetryThreshold" type="number" step="1" min="1" label="Retry threshold for file transfers (KiB)"></v-text-field>
				</v-flex>
				<v-flex xs6 sm6 md4>
					<v-text-field v-model.number="babystepAmount" type="number" step="any" min="0.001" label="Babystep amount (mm)"></v-text-field>
				</v-flex>
				<v-flex xs6 sm6 md4>
					<v-text-field v-model.number="moveFeedrate" type="number" step="any" min="0.001" label="Feedrate for move buttons (mm/s)"></v-text-field>
				</v-flex>
			</v-layout>

			<v-tabs>
				<v-tab>Tool Temperatures</v-tab>
				<v-tab>Bed Temperatures</v-tab>
				<v-tab>Chamber Temperatures</v-tab>
				<v-tab>Spindle RPM</v-tab>
				<v-tab-item>
					<list-editor itemKey="tool" temperature></list-editor>
				</v-tab-item>
				<v-tab-item>
					<list-editor itemKey="bed" temperature></list-editor>
				</v-tab-item>
				<v-tab-item>
					<list-editor itemKey="chamber" temperature></list-editor>
				</v-tab-item>
				<v-tab-item>
					<list-editor itemKey="spindleRPM"></list-editor>
				</v-tab-item>
			</v-tabs>
		</v-container>
	</v-card>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapMutations } from 'vuex'

export default {
	computed: {
		...mapState(['isLocal']),
		...mapGetters(['isConnected']),
		...mapState('machine', ['settings']),
		ajaxRetries: {
			get() { return this.settings.ajaxRetries; },
			set(value) { if (this.isNumber(value) && value >= 0) { this.update({ ajaxRetries: value }); } }
		},
		updateInterval: {
			get() { return this.settings.updateInterval; },
			set(value) { if (this.isNumber(value) && value >= 0) { this.update({ updateInterval: value }); } }
		},
		extendedUpdateEvery: {
			get() { return this.settings.extendedUpdateEvery; },
			set(value) { if (this.isNumber(value) && value > 0) { this.update({ extendedUpdateEvery: value }); } }
		},
		fileTransferRetryThreshold: {
			get() { return Math.round(this.settings.fileTransferRetryThreshold / 1024); },
			set(value) { if (this.isNumber(value) && value > 0) { this.update({ fileTransferRetryThreshold: Math.round(value * 1024) }); } }
		},
		babystepAmount: {
			get() { return this.settings.babystepAmount; },
			set(value) { if (this.isNumber(value) && value > 0) { this.update({ babystepAmount: value }); } }
		},
		moveFeedrate: {
			get() { return this.settings.moveFeedrate; },
			set(value) { if (this.isNumber(value) && value > 0) { this.update({ moveFeedrate: value }); } }
		}
	},
	methods: mapMutations('machine/settings', ['update'])
}
</script>
