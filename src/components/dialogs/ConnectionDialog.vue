<template>
	<v-dialog :value="shown" :persistent="!(displayReset && isConnected)" width="480">
		<v-card color="primary" dark>
			<v-card-title class="subtitle-1">
				{{ message }}
			</v-card-title>

			<v-card-text>
				<v-progress-linear :indeterminate="connectingProgress < 0" :value="connectingProgress" color="white" class="mb-0"></v-progress-linear>
				<div class="d-flex">
					<code-btn v-show="displayReset && isConnected" class="mx-auto mt-5" code="M999" :log="false" color="warning" :title="$t('button.reset.title')">
						<v-icon class="mr-1">mdi-refresh</v-icon> {{ $t('button.reset.caption') }}
					</code-btn>
				</div>
			</v-card-text>
		</v-card>
	</v-dialog>
</template>

<script>
'use strict'

import { MachineStatus } from '@duet3d/objectmodel'
import { mapState, mapGetters } from 'vuex'

export default {
	computed: {
		...mapState(['connectingProgress', 'isConnecting', 'isDisconnecting']),
		...mapGetters(['isConnected']),
		...mapState('machine', ['isReconnecting']),
		...mapState('machine/model', {
			status: state => state.state.status
		}),
		message() {
			if (this.isConnecting || this.connectingProgress >= 0) {
				return this.$t('dialog.connection.connecting');
			}
			if (this.status === MachineStatus.updating) {
				return this.$t('dialog.connection.updating');
			}
			if (this.isReconnecting) {
				return this.$t('dialog.connection.reconnecting');
			}
			if (this.isDisconnecting) {
				return this.$t('dialog.connection.disconnecting');
			}
			return this.$t('dialog.connection.standBy');
		},
		shown() {
			return (this.isConnecting || this.connectingProgress >= 0 || this.isReconnecting || this.isDisconnecting ||
					this.status === MachineStatus.halted || this.status === MachineStatus.updating);
		}
	},
	data() {
		return {
			displayReset: false,
			haltedTimer: null
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
}
</script>
