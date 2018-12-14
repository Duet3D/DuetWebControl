<template>
	<v-btn v-bind="$props" :disabled="$props.disabled || frozen" :loading="sendingCode" @click="click">
		<slot></slot>
	</v-btn>
</template>

<script>
'use strict'

import VBtn from 'vuetify/es5/components/VBtn'

import { mapGetters, mapActions } from 'vuex'

export default {
	computed: {
		...mapGetters('ui', ['frozen'])
	},
	data() {
		return {
			sendingCode: false
		}
	},
	extends: VBtn,
	props: {
		code: {
			type: String,
			required: true
		}
	},
	methods: {
		...mapActions(['sendCode']),
		async click() {
			if (!this.sendingCode) {
				this.sendingCode = true;
				try {
					await this.sendCode(this.code);
				} catch (e) {
					// handled before we get here
				}
				this.sendingCode = false;
			}
		}
	}
}
</script>
