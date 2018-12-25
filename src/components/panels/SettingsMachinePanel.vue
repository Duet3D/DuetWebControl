<template>
	<v-card>
		<v-card-title>
			<span>Machine-Specific Settings</span>
			<v-spacer></v-spacer>
			<a href="#" @click.prevent="revertToDWC1">
				<v-icon small class="mr-1">warning</v-icon> Revert to Duet Web Control 1
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
	methods: {
		...mapMutations('machine/settings', ['update']),
		revertToDWC1() {
			let hostname = location.hostname;
			if (this.isLocal) {
				hostname = prompt('Please enter the IP address of the machine you wish to reset:');
				if (!hostname) {
					return;
				}
			}

			if (confirm('The page will now perform the file command that allows you to return to Duet Web Control 1.\nOnce you see "err: 0" you can reload the web interface.\n\nAre you sure you wish to proceed?')) {
				window.navigate(`http://${hostname}/rr_delete?name=0:/www/index.html.gz`);
			}
		}
	}
}
</script>
