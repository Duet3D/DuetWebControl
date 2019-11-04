<template>
	<v-dialog :value="shown" persistent width="480">
		<v-card color="primary" dark>
			<v-card-title class="subtitle-1">
				{{ message }}
			</v-card-title>

			<v-card-text>
				<v-progress-linear indeterminate color="white" class="mb-0"></v-progress-linear>
			</v-card-text>
		</v-card>
	</v-dialog>
</template>

<script>
'use strict'

import { mapState } from 'vuex'

export default {
	computed: {
		...mapState(['isConnecting', 'isDisconnecting']),
		...mapState('machine', ['isReconnecting']),
		...mapState('machine/model', {
			status: state => state.state.status
		}),
		message() {
			if (this.isConnecting) {
				return this.$t('dialog.connection.connecting');
			}
			if (this.isReconnecting) {
				return this.$t((this.status === 'updating') ? 'dialog.connection.updating' : 'dialog.connection.reconnecting');
			}
			if (this.isDisconnecting) {
				return this.$t('dialog.connection.disconnecting');
			}
			return this.$t('dialog.connection.standBy');
		},
		shown() {
			return this.isConnecting || this.isReconnecting || this.isDisconnecting;
		}
	}
}
</script>
