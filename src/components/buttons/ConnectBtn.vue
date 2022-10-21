<template>
	<v-btn v-bind="$props" :color="buttonColor" :depressed="isBusy" @click="clicked">
		<v-icon v-show="!isBusy" v-text="buttonIcon" />
		<v-progress-circular size="20" v-show="isBusy" indeterminate />
		<span class="ml-2" v-text="caption"></span>
	</v-btn>
</template>

<script lang="ts">
import Vue from "vue";

import store from "@/store";

export default Vue.extend({
	computed: {
		isConnected(): boolean { return store.getters["isConnected"]; },
		isBusy(): boolean { return store.state.isConnecting || store.state.machine.isReconnecting || store.state.isDisconnecting },
		buttonColor(): string {
			return this.isBusy ? "warning" : (this.isConnected ? "success" : "primary");
		},
		buttonIcon(): string {
			return this.isConnected ? "mdi-close-circle-outline" : "mdi-power";
		},
		caption(): string {
			return this.$t((store.state.isConnecting || store.state.machine.isReconnecting) ? "button.connect.connecting"
				: store.state.isDisconnecting ? "button.connect.disconnecting"
					: this.isConnected ? "button.connect.disconnect"
						: "button.connect.connect");
		}
	},
	methods: {
		async clicked() {
			if (this.isBusy) {
				// Cannot disable this button because that messes up the color
				return;
			}

			if (this.isConnected) {
				// Disconnect from the current machine
				await store.dispatch("disconnect");
			} else if (process.env.NODE_ENV === "development") {
				// Ask user for hostname before connecting
				store.commit("showConnectDialog");
			} else {
				// Connect to the host this is running on
				await store.dispatch("connect");
			}
		}
	}
});
</script>
