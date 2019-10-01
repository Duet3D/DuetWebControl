<template>
	<v-dialog :value="isConnecting || isReconnecting || isDisconnecting" persistent width="480">
		<v-card color="primary" dark>
			<v-card-text>
				{{ message }}
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
		message() {
			if (this.isConnecting) {
				return this.$t('dialog.connection.connecting');
			}
			if (this.isReconnecting) {
				return this.$t('dialog.connection.reconnecting');
			}
			if (this.isDisconnecting) {
				return this.$t('dialog.connection.disconnecting');
			}
			return this.$t('dialog.connection.standBy');
		}
	}
}
</script>
