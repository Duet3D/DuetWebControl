<template>
	<v-btn v-bind="$props" :color="buttonColor" :depressed="isConnecting || isDisconnecting" @click="clicked">
		<v-icon v-if="!isConnecting && !isDisconnecting">{{ buttonIcon }}</v-icon>
		<v-progress-circular size="20" v-if="isConnecting || isDisconnecting" indeterminate></v-progress-circular>
		<span class="ml-2">{{ caption }}</span>

		<connect-dialog :shown.sync="showConnectDialog" @hostEntered="connect(hostname)"></connect-dialog>
	</v-btn>
</template>

<script>
'use strict'

import VBtn from 'vuetify/es5/components/VBtn'

import { mapGetters, mapState, mapActions } from 'vuex'

export default {
	computed: {
		...mapGetters(['isConnected', 'isLocal']),
		...mapState(['isConnecting', 'isDisconnecting', 'selectedMachine']),
		buttonColor() {
			return (this.isConnecting || this.isDisconnecting) ? 'warning'
				: (this.isConnected ? 'success' : 'primary');
		},
		buttonIcon() {
			return this.isConnected ? 'close' : 'power_settings_new';
		},
		caption() {
			return this.$t(this.isConnecting ? 'button.connect.connecting'
				: this.isDisconnecting ? 'button.connect.disconnecting'
					: this.isConnected ? 'button.connect.disconnect'
						: 'button.connect.connect');
		}
	},
	data() {
		return {
			showConnectDialog: false
		}
	},
	extends: VBtn,
	methods: {
		...mapActions(['connect', 'disconnect']),
		async clicked() {
			if (this.isConnecting) {
				// Cannot disable this button because that messes up the color
				return;
			}

			if (this.selectedMachine === 'default') {
				if (this.isLocal) {
					// Ask user for hostname before connecting
					this.showConnectDialog = true;
				} else {
					// Connect to the host this is running on
					await this.connect();
				}
			} else {
				// Disconnect from the current machine
				await this.disconnect();
			}
		}
	}
}
</script>
