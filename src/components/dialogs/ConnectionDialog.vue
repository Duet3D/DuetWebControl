<template>
	<v-overlay :value="shown" :opacity="0.3">
		<v-card color="primary" width="480">
			<v-card-title class="subtitle-1">
				{{ message }}
			</v-card-title>

			<v-card-text>
				<v-progress-linear :indeterminate="connectingProgress < 0" :value="connectingProgress" color="white" class="mb-0"></v-progress-linear>
			</v-card-text>
		</v-card>
	</v-overlay>
</template>

<script>
'use strict'

import { mapState } from 'vuex'

import { StatusType } from '../../store/machine/modelEnums.js'

export default {
	computed: {
		...mapState(['connectingProgress', 'isConnecting', 'isDisconnecting']),
		...mapState('machine', ['isReconnecting']),
		...mapState('machine/model', {
			status: state => state.state.status
		}),
		message() {
			if (this.isConnecting || this.connectingProgress >= 0) {
				return this.$t('dialog.connection.connecting');
			}
			if (this.status === StatusType.updating) {
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
					this.status === StatusType.halted || this.status === StatusType.updating);
		}
	}
}
</script>
