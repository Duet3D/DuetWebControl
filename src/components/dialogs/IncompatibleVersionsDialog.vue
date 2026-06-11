<template>
	<v-dialog v-model="shown" max-width="480">
		<v-card>
			<v-card-title>
				<v-icon class="mr-2">mdi-alert</v-icon>
				{{ $t("dialog.incompatibleVersions.title") }}
			</v-card-title>

			<v-card-text>
				<p>{{ $t("dialog.incompatibleVersions.prompt") }}</p>
				<i18n-t tag="p" keypath="dialog.incompatibleVersions.upgradeNotice" class="mb-0">
					<template #docs>
						<a :href="upgradeDocs" target="_blank" rel="noopener noreferrer">
							{{ $t("dialog.incompatibleVersions.docsLink") }}
						</a>
					</template>
				</i18n-t>
			</v-card-text>

			<v-card-actions>
				<v-spacer />
				<v-btn ref="okButton" variant="text" @click="shown = false">
					{{ $t("generic.ok") }}
				</v-btn>
				<v-spacer />
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script setup lang="ts">
import { MachineStatus } from "@duet3d/objectmodel";

import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";
import { LogLevel, useUiStore } from "@/stores/ui";
import { isPatchLevelDiff, versionDiff } from "@/utils/version";

import packageInfo from "../../../package.json";

const machineStore = useMachineStore();
const settingsStore = useSettingsStore();
const uiStore = useUiStore();

const shown = ref(false);
const okButton = ref<{ $el: HTMLElement } | null>(null);
let checkVersionsTimeout: ReturnType<typeof setTimeout> | null = null;

// Programmatic focus on open: native `autofocus` only fires once at mount, and v-dialog teleports
// the content tree + runs its own focus-trap on the enter transition, which races with HTML's
// autofocus. Waiting one tick after `shown` flips true lets the dialog finish mounting before we
// pull focus to the OK button
watch(shown, (visible) => {
	if (!visible) {
		return;
	}
	nextTick(() => {
		const el = okButton.value?.$el;
		if (el instanceof HTMLElement) {
			el.focus();
		}
	});
});

const upgradeDocs = computed(() => machineStore.model.sbc !== null
	? "https://docs.duet3d.com/en/User_manual/Machine_configuration/SBC_setup"
	: "https://docs.duet3d.com/en/User_manual/RepRapFirmware/Updating_firmware");

// #region Version check

function checkVersions() {
	checkVersionsTimeout = null;
	if (!settingsStore.checkVersions) {
		return;
	}

	let versionMismatch = false;
	let patchVersionMismatch = false;
	try {
		const model = machineStore.model;
		const mainboardVersion = model.boards.find((board) => !board.canAddress)?.firmwareVersion;
		if (!mainboardVersion) {
			return;
		}

		// Expansion boards
		for (const board of model.boards) {
			if (board.canAddress && board.firmwareVersion) {
				const diff = versionDiff(mainboardVersion, board.firmwareVersion);
				if (diff === null) {
					continue;
				}
				if (isPatchLevelDiff(diff)) {
					console.warn(`Expansion board #${board.canAddress} minor version mismatch (MB ${mainboardVersion} != EXP ${board.firmwareVersion})`);
					patchVersionMismatch = true;
				} else {
					console.warn(`Expansion board #${board.canAddress} major version mismatch (MB ${mainboardVersion} != EXP ${board.firmwareVersion})`);
					versionMismatch = true;
				}
			}
		}

		// DSF
		if (!versionMismatch && model.sbc !== null) {
			const diff = versionDiff(mainboardVersion, model.sbc.dsf.version);
			if (diff !== null) {
				if (isPatchLevelDiff(diff)) {
					console.warn(`DSF minor version mismatch (MB ${mainboardVersion} != DSF ${model.sbc.dsf.version})`);
					patchVersionMismatch = true;
				} else {
					console.warn(`DSF major version mismatch (MB ${mainboardVersion} != DSF ${model.sbc.dsf.version})`);
					versionMismatch = true;
				}
			}
		}

		// DWC
		if (!versionMismatch) {
			const diff = versionDiff(mainboardVersion, packageInfo.version);
			if (diff !== null) {
				if (isPatchLevelDiff(diff)) {
					console.warn(`DWC minor version mismatch (MB ${mainboardVersion} != DWC ${packageInfo.version})`);
					patchVersionMismatch = true;
				} else {
					console.warn(`DWC major version mismatch (MB ${mainboardVersion} != DWC ${packageInfo.version})`);
					versionMismatch = true;
				}
			}
		}

		shown.value = versionMismatch;
		if (versionMismatch) {
			// Errors get console-only logging so the dialog isn't doubled up in the event log
			console.error(i18n.global.t("dialog.incompatibleVersions.title"),
				i18n.global.t("dialog.incompatibleVersions.prompt"));
		} else if (patchVersionMismatch) {
			uiStore.log(LogLevel.warning,
				i18n.global.t("dialog.incompatibleVersions.title"),
				i18n.global.t("dialog.incompatibleVersions.prompt"));
		}
	} catch (e) {
		console.warn("Failed to check software versions", e);
	}
}

function scheduleCheck() {
	if (checkVersionsTimeout === null) {
		checkVersionsTimeout = setTimeout(checkVersions, 2000);
	}
}

function cancelCheck() {
	if (checkVersionsTimeout !== null) {
		clearTimeout(checkVersionsTimeout);
		checkVersionsTimeout = null;
	}
}

// #endregion

// #region Lifecycle

onMounted(() => {
	if (!machineStore.isConnecting) {
		scheduleCheck();
	}
});

onBeforeUnmount(() => {
	cancelCheck();
});

const transientStates: MachineStatus[] = [MachineStatus.disconnected, MachineStatus.updating, MachineStatus.starting];

watch(() => machineStore.model.state.status, (to, from) => {
	if (transientStates.includes(to)) {
		cancelCheck();
	} else if (transientStates.includes(from)) {
		scheduleCheck();
	}
});

// #endregion
</script>
