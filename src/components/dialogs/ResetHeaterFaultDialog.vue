<template>
	<v-dialog v-model="shown" max-width="360">
		<v-card>
			<v-card-title class="headline">
				<v-icon class="mr-1">mdi-alert</v-icon> {{ $t('dialog.resetHeaterFault.title') }}
			</v-card-title>

			<v-card-text>
				{{ $t('dialog.resetHeaterFault.prompt', [this.heater]) }}
			</v-card-text>

			<v-card-actions>
				<v-spacer></v-spacer>

				<v-btn color="blue darken-1" text :disabled="!!counter" @click="resetFault">
					{{ $t('dialog.resetHeaterFault.resetFault') + (counter ? ` (${counter})` : '') }}
				</v-btn>

				<v-btn color="blue darken-1" text @click="hide">
					{{ $t('generic.cancel') }}
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script>
'use strict'

import { mapActions } from 'vuex'

const countdownSeconds = 5

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
	data() {
		return {
			counter: countdownSeconds,
			timer: null
		}
	},
	methods: {
		...mapActions('machine', ['sendCode']),
		async resetFault() {
			try {
				await this.sendCode(`M562 P${this.heater}`);
			} finally {
				this.hide();
			}
		},
		hide() {
			this.$emit('update:shown', false);
		},
		countDown() {
			this.counter--;
			this.timer = (this.counter > 0) ? setTimeout(this.countDown.bind(this), 1000) : null;
		}
	},
	watch: {
		shown(to) {
			if (to) {
				if (!this.timer) {
					this.counter = countdownSeconds;
					this.countDown();
				}
			} else if (this.timer) {
				clearTimeout(this.timer);
				this.timer = null;
			}
		}
	}
}
</script>
