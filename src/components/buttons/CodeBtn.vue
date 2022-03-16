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
			try {
				if (this.noWait) {
					// Run the requested code but don't wait for a result
					await this.sendCode({
						code: this.code,
						log: this.log,
						noWait: true
					});
				} else {
					// Wait for the code to complete and block while doing so
					this.waitingForCode = true;
					try {
						await this.sendCode({
							code: this.code,
							log: this.log
						});
					} finally {
						this.waitingForCode = false;
					}
				}
			} catch (e) {
				// handled before we get here
			}
		}
	}
}
</script>
