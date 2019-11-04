<style scoped>
.grow {
	flex-grow: 1;
}
</style>

<template>
	<v-row class="component flex-shrink-1" :class="{ 'mt-2' : solo, 'grow' : grow }" no-gutters align="center">
		<v-col>
			<v-combobox ref="input" v-model="code" :items="displayedCodes" :solo="solo" :disabled="uiFrozen" :loading="sendingCode" :placeholder="$t('input.code.placeholder')" @keyup.enter="send" @change="change" hide-details>
				<template #item="{ item }">
					<code>{{ item.text }}</code>
					<v-spacer></v-spacer>
					<v-btn icon @click.prevent.stop="removeCode(item.value)">
						<v-icon>mdi-delete</v-icon>
					</v-btn>
				</template>
			</v-combobox>
		</v-col>

		<v-col class="ml-2 flex-shrink-1" cols="auto">
			<v-btn color="info" :disabled="uiFrozen" :loading="sendingCode" @click="doSend">
				<v-icon class="mr-2">mdi-send</v-icon> {{ $t('input.code.send') }} 
			</v-btn>
		</v-col>
	</v-row>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions, mapMutations } from 'vuex'

export default {
	computed: {
		...mapGetters(['uiFrozen']),
		...mapState('machine/settings', ['codes']),
		...mapState('settings', ['disableAutoComplete']),
		displayedCodes() {
			return this.disableAutoComplete ? [] : this.codes.map(code => ({ text: code, value: code }));
		}
	},
	data() {
		return {
			code: '',
			sendPending: false,
			sendingCode: false
		}
	},
	props: {
		grow: Boolean,
		solo: Boolean
	},
	methods: {
		...mapActions('machine', ['sendCode']),
		...mapMutations('machine/settings', ['addCode', 'removeCode']),
		change(value) {
			if (value && (this.sendPending || value.constructor !== String)) {
				this.sendPending = false;
				this.send();
			}
		},
		doSend() {
			if (this.$refs.input.isMenuActive) {
				this.$refs.input.isMenuActive = false;		// FIXME There must be a better solution than this
				this.sendPending = true;
			} else {
				this.send();
			}
		},
		hasUnprecedentedParameters: (code) => !code || code.trim() === '' || /(M23|M30|M32|M36)[^0-9]/i.test(code),
		async send() {
			this.$refs.input.isMenuActive = false;			// FIXME There must be a better solution than this

			const code = (this.code.constructor === String) ? this.code : this.code.value;
			if (code && code.trim() !== '' && !this.sendingCode) {
				let codeToSend = '', inQuotes = false, inWhiteSpace = false;
				if (this.hasUnprecedentedParameters(code)) {
					// Don't convert certain codes to upper-case
					codeToSend = code.trim();
				} else {
					// Convert code to upper-case and remove comments
					for (let i = 0; i < code.length; i++) {
						const char = code[i];
						if (inQuotes) {
							if (i < code.length - 1 && char === '\\' && code[i + 1] === '"') {
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
				}

				// Send the code and wait for completion
				this.sendingCode = true;
				try {
					const reply = await this.sendCode({ code: codeToSend, fromInput: true });
					if (!inQuotes && !reply.startsWith('Error: ') && !reply.startsWith('Warning: ') && !this.disableAutoComplete && this.codes.indexOf(codeToSend) === -1) {
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
