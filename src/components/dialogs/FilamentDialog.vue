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
				<v-btn variant="text" @click="hide">
					{{ $t("generic.cancel") }}
				</v-btn>
				<v-spacer />
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script setup lang="ts">
import { DisconnectedError } from "@duet3d/connectors";
import { CodeChannel, InputChannelState, type Tool } from "@duet3d/objectmodel";

import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { useUiStore } from "@/stores/ui";

const props = withDefaults(defineProps<{
	tool: Tool | null;
	runMacros?: boolean;
	promptDuringChange?: boolean;
}>(), {
	runMacros: true,
	promptDuringChange: true
});

const shown = defineModel<boolean>("shown", { required: true });

const machineStore = useMachineStore();
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

// RRF throws away codes that arrive on an input channel while that channel is waiting for a message
// box to be acknowledged, so a batch like M702 + M291 + M701 loses everything after the M291 - be it
// the one below or one from a user's own unload.g. Replies cannot be matched to the codes that caused
// them either, hence the individual steps are sequenced by watching the HTTP channel go idle again.
// DSF keeps codes of the same channel in order and resolves them only when they are really done, so
// this is only needed in standalone mode. See RepRapFirmware#1224 and RepRapFirmware#925
async function waitForHttpChannel() {
	if (machineStore.model.sbc !== null) {
		return;
	}

	// The first update is awaited unconditionally because the channel may not have picked up the
	// codes that were just sent, which would make it look idle although it is about to become busy
	do {
		await machineStore.waitForModelUpdate();
	} while (isHttpChannelBusy());
}

// inMacro is checked as well because a channel that is between two codes of a running macro reports
// itself as idle. stackDepth would cover that too but it stays up after a plain M120, so waiting for
// it to drop to zero could never finish
function isHttpChannelBusy(): boolean {
	const httpInput = machineStore.model.inputs[CodeChannel.http];
	return (httpInput !== null && (httpInput.state !== InputChannelState.idle || httpInput.inMacro || machineStore.model.state.messageBox !== null));
}

async function filamentClick(filament: string) {
	hide();

	if (!props.tool) {
		return;
	}

	try {
		if (machineStore.currentTool !== props.tool) {
			await machineStore.sendCode(`T${props.tool.number}`);
			await waitForHttpChannel();
		}

		if (!props.runMacros) {
			await machineStore.sendCode(getCurrentFilament() ? `M702 P0\nM701 P0 S"${filament}"\nM703` : `M701 P0 S"${filament}"\nM703`);
			return;
		}

		if (getCurrentFilament()) {
			await machineStore.sendCode("M702");
			await waitForHttpChannel();

			// Prompt the user between unload and load so they have a chance to swap the spool before
			// the new filament is fed. Gated on the panel setting so an experienced user can opt out
			// of the extra confirmation
			if (props.promptDuringChange) {
				await machineStore.sendCode(`M400\nM291 P"${i18n.global.t("dialog.filament.changePrompt.message")}" R"${i18n.global.t("dialog.filament.changePrompt.title")}" S2`);
				await waitForHttpChannel();
			}
		}

		await machineStore.sendCode(`M701 S"${filament}"`);
		await waitForHttpChannel();
		await machineStore.sendCode("M703");
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
