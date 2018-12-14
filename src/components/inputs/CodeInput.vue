<style scoped>
.grow {
	flex-grow: 1;
}
</style>

<template>
	<v-layout row class="component" :class="{ 'mt-2' : solo, 'grow' : grow }">
		<v-flex>
			<v-combobox ref="input" v-model="code" :items="machineUI.codes" :solo="solo" :disabled="frozen" :loading="sendingCode" :placeholder="$t('input.code.placeholder')" @keyup.enter="send" hide-details></v-combobox>
		</v-flex>

		<v-flex shrink>
			<v-btn type="submit" color="info" :disabled="frozen" :loading="sendingCode">
				<v-icon class="mr-2">send</v-icon> {{ $t('input.code.send') }} 
			</v-btn>
		</v-flex>
	</v-layout>
</template>

<script>
'use strict'

import { mapGetters, mapActions } from 'vuex'

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
		grow: Boolean,
		solo: Boolean
	},
	methods: {
		...mapActions(['sendCode']),
		async send() {
			this.$refs.input.isMenuActive = false;			// FIXME There must be a better solution than this

			if (this.code !== "" && !this.sendingCode) {
				// Convert the input to upper-case and remove comments
				let codeToSend = '', inQuotes = false;
				for (let i = 0; i < this.code.length; i++) {
					const char = this.code[i];
					if (inQuotes) {
						if (i < this.code.length - 1 && char === '\\' && this.code[i + 1] === '"') {
							codeToSend += '\\"';
							i++;
						} else {
							if (char === '"') {
								inQuotes = false;
							}
							codeToSend += char;
						}
					} else {
						if (char === '"') {
							// don't convert escaped strings
							inQuotes = true;
						} else if (char === ';' || char === '(') {
							// stop when comments start
							break;
						}
						codeToSend += char.toUpperCase();
					}
				}
				codeToSend = codeToSend.trim();

				// Send the code and wait for completion
				this.sendingCode = true;
				try {
					await this.sendCode(codeToSend);
					// TODO save code on successful completion
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
				// Clear input when the UI is frozen
				this.code = '';
			}
		}
	}
}
</script>
