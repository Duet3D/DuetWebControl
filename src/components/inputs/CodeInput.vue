<template>
	<v-form @submit.prevent="send" ref="form">
		<v-layout row inline :class="{ 'mt-2' : solo }">
			<v-combobox ref="input" v-model.trim="code" :items="codes" :solo="solo" :disabled="frozen" :loading="sendingCode" :placeholder="$t('input.code.placeholder')" @keyup="onKeyUp"></v-combobox>
			<v-btn type="submit" color="info" :disabled="frozen" :loading="sendingCode">
				<v-icon class="mr-2">send</v-icon> {{ $t('input.code.send') }} 
			</v-btn>
		</v-layout>
	</v-form>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions } from 'vuex'

export default {
	computed: {
		...mapState('ui', ['codes']),
		...mapGetters('ui', ['frozen'])
	},
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
		...mapActions(['sendCode']),
		onKeyUp(e) {
			if (e.keyCode === 13) {
				this.send();
			}
		},
		async send() {
			if (this.code !== "" && !this.sendingCode) {
				this.sendingCode = true;
				this.$refs.input.isMenuActive = false;
				try {
					await this.sendCode(this.code);
				} catch (e) {
					// handled before we get here
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
