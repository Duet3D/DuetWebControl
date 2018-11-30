<template>
	<v-form @submit.prevent="sendCode" ref="form">
		<v-layout row inline :class="{ 'mt-2' : solo }">
			<v-combobox :solo="solo" :disabled="frozen" :placeholder="$t('input.code.placeholder')" v-model.trim="code" @keyup="onKeyUp"></v-combobox>
			<v-btn type="submit" color="info" :disabled="frozen" :depressed="sendingCode" :loading="sendingCode">
				<v-icon class="mr-2">send</v-icon> {{ $t('input.code.send') }} 
			</v-btn>
		</v-layout>
	</v-form>
</template>

<script>
'use strict'

import { mapGetters, mapActions } from 'vuex'
import { GCodeBufferError, GCodeDisconnectedError } from '../../utils/errors.js'

export default {
	computed: mapGetters('ui', ['frozen']),
	data() {
		return {
			code: '',
			sendingCode: false
		}
	},
	props: {
		solo: Boolean
	},
	methods: {
		...mapActions('machine', ['sendCode']),
		onKeyUp(e) {
			if (e.keyCode === 13) {
				this.send();
			}
		},
		async send() {
			if (this.code !== "" && !this.sendingCode) {
				this.sendingCode = true;
				try {
					await this.sendCode(this.code);
				} catch (e) {
					if (!(e instanceof GCodeDisconnectedError)) {
						const type = (e instanceof GCodeBufferError) ? 'warning' : 'error';
						this.$log(type, e.message);
					}
				}
				this.sendingCode = false;
			}
		}
	},
	watch: {
		frozen(to) {
			if (to) {
				this.code = '';
			}
		}
	}
}
</script>
