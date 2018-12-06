<template>
	<v-dialog v-model="shown" max-width="360">
		<v-card>
			<v-card-title class="headline">{{ $t('dialog.resetHeaterFault.title') }}</v-card-title>

			<v-card-text>
				{{ $t('dialog.resetHeaterFault.prompt', [this.heater]) }}
			</v-card-text>

			<v-card-actions>
				<v-spacer></v-spacer>

				<v-btn color="blue darken-1" flat="flat" @click="resetFault">
					{{ $t('dialog.resetHeaterFault.resetFault') }}
				</v-btn>

				<v-btn color="blue darken-1" flat="flat" @click="hide">
					{{ $t('dialog.resetHeaterFault.cancel') }}
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script>
'use strict'

import { mapActions } from 'vuex'

export default {
	props: {
		shown: {
			type: Boolean,
			required: true
		},
		heater: {
			type: Number,
			required: true
		}
	},
	methods: {
		...mapActions('machine', ['sendCode']),
		resetFault() {
			this.sendCode(`M562 P${this.heater}`);
			this.hide();
		},
		hide() {
			this.$emit('update:shown', false);
		}
	}
}
</script>
