<style scoped>
.grow {
	flex-grow: 1;
}
</style>

<template>
	<v-row class="component flex-shrink-1" :class="{ 'mt-2': solo, 'grow': grow }" no-gutters align="center">
		<v-col>
			<v-combobox ref="input" :solo="solo" hide-details :disabled="uiFrozen"
						:placeholder="$t('input.code.placeholder')"
						:search-input="(code instanceof Object) ? code.value : (code ?? '')"
						@update:search-input="code = $event ?? ''" :loading="doingCode" @keyup.enter="sendOnEnter"
						@change="change" @blur="wasFocused = showItems = ignoreEnter = false" @click="click"
						:items="displayedCodes" hide-selected @keyup.down="showItems = true" append-icon=""
						maxlength="255">
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
				<v-icon class="mr-2">mdi-send</v-icon> {{ $t("input.code.send") }}
			</v-btn>
		</v-col>
	</v-row>
</template>

<script lang="ts">
import Vue from "vue";

import store from "@/store";
import { MessageBox } from "@duet3d/objectmodel";

const conditionalKeywords = ["abort", "echo", "if", "elif", "else", "while", "break", "continue", "var", "global", "set"];

export default Vue.extend({
	computed: {
		uiFrozen(): boolean { return store.getters["uiFrozen"]; },
		displayedCodes(): Array<{ text: string, value: string }> {
			if (this.showItems && !store.state.settings.disableAutoComplete) {
				const currentCode = ((this.code instanceof Object) ? this.code.value : (this.code ?? "")).toLowerCase();
				return store.state.machine.cache.lastSentCodes
					.filter(code => (currentCode === "") || code.toLowerCase().includes(currentCode))
					.map(code => ({ text: code, value: code }))
					.reverse();
			}
			return [];
		},
		messageBox(): MessageBox | null { return store.state.machine.model.state.messageBox; }
	},
	data() {
		return {
			code: "" as string | { value: string },
			ignoreEnter: false,
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
		click() {
			if (this.wasFocused) {
				this.showItems = !this.showItems;
			} else {
				this.wasFocused = true;
			}
		},
		removeLastSentCode(code: string) {
			store.commit("machine/cache/removeLastSentCode", code);
		},
		change(value: string | { value: string } | null) {
			this.code = (value !== null) ? value : "";
		},
		hasUnprecedentedParameters: (code: string) => !code || /(M23|M28|M30|M32|M36|M117)[^0-9]/i.test(code),
		async sendOnEnter() {
			if (this.ignoreEnter) {
				this.ignoreEnter = false;
			} else {
				await this.send();
			}
		},
		async send() {
			this.ignoreEnter = false;
			this.showItems = false;

			const code = (this.code instanceof Object) ? this.code.value : this.code;
			if (code.trim() !== "" && !this.doingCode) {
				let codeToSend = '', bareCode = "", inQuotes = false, inExpression = false, inWhiteSpace = false, inComment = false;
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
					const reply = await store.dispatch("machine/sendCode", {
						code: codeToSend,
						fromInput: true
					});

					if (!inQuotes && !store.state.settings.disableAutoComplete &&
						!reply.startsWith("Error: ") && !reply.startsWith("Warning: ") &&
						bareCode.indexOf("M587") === -1 && bareCode.indexOf("M589") === -1) {
						// Automatically remember successful codes
						store.commit("machine/cache/addLastSentCode", codeToSend.trim());
					}
				} catch {
					// handled before we get here
				}
				this.doingCode = false;
			}
		}
	},
	watch: {
		code(to: string | { value: string }) {
			if (typeof to === "string" && to.length >= 2) {
				this.showItems = true;
			}
		},
		messageBox(to: MessageBox | null) {
			if (to) {
				// Don't handle "Enter" immediately when returning from a message box
				this.ignoreEnter = true;
				setTimeout(() => this.ignoreEnter = false, 1000);
			}
		}
	}
});
</script>