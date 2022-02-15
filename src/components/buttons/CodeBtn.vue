<template>
	<v-btn v-bind="$props" :disabled="$props.disabled || uiFrozen" :elevation="1" :loading="waitingForCode" @click="click" @contextmenu="$emit('contextmenu', $event)">
		<slot></slot>
	</v-btn>
</template>

<script>
'use strict'

import { VBtn } from 'vuetify/lib'

import { mapGetters, mapActions } from 'vuex'

export default {
	computed: {
		...mapGetters(['uiFrozen'])
	},
	data() {
		return {
			pendingCodes: [],
			waitingForCode: false
		}
	},
	extends: VBtn,
	props: {
		code: {
			type: String,
			required: true
		},
		disabled: Boolean,
		log: {
			type: Boolean,
			default: true
		},
		noWait: {
			type: Boolean,
			default: false
		}
	},
	methods: {
		...mapActions('machine', ['sendCode']),
		async click() {
			if (this.noWait) {
				// Make a queue of click events and process code by code
				this.pendingCodes.push(this.code);
				if (this.pendingCodes.length === 1) {
					do {
						try {
							await this.sendCode({
								code: this.pendingCodes[0],
								log: this.log,
								showSuccess: false
							});
							this.pendingCodes.shift();
						} catch (e) {
							// Stop processing pending codes on error
							this.pendingCodes = [];
							break;
						}
					} while (this.pendingCodes.length !== 0);
				}
			} else {
				// Wait for the code to complete
				this.waitingForCode = true;
				try {
					await this.sendCode({
						code: this.code,
						log: this.log,
						showSuccess: true
					});
				} catch (e) {
					// handled before we get here
				}
				this.waitingForCode = false;
			}
		}
	}
}
</script>
