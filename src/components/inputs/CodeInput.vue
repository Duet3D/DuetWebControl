<template>
	<v-form @submit.prevent="send" ref="form">
		<v-layout row inline :class="{ 'mt-2' : solo }">
			<v-flex>
				<v-combobox ref="input" v-model.trim="code" :items="machineUI.codes" :solo="solo" :disabled="frozen" :loading="sendingCode" :placeholder="$t('input.code.placeholder')" @keyup="onKeyUp"></v-combobox>
			</v-flex>

			<v-flex shrink>
				<v-btn type="submit" color="info" :disabled="frozen" :loading="sendingCode">
					<v-icon class="mr-2">send</v-icon> {{ $t('input.code.send') }} 
				</v-btn>
			</v-flex>
		</v-layout>
	</v-form>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions } from 'vuex'

export default {
	computed: {
		...mapGetters('ui', ['frozen', 'machineUI'])
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
			this.$refs.input.isMenuActive = false;			// FIXME There must be a better solution than this

			if (this.code !== "" && !this.sendingCode) {
				// TODO: Remove potential comments and convert to upper-case (see DWC1)

				this.sendingCode = true;
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
