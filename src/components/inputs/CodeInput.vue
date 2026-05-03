<template>
	<v-row class="component flex-shrink-1" :class="{ 'mt-2': variant === 'solo', 'grow': grow }"
		   no-gutters align="center">
		<v-col>
			<v-combobox v-model="code" :items="displayedCodes" hide-no-data hide-selected
						:placeholder="$t('input.code.placeholder')" :disabled="uiStore.uiFrozen" :loading="doingCode"
						:variant="variant" maxlength="255" density="compact" hide-details
						menu-icon="" @keydown.enter.prevent="sendOnEnter">
				<template #item="{ item, props }">
					<v-list-item v-bind="props" :title="undefined">
						<code>{{ item.title }}</code>
						<template #append>
							<v-btn icon="mdi-delete" variant="text" size="small" density="compact"
								   @click.prevent.stop="cacheStore.removeLastSentCode(item.value)" />
						</template>
					</v-list-item>
				</template>
			</v-combobox>
		</v-col>

		<v-col class="ml-2 flex-shrink-1" cols="auto">
			<v-btn color="info" :disabled="uiStore.uiFrozen" :loading="doingCode" @click="send">
				<v-icon class="mr-2">mdi-send</v-icon> {{ $t("input.code.send") }}
			</v-btn>
		</v-col>
	</v-row>
</template>

<style scoped>
.grow {
	flex-grow: 1;
}
</style>

<script setup lang="ts">
import type { MessageBox } from "@duet3d/objectmodel";

import { useCacheStore } from "@/stores/cache";
import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";
import { useUiStore } from "@/stores/ui";

const cacheStore = useCacheStore();
const machineStore = useMachineStore();
const settingsStore = useSettingsStore();
const uiStore = useUiStore();

withDefaults(defineProps<{
	grow?: boolean;
	/**
	 * Vuetify variant for the inner combobox. Defaults to outlined for the app-bar use; the
	 * Console reference page picks `solo` for the body-of-page surface
	 */
	variant?: "solo" | "outlined";
}>(), { variant: "outlined" });

// Conditional G-code keywords that must keep their original case
const conditionalKeywords = ["abort", "echo", "if", "elif", "else", "while", "break", "continue", "var", "global", "set"];

const code = ref<string>("");
const doingCode = ref(false);
const ignoreEnter = ref(false);

// Most-recently-sent codes are appended to lastSentCodes; show them newest-first and filter by current input
const displayedCodes = computed<Array<{ title: string; value: string }>>(() => {
	if (settingsStore.disableAutoComplete) {
		return [];
	}
	const current = (code.value ?? "").toLowerCase();
	return cacheStore.lastSentCodes
		.filter(c => current === "" || c.toLowerCase().includes(current))
		.slice()
		.reverse()
		.map(c => ({ title: c, value: c }));
});

// Heuristic: some codes carry unprecedented parameters (filenames, message text) that must NOT be upper-cased
const hasUnprecedentedParameters = (input: string) => !input || /(M23|M28|M30|M32|M36|M117)[^0-9]/i.test(input);

async function sendOnEnter() {
	if (ignoreEnter.value) {
		ignoreEnter.value = false;
	} else {
		await send();
	}
}

async function send() {
	ignoreEnter.value = false;

	const raw = (code.value ?? "").trim();
	if (raw === "" || doingCode.value) {
		return;
	}

	let codeToSend = "";
	let bareCode = "";
	let inQuotes = false, inExpression = false, inWhiteSpace = false, inComment = false;

	if (!hasUnprecedentedParameters(codeToSend) && !conditionalKeywords.some(keyword => raw.startsWith(keyword))) {
		// Sanitize and upper-case the code while preserving quoted strings, expressions and comments
		for (let i = 0; i < raw.length; i++) {
			const char = raw[i];
			if (inQuotes) {
				if (i < raw.length - 1 && char === "\\" && raw[i + 1] === '"') {
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
				inExpression = (char !== "}");
			} else if (inComment) {
				codeToSend += char;
				inComment = (char !== ")");
			} else {
				if (char === '"') {
					inQuotes = true;
				} else if (char === " " || char === "\t") {
					if (inWhiteSpace) {
						continue;
					}
					inWhiteSpace = true;
				} else if (char === ";") {
					break;
				} else if (char === "(") {
					inComment = true;
				} else if (char === "{") {
					inExpression = true;
				}
				inWhiteSpace = false;
				codeToSend += char.toUpperCase();
				bareCode += raw.toUpperCase();
			}
		}
	} else {
		codeToSend = raw;
	}

	doingCode.value = true;
	try {
		const reply = await machineStore.sendCode(codeToSend, true);

		// M587/M589 carry WiFi credentials; do not persist them in the dropdown history
		if (!inQuotes && !settingsStore.disableAutoComplete &&
			!reply.startsWith("Error: ") && !reply.startsWith("Warning: ") &&
			!bareCode.includes("M587") && !bareCode.includes("M589")) {
			cacheStore.addLastSentCode(codeToSend.trim());
		}
	} catch {
		// handled before we get here
	} finally {
		doingCode.value = false;
	}
}

// Suppress Enter briefly after a message box appears so the same keystroke does not immediately
// send another code
let messageBoxIgnoreTimer: ReturnType<typeof setTimeout> | null = null;
watch(() => machineStore.model.state.messageBox as MessageBox | null, (to) => {
	if (to) {
		ignoreEnter.value = true;
		if (messageBoxIgnoreTimer !== null) {
			clearTimeout(messageBoxIgnoreTimer);
		}
		messageBoxIgnoreTimer = setTimeout(() => {
			ignoreEnter.value = false;
			messageBoxIgnoreTimer = null;
		}, 1000);
	}
});

onBeforeUnmount(() => {
	if (messageBoxIgnoreTimer !== null) {
		clearTimeout(messageBoxIgnoreTimer);
		messageBoxIgnoreTimer = null;
	}
});
</script>
