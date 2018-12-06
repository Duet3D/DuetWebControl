<template>
	<v-btn :color="color" :small="small" :title="title" :disabled="frozen" :loading="sendingCode" @click="click">
		<slot></slot>
	</v-btn>
</template>

<script>
'use strict'

import { mapGetters, mapActions } from 'vuex'

export default {
	computed: mapGetters('ui', ['frozen']),
	props: {
		code: {
			type: String,
			required: true
		},
		color: String,
		small: Boolean,
		title: String
	},
	data() {
		return {
			sendingCode: false
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
