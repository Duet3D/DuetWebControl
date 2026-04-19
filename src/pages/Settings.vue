<!-- Settings page. Single route with tabs for General + Plugins. The future Machine and Webcam
	 panels go on the General tab once their per-panel UI is ported; plugin install/uninstall,
	 webcam preview, settings import/export still live in follow-up commits -->
<route lang="json">
{
	"meta": {
		"menu": {
			"category": "settings",
			"icon": "mdi-wrench",
			"caption": "menu.settings.caption",
			"order": 10
		}
	}
}
</route>

<template>
	<v-card>
		<v-tabs v-model="activeTab" align-tabs="start" show-arrows density="compact">
			<v-tab v-for="tab in settingsTabs" :key="tab.key" :value="tab.key" class="text-none">
				<v-icon size="small" class="mr-2">{{ tab.icon }}</v-icon>
				{{ $t(tab.captionKey) }}
			</v-tab>
		</v-tabs>

		<v-window v-model="activeTab" :touch="false">
			<v-window-item value="general" eager>
				<v-container fluid>
					<v-row dense>
						<v-col cols="12" md="6">
							<v-card>
								<v-card-title>
									<v-icon class="mr-2">mdi-palette</v-icon>
									{{ $t("settings.appearance.caption") }}
								</v-card-title>
								<v-card-text>
									<v-switch v-model="settingsStore.darkTheme" color="primary"
											  :label="$t('settings.appearance.darkTheme')" density="comfortable"
											  hide-details />
									<v-select v-model="settingsStore.locale" :items="languageOptions" item-title="label"
											  item-value="value" :label="$t('settings.appearance.language')"
											  variant="outlined" density="comfortable" hide-details class="mt-4" />
								</v-card-text>
							</v-card>
						</v-col>

						<v-col cols="12" md="6">
							<v-card>
								<v-card-title>
									<v-icon class="mr-2">mdi-counter</v-icon>
									{{ $t("settings.units.caption") }}
								</v-card-title>
								<v-card-text>
									<v-switch v-model="settingsStore.useBinaryPrefix" color="primary"
											  :label="$t('settings.units.binaryPrefix')"
											  :hint="$t('settings.units.binaryPrefixHint')" density="comfortable"
											  persistent-hint />
								</v-card-text>
							</v-card>
						</v-col>

						<v-col cols="12" md="6">
							<v-card>
								<v-card-title>
									<v-icon class="mr-2">mdi-bell</v-icon>
									{{ $t("settings.notifications.caption") }}
								</v-card-title>
								<v-card-text>
									<v-switch v-model="settingsStore.notifications.errorsPersistent" color="primary"
											  :label="$t('settings.notifications.errorsPersistent')" density="comfortable"
											  hide-details />
									<v-slider v-model="notificationTimeoutSeconds" :min="1" :max="30" step="1"
											  :label="$t('settings.notifications.timeout')" thumb-label class="mt-4"
											  hide-details />
								</v-card-text>
							</v-card>
						</v-col>

						<v-col cols="12" md="6">
							<v-card>
								<v-card-title>
									<v-icon class="mr-2">mdi-cog-sync</v-icon>
									{{ $t("settings.machine.caption") }}
								</v-card-title>
								<v-card-text>
									<v-text-field v-model.number="settingsStore.updateInterval" type="number"
												  :label="$t('settings.machine.updateInterval')" :hint="$t('settings.machine.updateIntervalHint')"
												  variant="outlined" density="comfortable" persistent-hint suffix="ms" />
									<v-switch v-model="settingsStore.crcUploads" color="primary"
											  :label="$t('settings.machine.crcUploads')" density="comfortable"
											  class="mt-2" hide-details />

									<v-divider class="my-3" />

									<div class="d-flex align-center">
										<div class="flex-grow-1">
											<div class="text-body-2">{{ $t("settings.machine.installCaption") }}</div>
											<div class="text-caption text-medium-emphasis">
												{{ $t("settings.machine.installHint") }}
											</div>
										</div>
										<v-btn color="primary" :loading="installingFirmware"
											   :disabled="!machineStore.isConnected || uiStore.uiFrozen"
											   @click="pickFirmwareFiles">
											<v-icon class="mr-1">mdi-package-down</v-icon>
											{{ $t("settings.machine.install") }}
										</v-btn>
									</div>
								</v-card-text>
							</v-card>
						</v-col>
					</v-row>
				</v-container>
			</v-window-item>

			<v-window-item value="display">
				<v-container fluid>
					<v-row dense>
						<v-col cols="12" md="6">
							<v-card>
								<v-card-title>
									<v-icon class="mr-2">mdi-view-dashboard</v-icon>
									{{ $t("settings.display.layoutCaption") }}
								</v-card-title>
								<v-card-text>
									<v-select v-model="settingsStore.layoutMode" :items="layoutOptions"
											  item-title="label" item-value="value"
											  :label="$t('settings.display.layoutMode')" variant="outlined"
											  density="comfortable" hide-details />
									<v-switch v-model="settingsStore.iconMenu" color="primary"
											  :label="$t('settings.display.iconMenu')"
											  :hint="$t('settings.display.iconMenuHint')" density="comfortable"
											  persistent-hint class="mt-2" />
									<v-switch v-model="settingsStore.numericInputs" color="primary"
											  :label="$t('settings.display.numericInputs')" density="comfortable"
											  hide-details class="mt-2" />
									<v-switch v-model="settingsStore.disableAutoComplete" color="primary"
											  :label="$t('settings.display.disableAutoComplete')" density="comfortable"
											  hide-details class="mt-2" />
									<v-switch v-model="settingsStore.checkVersions" color="primary"
											  :label="$t('settings.display.checkVersions')" density="comfortable"
											  hide-details class="mt-2" />
								</v-card-text>
							</v-card>
						</v-col>

						<v-col cols="12" md="6">
							<v-card>
								<v-card-title>
									<v-icon class="mr-2">mdi-toolbox</v-icon>
									{{ $t("settings.display.toolsCaption") }}
								</v-card-title>
								<v-card-text>
									<v-switch v-model="settingsStore.groupTools" color="primary"
											  :label="$t('settings.display.groupTools')" density="comfortable"
											  hide-details />
									<v-switch v-model="settingsStore.groupByExtruders" color="primary"
											  :label="$t('settings.display.groupByExtruders')" density="comfortable"
											  hide-details class="mt-2" />
									<v-switch v-model="settingsStore.groupByHeaters" color="primary"
											  :label="$t('settings.display.groupByHeaters')" density="comfortable"
											  hide-details class="mt-2" />
									<v-switch v-model="settingsStore.groupByOffsets" color="primary"
											  :label="$t('settings.display.groupByOffsets')" density="comfortable"
											  hide-details class="mt-2" />
									<v-switch v-model="settingsStore.groupBySpindle" color="primary"
											  :label="$t('settings.display.groupBySpindle')" density="comfortable"
											  hide-details class="mt-2" />
									<v-switch v-model="settingsStore.showMixingControls" color="primary"
											  :label="$t('settings.display.showMixingControls')" density="comfortable"
											  hide-details class="mt-2" />
									<v-text-field v-model.number="settingsStore.babystepAmount" type="number"
												  step="0.01" :label="$t('settings.display.babystepAmount')"
												  variant="outlined" density="comfortable" hide-details
												  class="mt-4" suffix="mm" />
								</v-card-text>
							</v-card>
						</v-col>
					</v-row>
				</v-container>
			</v-window-item>

			<v-window-item value="webcam">
				<v-container fluid>
					<v-row dense>
						<v-col cols="12" md="8">
							<v-card>
								<v-card-title>
									<v-icon class="mr-2">mdi-webcam</v-icon>
									{{ $t("settings.webcam.caption") }}
								</v-card-title>
								<v-card-text>
									<v-switch v-model="settingsStore.webcam.enabled" color="primary"
											  :label="$t('settings.webcam.enabled')" density="comfortable"
											  hide-details />
									<v-text-field v-model="settingsStore.webcam.url"
												  :label="$t('settings.webcam.url')" variant="outlined"
												  density="comfortable" hide-details class="mt-4" />
									<v-text-field v-model="settingsStore.webcam.liveUrl"
												  :label="$t('settings.webcam.liveUrl')"
												  :hint="$t('settings.webcam.liveUrlHint')" variant="outlined"
												  density="comfortable" persistent-hint class="mt-4" />
									<v-text-field v-model.number="settingsStore.webcam.updateInterval" type="number"
												  :label="$t('settings.webcam.updateInterval')" variant="outlined"
												  density="comfortable" hide-details class="mt-4" suffix="ms" />
									<v-switch v-model="settingsStore.webcam.embedded" color="primary"
											  :label="$t('settings.webcam.embedded')"
											  :hint="$t('settings.webcam.embeddedHint')" density="comfortable"
											  persistent-hint class="mt-2" />
									<v-select v-model="settingsStore.webcam.flip" :items="flipOptions"
											  item-title="label" item-value="value"
											  :label="$t('settings.webcam.flip')" variant="outlined"
											  density="comfortable" hide-details class="mt-4" />
									<v-text-field v-model.number="settingsStore.webcam.rotation" type="number"
												  :label="$t('settings.webcam.rotation')" variant="outlined"
												  density="comfortable" hide-details class="mt-4" suffix="°" />
								</v-card-text>
							</v-card>
						</v-col>
					</v-row>
				</v-container>
			</v-window-item>

			<v-window-item value="communication">
				<v-container fluid>
					<v-row dense>
						<v-col cols="12" md="6">
							<v-card>
								<v-card-title>
									<v-icon class="mr-2">mdi-lan</v-icon>
									{{ $t("settings.communication.caption") }}
								</v-card-title>
								<v-card-text>
									<v-text-field v-model.number="settingsStore.maxRetries" type="number"
												  :label="$t('settings.communication.maxRetries')" variant="outlined"
												  density="comfortable" hide-details min="0" />
									<v-text-field v-model.number="settingsStore.retryDelay" type="number"
												  :label="$t('settings.communication.retryDelay')" variant="outlined"
												  density="comfortable" hide-details class="mt-4" suffix="ms" />
									<v-text-field v-model.number="settingsStore.pingInterval" type="number"
												  :label="$t('settings.communication.pingInterval')" variant="outlined"
												  density="comfortable" hide-details class="mt-4" suffix="ms" />
								</v-card-text>
							</v-card>
						</v-col>
						<v-col cols="12" md="6">
							<v-card>
								<v-card-title>
									<v-icon class="mr-2">mdi-file-upload</v-icon>
									{{ $t("settings.communication.transferCaption") }}
								</v-card-title>
								<v-card-text>
									<v-text-field v-model.number="settingsStore.fileTransferRetryThreshold"
												  type="number" :label="$t('settings.communication.retryThreshold')"
												  :hint="$t('settings.communication.retryThresholdHint')"
												  variant="outlined" density="comfortable" persistent-hint
												  suffix="B" />
									<v-switch v-model="settingsStore.ignoreFileTimestamps" color="primary"
											  :label="$t('settings.communication.ignoreFileTimestamps')"
											  density="comfortable" hide-details class="mt-2" />
								</v-card-text>
							</v-card>
						</v-col>
					</v-row>
				</v-container>
			</v-window-item>

			<v-window-item value="plugins">
				<v-container fluid>
					<div class="d-flex align-center mb-3">
						<v-spacer />
						<v-btn color="primary" :loading="installing" :disabled="!machineStore.isConnected"
							   @click="pickPluginZip">
							<v-icon class="mr-1">mdi-cloud-upload</v-icon>
							{{ $t("settings.plugins.install") }}
						</v-btn>
					</div>

					<v-alert v-if="plugins.length === 0" type="info" variant="tonal" class="ma-0">
						{{ $t("settings.plugins.noPlugins") }}
					</v-alert>

					<v-table v-else density="compact">
						<thead>
							<tr>
								<th class="text-left">{{ $t("settings.plugins.headers.name") }}</th>
								<th class="text-left">{{ $t("settings.plugins.headers.author") }}</th>
								<th class="text-left">{{ $t("settings.plugins.headers.version") }}</th>
								<th class="text-left">{{ $t("settings.plugins.headers.license") }}</th>
								<th class="text-left">{{ $t("settings.plugins.headers.status") }}</th>
								<th class="text-right">{{ $t("settings.plugins.headers.actions") }}</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="plugin in plugins" :key="plugin.id">
								<td>
									{{ plugin.name }}
									<v-chip v-if="isBuiltin(plugin.id)" size="x-small" class="ml-2">
										{{ $t("settings.plugins.builtin") }}
									</v-chip>
								</td>
								<td>{{ plugin.author }}</td>
								<td>{{ plugin.version }}</td>
								<td>{{ plugin.license || $t("generic.noValue") }}</td>
								<td>
									<v-chip size="x-small"
											:color="isStarted(plugin.id) ? 'success' : undefined">
										{{ isStarted(plugin.id)
											? $t("settings.plugins.started") : $t("settings.plugins.stopped") }}
									</v-chip>
								</td>
								<td class="text-right">
									<v-btn v-if="isStarted(plugin.id)" size="small" variant="text" color="warning"
										   :loading="busyPluginId === plugin.id" @click="stop(plugin.id)">
										<v-icon class="mr-1">mdi-stop</v-icon>
										{{ $t("settings.plugins.stop") }}
									</v-btn>
									<v-btn v-else size="small" variant="text" color="success"
										   :loading="busyPluginId === plugin.id" @click="start(plugin.id)">
										<v-icon class="mr-1">mdi-play</v-icon>
										{{ $t("settings.plugins.start") }}
									</v-btn>
									<v-btn v-if="!isBuiltin(plugin.id)" size="small" variant="text" color="error"
										   :loading="busyPluginId === plugin.id" @click="askUninstall(plugin)">
										<v-icon class="mr-1">mdi-delete</v-icon>
										{{ $t("settings.plugins.uninstall") }}
									</v-btn>
								</td>
							</tr>
						</tbody>
					</v-table>
				</v-container>
			</v-window-item>

			<v-window-item value="about">
				<v-container fluid>
					<v-row dense>
						<v-col cols="12" md="6">
							<v-card>
								<v-card-title>
									<v-icon class="mr-2">mdi-information</v-icon>
									{{ $t("settings.about.dwc") }}
								</v-card-title>
								<v-card-text>
									<div><strong>{{ $t("settings.about.version") }}:</strong> {{ dwcVersion }}</div>
									<div class="mt-2">
										<strong>{{ $t("settings.about.hostname") }}:</strong>
										{{ machineStore.model.network.hostname || $t("generic.noValue") }}
									</div>
								</v-card-text>
							</v-card>
						</v-col>
						<v-col cols="12" md="6">
							<v-card>
								<v-card-title>
									<v-icon class="mr-2">mdi-chip</v-icon>
									{{ $t("settings.about.boards") }}
								</v-card-title>
								<v-card-text>
									<v-alert v-if="boards.length === 0" type="info" variant="tonal" class="mb-0">
										{{ $t("settings.about.noBoards") }}
									</v-alert>
									<v-table v-else density="compact">
										<thead>
											<tr>
												<th class="text-left">{{ $t("settings.about.boardName") }}</th>
												<th class="text-left">{{ $t("settings.about.boardFirmware") }}</th>
											</tr>
										</thead>
										<tbody>
											<tr v-for="(board, idx) in boards" :key="idx">
												<td>{{ board.name || $t("generic.noValue") }}</td>
												<td>
													{{ board.firmwareName }} {{ board.firmwareVersion }}
													<span v-if="board.firmwareDate" class="text-medium-emphasis">
														({{ board.firmwareDate }})
													</span>
												</td>
											</tr>
										</tbody>
									</v-table>
								</v-card-text>
							</v-card>
						</v-col>
					</v-row>
				</v-container>
			</v-window-item>
		</v-window>
	</v-card>

	<input ref="pluginInput" type="file" accept=".zip" hidden @change="onPluginPicked" />
	<input ref="firmwareInput" type="file" multiple accept=".zip,.bin,.uf2,.deb" hidden
		   @change="onFirmwarePicked" />

	<ConfirmDialog v-model:shown="uninstallDialog.shown" :title="$t('settings.plugins.uninstallTitle')"
				   :prompt="$t('settings.plugins.uninstallPrompt', [uninstallDialog.name])"
				   icon="mdi-alert" @confirmed="confirmUninstall" />

	<FirmwareUpdateDialog v-model:shown="firmwareDialog.shown" :plan="firmwareDialog.plan"
						  @confirmed="onFirmwareUpdateConfirmed" @cancelled="onFirmwareUpdateCancelled" />

	<ConfigUpdatedDialog v-model:shown="configUpdatedDialog.shown" />
</template>

<script setup lang="ts">
import type { Plugin } from "@duet3d/objectmodel";

import type { FirmwareUpdatePlan } from "@/composables/useFirmwareInstall";
import ConfigUpdatedDialog from "@/components/dialogs/ConfigUpdatedDialog.vue";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog.vue";
import FirmwareUpdateDialog from "@/components/dialogs/FirmwareUpdateDialog.vue";
import { PluginBundleDetectedError, useFirmwareInstall } from "@/composables/useFirmwareInstall";
import i18n from "@/i18n";
import { isPluginBuiltIn, isPluginLoaded, loadDwcPlugin, unloadDwcPlugin } from "@/plugins";
import Events from "@/utils/events";
import { isPrinting } from "@/utils/enums";
import { useMachineStore } from "@/stores/machine";
import { LayoutMode, useSettingsStore, WebcamFlip } from "@/stores/settings";
import { LogLevel, useUiStore } from "@/stores/ui";
import { getErrorMessage } from "@/utils/errors";

import packageInfo from "../../package.json";

interface SettingsTab {
	key: string;
	icon: string;
	captionKey: string;
}

const settingsTabs: Array<SettingsTab> = [
	{ key: "general", icon: "mdi-tune", captionKey: "settings.tabs.general" },
	{ key: "display", icon: "mdi-monitor-dashboard", captionKey: "settings.tabs.display" },
	{ key: "webcam", icon: "mdi-webcam", captionKey: "settings.tabs.webcam" },
	{ key: "communication", icon: "mdi-lan", captionKey: "settings.tabs.communication" },
	{ key: "plugins", icon: "mdi-puzzle", captionKey: "settings.tabs.plugins" },
	{ key: "about", icon: "mdi-information", captionKey: "settings.tabs.about" },
];

const machineStore = useMachineStore();
const settingsStore = useSettingsStore();
const uiStore = useUiStore();

const activeTab = ref<string>("general");

const languageOptions = computed(() => [
	{ label: "English", value: "en" },
	{ label: "Deutsch", value: "de" },
]);

const flipOptions = computed(() => [
	{ label: i18n.global.t("settings.webcam.flipOptions.none"), value: WebcamFlip.None },
	{ label: i18n.global.t("settings.webcam.flipOptions.x"), value: WebcamFlip.X },
	{ label: i18n.global.t("settings.webcam.flipOptions.y"), value: WebcamFlip.Y },
	{ label: i18n.global.t("settings.webcam.flipOptions.both"), value: WebcamFlip.Both },
]);

const layoutOptions = computed(() => [
	{ label: i18n.global.t("settings.display.layoutOptions.default"), value: LayoutMode.default },
	{ label: i18n.global.t("settings.display.layoutOptions.custom"), value: LayoutMode.custom },
]);

const dwcVersion = packageInfo.version;

const boards = computed(() => machineStore.model.boards.filter((board) => board !== null));

// Slider works in seconds; the store keeps milliseconds. Two-way computed bridges the units
const notificationTimeoutSeconds = computed({
	get: () => Math.round(settingsStore.notifications.timeout / 1000),
	set: (v: number) => {
		settingsStore.notifications.timeout = v * 1000;
	},
});

const plugins = computed<Array<Plugin>>(() => {
	const dictionary = machineStore.model.plugins;
	const list: Array<Plugin> = [];
	for (const entry of dictionary.values()) {
		if (entry !== null) {
			list.push(entry);
		}
	}
	list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
	return list;
});

function isBuiltin(id: string): boolean {
	return isPluginBuiltIn(id);
}

// The loaded-plugin set in @/plugins is a plain Set, not reactive; the settings store mirrors
// it via dwcPluginLoaded / disableDwcPlugin, so we look up reactive state through it. The
// `pluginLoadTick` bump keeps everything in sync when the runtime starts a plugin without a
// settings change (e.g. on reconnect)
const pluginLoadTick = ref(0);

Events.on("dwcPluginLoaded", () => {
	pluginLoadTick.value += 1;
});
Events.on("dwcPluginUnloaded", () => {
	pluginLoadTick.value += 1;
});

function isStarted(id: string): boolean {
	pluginLoadTick.value;
	return isPluginLoaded(id) || settingsStore.enabledPlugins.includes(id);
}

// ---- Lifecycle actions ----------------------------------------------------------------------

const busyPluginId = ref<string | null>(null);

async function start(id: string) {
	busyPluginId.value = id;
	try {
		await loadDwcPlugin(id);
	} catch (e) {
		console.warn(e);
		uiStore.log(LogLevel.error, i18n.global.t("settings.plugins.startError", [id]), getErrorMessage(e));
	} finally {
		busyPluginId.value = null;
	}
}

async function stop(id: string) {
	busyPluginId.value = id;
	try {
		await unloadDwcPlugin(id);
	} catch (e) {
		console.warn(e);
		uiStore.log(LogLevel.error, i18n.global.t("settings.plugins.stopError", [id]), getErrorMessage(e));
	} finally {
		busyPluginId.value = null;
	}
}

// ---- Install --------------------------------------------------------------------------------

const pluginInput = ref<HTMLInputElement | null>(null);
const installing = ref(false);

function pickPluginZip() {
	if (installing.value) {
		return;
	}
	pluginInput.value?.click();
}

async function onPluginPicked(event: Event) {
	const target = event.target as HTMLInputElement;
	const file = target.files?.[0];
	target.value = "";
	if (!file) {
		return;
	}
	installing.value = true;
	try {
		const { default: JSZip } = await import("jszip");
		const zipFile = await JSZip.loadAsync(file);
		await machineStore.installPlugin(file.name, file, zipFile, true);
	} catch (e) {
		console.warn(e);
		uiStore.log(LogLevel.error, i18n.global.t("settings.plugins.installError", [file.name]),
			getErrorMessage(e));
	} finally {
		installing.value = false;
	}
}

// ---- Uninstall ------------------------------------------------------------------------------

const uninstallDialog = reactive({
	shown: false,
	plugin: null as Plugin | null,
	name: "",
});

function askUninstall(plugin: Plugin) {
	uninstallDialog.plugin = plugin;
	uninstallDialog.name = plugin.name;
	uninstallDialog.shown = true;
}

async function confirmUninstall() {
	const plugin = uninstallDialog.plugin;
	if (!plugin) {
		return;
	}
	busyPluginId.value = plugin.id;
	try {
		await machineStore.uninstallPlugin(plugin);
	} catch (e) {
		console.warn(e);
		uiStore.log(LogLevel.error, i18n.global.t("settings.plugins.uninstallError", [plugin.name]),
			getErrorMessage(e));
	} finally {
		busyPluginId.value = null;
		uninstallDialog.plugin = null;
	}
}

// ---- Firmware install ----------------------------------------------------------------------

const firmwareInstall = useFirmwareInstall();
const firmwareInput = ref<HTMLInputElement | null>(null);
const installingFirmware = ref(false);

const firmwareDialog = reactive<{ shown: boolean; plan: FirmwareUpdatePlan | null }>({
	shown: false,
	plan: null,
});

const configUpdatedDialog = reactive({ shown: false });

function pickFirmwareFiles() {
	if (installingFirmware.value) {
		return;
	}
	firmwareInput.value?.click();
}

async function onFirmwarePicked(event: Event) {
	const target = event.target as HTMLInputElement;
	const files = target.files;
	target.value = "";
	if (!files || files.length === 0) {
		return;
	}
	installingFirmware.value = true;
	try {
		let plan: FirmwareUpdatePlan;
		try {
			plan = await firmwareInstall.planFiles(Array.from(files));
		} catch (e) {
			if (e instanceof PluginBundleDetectedError) {
				await machineStore.installPlugin(e.file.name, e.file, e.archive, true);
				return;
			}
			throw e;
		}

		if (plan.files.length > 0) {
			await machineStore.upload(plan.files);
		}

		if (firmwareInstall.hasPendingUpdates(plan)) {
			firmwareDialog.plan = plan;
			firmwareDialog.shown = true;
			return;
		}

		maybePromptConfigReset(plan);

		if (plan.webInterfaceTouched && machineStore.connector?.hostname === location.host) {
			location.reload();
		}
	} catch (e) {
		console.warn(e);
		uiStore.log(LogLevel.error, i18n.global.t("notification.decompress.errorTitle"), getErrorMessage(e));
	} finally {
		installingFirmware.value = false;
	}
}

async function onFirmwareUpdateConfirmed(choices: { wifiServerSpiffs: boolean }) {
	const plan = firmwareDialog.plan;
	firmwareDialog.plan = null;
	if (!plan) {
		return;
	}
	try {
		await firmwareInstall.runUpdate(plan, choices);
	} finally {
		maybePromptConfigReset(plan);
	}
}

function onFirmwareUpdateCancelled() {
	const plan = firmwareDialog.plan;
	firmwareDialog.plan = null;
	if (plan) {
		maybePromptConfigReset(plan);
	}
}

function maybePromptConfigReset(plan: FirmwareUpdatePlan) {
	if (plan.configReplaced && !isPrinting(machineStore.model.state.status)) {
		configUpdatedDialog.shown = true;
	}
}
</script>
