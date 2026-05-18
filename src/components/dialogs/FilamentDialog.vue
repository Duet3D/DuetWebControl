<template>
	<v-dialog v-model="shown" persistent width="360" @keydown.escape="hide">
		<v-card>
			<v-card-title>
				{{ titleText }}
			</v-card-title>

			<v-card-text>
				{{ filaments.length > 0 ? $t("dialog.filament.prompt") : $t("dialog.filament.noFilaments") }}

				<v-progress-linear indeterminate v-if="loading" />
				<v-list v-if="!loading">
					<v-list-item v-for="filament in filaments" :key="filament" @click="filamentClick(filament)">
						<v-icon class="mr-1">mdi-radiobox-marked</v-icon> {{ filament }}
					</v-list-item>
				</v-list>
			</v-card-text>

			<v-card-actions>
				<v-spacer />
				<v-btn color="blue-darken-1" variant="text" @click="hide">
					{{ $t("generic.cancel") }}
				</v-btn>
				<v-spacer />
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script setup lang="ts">
import { DisconnectedError } from "@duet3d/connectors";
import type { Tool } from "@duet3d/objectmodel";

import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";
import { useUiStore } from "@/stores/ui";

const props = withDefaults(defineProps<{
	tool: Tool | null;
	runMacros?: boolean;
}>(), {
	runMacros: true
});

const shown = defineModel<boolean>("shown", { required: true });

const machineStore = useMachineStore();
const settingsStore = useSettingsStore();
const uiStore = useUiStore();

const filaments = ref<Array<string>>([]);
const loading = ref(false);

// Resolved separately so each $t key is a literal in source - IDE i18n plugins can statically
// jump to the matching entry, which a ternary inside $t(...) would defeat
const titleText = computed(() => {
	if (!props.tool) {
		return i18n.global.t("generic.noValue");
	}
	if (props.tool.filamentExtruder >= 0 && getCurrentFilament()) {
		return i18n.global.t("dialog.filament.titleChange");
	}
	return i18n.global.t("dialog.filament.titleLoad");
});

function getCurrentFilament(): string | null {
	if (!props.tool || props.tool.filamentExtruder < 0 || props.tool.filamentExtruder >= machineStore.model.move.extruders.length) {
		return null;
	}
	return machineStore.model.move.extruders[props.tool.filamentExtruder]?.filament ?? null;
}

async function loadFilaments() {
	if (loading.value) {
		return;
	}

	loading.value = true;
	try {
		const response = await machineStore.getFileList(machineStore.model.directories.filaments);
		const names = response.filter(item => item.isDirectory).map(item => item.name);
		names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
		filaments.value = names;
	} catch (e) {
		if (!(e instanceof DisconnectedError)) {
			console.warn(e);
			uiStore.notifyError(e, i18n.global.t("error.filamentsLoadFailed"));
		}
		hide();
	}
	loading.value = false;
}

async function filamentClick(filament: string) {
	hide();

	if (!props.tool) {
		return;
	}

	const currentTool = machineStore.currentTool;
	let code = "";
	if (currentTool !== props.tool) {
		code = `T${props.tool.number}\n`;
	}

	const currentFilament = getCurrentFilament();
	if (currentFilament) {
		code += props.runMacros ? "M702\n" : "M702 P0\n";

		// Prompt the user between unload and load so they have a chance to swap the spool before
		// the new filament is fed. Gated on the workflow-behaviour setting so an experienced
		// user can opt out of the extra confirmation
		if (props.runMacros && settingsStore.behaviour.promptDuringFilamentChange) {
			code += `M400 M291 P"${i18n.global.t("dialog.filament.changePrompt.message")}" R"${i18n.global.t("dialog.filament.changePrompt.title")}" S2\n`;
		}
	}

	code += props.runMacros ? `M701 S"${filament}"\nM703` : `M701 P0 S"${filament}"\nM703`;
	try {
		await machineStore.sendCode(code);
	} catch {
		// handled before we get here
	}
}

function hide() {
	shown.value = false;
}

watch(shown, (to) => {
	if (to) {
		loadFilaments();
	}
});
</script>
