<template>
	<v-dialog :value="shown" :persistent="!(displayReset && isConnected)" width="480">
		<v-card color="primary" dark>
			<v-card-title class="subtitle-1">
				{{ message }}
			</v-card-title>

			<v-card-text>
				<v-progress-linear :indeterminate="connectingProgress < 0" :value="connectingProgress" color="white"
								   class="mb-0" />
				<div class="d-flex">
					<code-btn v-show="displayReset && isConnected" class="mx-auto mt-5" code="M999" :log="false"
							  color="warning" :title="$t('button.reset.title')">
						<v-icon class="mr-1">mdi-refresh</v-icon> {{ $t("button.reset.caption") }}
					</code-btn>
				</div>
			</v-card-text>
		</v-card>
	</v-dialog>
</template>

<script lang="ts">
import Vue from "vue";
import { MachineStatus } from "@duet3d/objectmodel";

import store from "@/store";

export default Vue.extend({
	computed: {
		connectingProgress(): number { return store.state.connectingProgress; },
		isConnected(): boolean { return store.getters["isConnected"]; },

		message(): string {
			if (store.state.isConnecting || this.connectingProgress >= 0) {
				return this.$t("dialog.connection.connecting");
			}
			if (store.state.machine.model.state.status === MachineStatus.updating) {
				return this.$t("dialog.connection.updating");
			}
			if (store.state.machine.isReconnecting) {
				return this.$t("dialog.connection.reconnecting");
			}
			if (store.state.isDisconnecting) {
				return this.$t("dialog.connection.disconnecting");
			}
			return this.$t("dialog.connection.standBy");
		},
		shown(): boolean {
			return (store.state.isConnecting || this.connectingProgress >= 0 || store.state.machine.isReconnecting || store.state.isDisconnecting ||
				store.state.machine.model.state.status === MachineStatus.halted || store.state.machine.model.state.status === MachineStatus.updating);
		}
	},
	data() {
		return {
			displayReset: false,
			haltedTimer: null as NodeJS.Timeout | null
		}
	},
	methods: {
		showResetButton() {
			this.haltedTimer = null;
			this.displayReset = true;
		}
	},
	watch: {
		status(to) {
			if (to === MachineStatus.halted) {
				this.haltedTimer = setTimeout(this.showResetButton.bind(this), 4000);
			} else {
				if (this.haltedTimer) {
					clearTimeout(this.haltedTimer);
					this.haltedTimer = null;
				}
				this.displayReset = false;
			}
		}
	}
});
</script>
