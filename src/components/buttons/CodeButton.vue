<template>
	<v-btn :color="color" :small="small" :disabled="frozen" :loading="sendingCode" @click="click">
		<slot></slot>
	</v-btn>
</template>

<script>
'use strict'

import { mapGetters, mapActions } from 'vuex'
import { DisconnectedError } from '../../utils/errors.js'

export default {
	computed: mapGetters('ui', ['frozen']),
	props: {
		code: {
			type: String,
			required: true
		},
		color: String,
		small: Boolean
	},
	data() {
		return {
			sendingCode: false
		}
	},
	methods: {
		...mapActions('machine', ['sendCode']),
		async click() {
			if (!this.sendingCode) {
				this.sendingCode = true;
				try {
					const response = await this.sendCode(this.code);
					this.$logCode(this.code, response);
				} catch (e) {
					if (!(e instanceof DisconnectedError)) {
						this.$log('error', this.code, e.message);
					}
				}
				this.sendingCode = false;
			}
		}
	}
}
</script>
