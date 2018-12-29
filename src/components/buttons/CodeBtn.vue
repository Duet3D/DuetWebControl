<template>
	<v-btn v-bind="$props" :disabled="$props.disabled || uiFrozen" :loading="waitingForCode" @click="click" @contextmenu="$emit('contextmenu', $event)" tabindex="0">
		<slot></slot>
	</v-btn>
</template>

<script>
'use strict'

import VBtn from 'vuetify/es5/components/VBtn'

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
		noWait: Boolean
	},
	methods: {
		...mapActions('machine', ['sendCode']),
		async click() {
			if (!this.waitingForCode) {
				this.waitingForCode = !this.noWait;
				try {
					await this.sendCode({ code: this.code, showSuccess: !this.noWait });
				} catch (e) {
					// handled before we get here
				}
				this.waitingForCode = false;
			}
		}
	}
}
</script>
