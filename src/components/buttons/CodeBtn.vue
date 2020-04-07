<template>
	<v-btn v-bind="$props" :disabled="$props.disabled || uiFrozen" :loading="waitingForCode" @click="click" @contextmenu="$emit('contextmenu', $event)">
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
			if (!this.waitingForCode) {
				this.waitingForCode = !this.noWait;
				try {
					await this.sendCode({ code: this.code, log: this.log, showSuccess: !this.noWait });
				} catch (e) {
					// handled before we get here
				}
				this.waitingForCode = false;
			}
		}
	}
}
</script>
