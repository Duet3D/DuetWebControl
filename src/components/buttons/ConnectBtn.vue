<template>
	<v-btn v-bind="$props" :color="buttonColor" :depressed="isBusy" @click="clicked">
		<v-icon v-show="!isBusy">{{ buttonIcon }}</v-icon>
		<v-progress-circular size="20" v-show="isBusy" indeterminate></v-progress-circular>
		<span class="ml-2">{{ caption }}</span>
	</v-btn>
</template>

<script>
'use strict'

import { VBtn } from 'vuetify/lib'

import { mapState, mapGetters, mapActions, mapMutations } from 'vuex'

export default {
	computed: {
		...mapState(['isConnecting', 'isDisconnecting', 'isLocal']),
		...mapState('machine', ['isReconnecting']),
		...mapGetters(['isConnected']),
		isBusy() { return this.isConnecting || this.isReconnecting || this.isDisconnecting },
		buttonColor() {
			return this.isBusy ? 'warning'
				: (this.isConnected ? 'success' : 'primary');
		},
		buttonIcon() {
			return this.isConnected ? 'mdi-close-circle-outline' : 'mdi-power';
		},
		caption() {
			return this.$t((this.isConnecting || this.isReconnecting) ? 'button.connect.connecting'
				: this.isDisconnecting ? 'button.connect.disconnecting'
					: this.isConnected ? 'button.connect.disconnect'
						: 'button.connect.connect');
		}
	},
	extends: VBtn,
	methods: {
		...mapActions(['connect', 'disconnect']),
		...mapMutations(['showConnectDialog']),
		async clicked() {
			if (this.isBusy) {
				// Cannot disable this button because that messes up the color
				return;
			}

			if (this.isConnected) {
				// Disconnect from the current machine
				await this.disconnect();
			} else if (this.isLocal) {
				// Ask user for hostname before connecting
				this.showConnectDialog();
			} else {
				// Connect to the host this is running on
				await this.connect();
			}
		}
	}
}
</script>
