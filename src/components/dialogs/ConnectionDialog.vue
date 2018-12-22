<template>
	<v-dialog :value="isConnecting || isReconnecting || isDisconnecting" persistent width="480">
		<v-card color="primary" dark>
			<v-card-text>
				Please stand by
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
		...mapState('machine', ['isReconnecting'])
	}
}
</script>
