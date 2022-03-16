<style scoped>
.grow {
	flex-grow: 1;
}
</style>

<template>
	<v-row class="component flex-shrink-1" :class="{ 'mt-2' : solo, 'grow' : grow }" no-gutters align="center">
		<v-col>
			<v-combobox ref="input" :solo="solo" hide-details :disabled="uiFrozen" :placeholder="$t('input.code.placeholder')"
						:search-input.sync="code" :loading="doingCode" @keyup.enter="send" @change="change" @blur="wasFocused = showItems = false"
						@click="click" :items="displayedCodes" hide-selected @keyup.down="showItems = true" append-icon="">
				<template #item="{ item }">
					<code>{{ item.text }}</code>
					<v-spacer></v-spacer>
					<v-btn icon @click.prevent.stop="removeLastSentCode(item.value)">
						<v-icon>mdi-delete</v-icon>
					</v-btn>
				</template>
			</v-combobox>
		</v-col>

		<v-col class="ml-2 flex-shrink-1" cols="auto">
			<v-btn color="info" :disabled="uiFrozen" :loading="doingCode" @click="send">
				<v-icon class="mr-2">mdi-send</v-icon> {{ $t('input.code.send') }} 
			</v-btn>
		</v-col>
	</v-row>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions, mapMutations } from 'vuex'

const conditionalKeywords = ['abort', 'echo', 'if', 'elif', 'else', 'while', 'break', 'var', 'set'];

export default {
	computed: {
		...mapGetters(['uiFrozen']),
		...mapState('machine/cache', ['lastSentCodes']),
		...mapState('settings', ['disableAutoComplete']),
		displayedCodes() {
			if (this.showItems && !this.disableAutoComplete) {
				const currentCode = this.code ? this.code.toLowerCase() : '';
				return this.lastSentCodes
					.filter(code => (currentCode === '') || (code.toLowerCase().indexOf(currentCode) !== -1))
					.map(code => ({ text: code, value: code }))
					.reverse();
			}
			return [];
		}
	},
	data() {
		return {
			code: '',
			wasFocused: false,
			showItems: false,
			sendPending: false,
			doingCode: false
		}
	},
	props: {
		grow: Boolean,
		solo: Boolean
	},
	methods: {
		...mapActions('machine', ['sendCode']),
		...mapMutations('machine/cache', ['addLastSentCode', 'removeLastSentCode']),
		click() {
			if (this.wasFocused) {
				this.showItems = !this.showItems;
			} else {
				this.wasFocused = true;
			}
		},
		change(value) {
			if (value && !(value instanceof String)) {
				this.code = value.value;
			}
		},
		hasUnprecedentedParameters: (code) => !code || /(M23|M28|M30|M32|M36|M117)[^0-9]/i.test(code),
		async send() {
			this.showItems = false;

			const code = (!this.code || this.code.constructor === String) ? this.code : this.code.value;
			if (code && code.trim() !== '' && !this.doingCode) {
				let codeToSend = '', bareCode = '', inQuotes = false, inExpression = false, inWhiteSpace = false, inComment = false;
				if (!this.hasUnprecedentedParameters(codeToSend) &&
					!conditionalKeywords.some(keyword => code.trim().startsWith(keyword))) {
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
						} else if (inExpression) {
							codeToSend += char;
							inExpression = (char !== '}');
						} else if (inComment) {
							codeToSend += char;
							inComment = (char !== ')');
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
							} else if (char === ';') {
								// stop when final comments start
								break;
							} else if (char === '(') {
								// don't process chars from encapsulated comments
								inComment = true;
							} else if (char === '{') {
								// don't process chars from expressions
								inExpression = true;
							}
							inWhiteSpace = false;
							codeToSend += char.toUpperCase();
							bareCode += code.toUpperCase();
						}
					}
				} else {
					// Don't modify the user input
					codeToSend = code;
				}

				// Send the code and wait for completion
				this.doingCode = true;
				try {
					const reply = await this.sendCode({ code: codeToSend, fromInput: true });
					if (!inQuotes && !this.disableAutoComplete &&
						!reply.startsWith('Error: ') && !reply.startsWith('Warning: ') &&
						bareCode.indexOf('M587') === -1 && bareCode.indexOf('M589') === -1) {
						// Automatically remember successful codes
						this.addLastSentCode(codeToSend.trim());
					}
				} catch {
					// handled before we get here
				}
				this.doingCode = false;
			}
		}
	},
	watch: {
		code(to) {
			if (to && to.length >= 2) {
				this.showItems = true;
			}
		},
		uiFrozen(to) {
			if (to) {
				// Clear input when the UI is frozen
				this.code = '';
			}
		}
	}
}
</script>
