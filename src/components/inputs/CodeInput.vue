<style scoped>
.grow {
	flex-grow: 1;
}
</style>

<template>
	<v-layout row class="component" :class="{ 'mt-2' : solo, 'grow' : grow }">
		<v-flex>
			<v-combobox ref="input" v-model.trim="code" :items="codes" :solo="solo" :disabled="uiFrozen" :loading="sendingCode" :placeholder="$t('input.code.placeholder')" @keyup.enter="send" hide-details></v-combobox>
		</v-flex>

		<v-flex shrink>
			<v-btn color="info" :disabled="uiFrozen" :loading="sendingCode" @click="send">
				<v-icon class="mr-2">send</v-icon> {{ $t('input.code.send') }} 
			</v-btn>
		</v-flex>
	</v-layout>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions, mapMutations } from 'vuex'

export default {
	computed: {
		...mapGetters(['uiFrozen']),
		...mapState('machine/settings', ['codes'])
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
		...mapActions('machine', ['sendCode']),
		...mapMutations('machine/settings', ['addCode']),
		async send() {
			this.$refs.input.isMenuActive = false;			// FIXME There must be a better solution than this

			if (this.code !== '' && !this.sendingCode) {
				// Convert the input to upper-case and remove comments
				let codeToSend = '', inQuotes = false, inWhiteSpace = false;
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
						} else if (char === ' ' || char === '\t') {
							// remove duplicate white spaces
							if (inWhiteSpace) {
								continue;
							}
							inWhiteSpace = true;
						} else if (char === ';' || char === '(') {
							// stop when comments start
							break;
						}
						inWhiteSpace = false;
						codeToSend += char.toUpperCase();
					}
				}
				codeToSend = codeToSend.trim();

				// Send the code and wait for completion
				this.sendingCode = true;
				try {
					const reply = await this.sendCode({ code: codeToSend, fromInput: true });
					if (!reply.startsWith('Error: ') && !reply.startsWith('Warning: ') && this.codes.indexOf(codeToSend) === -1) {
						// Automatically remember successful codes
						this.addCode(codeToSend);
					}
				} catch (e) {
					// handled before we get here
				}
				this.sendingCode = false;
			}
		}
	},
	watch: {
		uiFrozen(to) {
			if (to) {
				// Clear input when the UI is frozen
				this.code = '';
			}
		}
	}
}
</script>
