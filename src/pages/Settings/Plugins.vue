<route lang="json">
{
	"path": "/Plugins",
	"meta": {
		"menu": {
			"category": "preferences",
			"icon": "mdi-puzzle",
			"caption": "menu.preferences.plugins",
			"order": 20
		}
	}
}
</route>

<style>
/* Consistent width for the action buttons so Start/Stop and Uninstall right-align with
   matching edges across rows. Not scoped because the v-btn class data-v hash from this page
   isn't reliably applied to Vuetify's inner button element. md+ only - xs/sm renders icon
   buttons through a different template branch and doesn't need (or want) the width cap */
@media (min-width: 840px) {
	.plugin-action-btn {
		min-width: 130px;
	}
}
</style>

<template>
	<div class="route-root">
		<v-card>
			<v-alert v-if="plugins.length === 0" type="info" variant="tonal" tile class="ma-0">
				{{ $t("settings.plugins.noPlugins") }}
			</v-alert>

			<v-table v-else density="compact">
				<thead>
					<tr>
						<th class="text-left">{{ $t("settings.plugins.headers.name") }}</th>
						<th class="text-left d-none d-sm-table-cell">{{ $t("settings.plugins.headers.author") }}</th>
						<th class="text-left d-none d-md-table-cell">{{ $t("settings.plugins.headers.version") }}</th>
						<th class="text-left d-none d-sm-table-cell">{{ $t("settings.plugins.headers.license") }}</th>
						<th class="text-left">{{ $t("settings.plugins.headers.status") }}</th>
						<th style="width: 1%;">
							<div class="d-flex align-center justify-end">
								<v-btn color="primary" density="comfortable" :loading="installing"
									   :disabled="!machineStore.isConnected" @click="pickPluginZip">
									<v-icon class="mr-1">mdi-cloud-upload</v-icon>
									{{ $t("settings.plugins.install") }}
								</v-btn>
							</div>
						</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="plugin in plugins" :key="plugin.id">
						<td class="py-1">
							<div>
								{{ plugin.name }}
								<span class="d-md-none text-medium-emphasis">v{{ plugin.version }}</span>
								<v-chip v-if="isBuiltin(plugin.id)" size="x-small" class="ml-2">
									{{ $t("settings.plugins.builtin") }}
								</v-chip>
							</div>
							<div v-if="pluginRequirements(plugin.id)"
								 class="text-body-small text-medium-emphasis">
								{{ $t("settings.plugins.requires", [pluginRequirements(plugin.id)]) }}
							</div>
						</td>
						<td class="d-none d-sm-table-cell">{{ plugin.author }}</td>
						<td class="d-none d-md-table-cell">{{ plugin.version }}</td>
						<td class="d-none d-sm-table-cell">{{ plugin.license || $t("generic.noValue") }}</td>
						<td>
							<v-chip size="small" :color="pluginStatusColor[pluginStatus(plugin.id)]">
								{{ $t(`settings.plugins.${pluginStatus(plugin.id)}`) }}
							</v-chip>
						</td>
						<td class="text-center text-md-right py-2 text-no-wrap">
							<template v-if="mdAndUp">
								<v-btn v-if="isStarted(plugin.id)" variant="elevated" color="warning"
									   class="me-3 plugin-action-btn"
									   :title="$t('settings.plugins.stop')"
									   :loading="busyPluginId === plugin.id" @click="stop(plugin.id)">
									<v-icon class="me-1">mdi-stop</v-icon>
									{{ $t("settings.plugins.stop") }}
								</v-btn>
								<v-btn v-else variant="elevated" color="success" class="me-3 plugin-action-btn"
									   :title="startTooltip(plugin.id)"
									   :disabled="!canStart(plugin.id)"
									   :loading="busyPluginId === plugin.id" @click="start(plugin.id)">
									<v-icon class="me-1">mdi-play</v-icon>
									{{ $t("settings.plugins.start") }}
								</v-btn>
								<v-btn variant="elevated" color="error" class="plugin-action-btn"
									   :title="uninstallTooltip(plugin.id)"
									   :disabled="!canUninstall(plugin.id)"
									   :loading="busyPluginId === plugin.id" @click="askUninstall(plugin)">
									<v-icon class="me-1">mdi-delete</v-icon>
									{{ $t("settings.plugins.uninstall") }}
								</v-btn>
							</template>
							<template v-else>
								<v-btn v-if="isStarted(plugin.id)" icon="mdi-stop" variant="outlined"
									   color="warning" :title="$t('settings.plugins.stop')"
									   :loading="busyPluginId === plugin.id" @click="stop(plugin.id)" />
								<v-btn v-else icon="mdi-play" variant="outlined" color="success"
									   :title="startTooltip(plugin.id)"
									   :disabled="!canStart(plugin.id)"
									   :loading="busyPluginId === plugin.id" @click="start(plugin.id)" />
								<v-btn icon="mdi-delete" variant="outlined" color="error" class="ms-2"
									   :title="uninstallTooltip(plugin.id)"
									   :disabled="!canUninstall(plugin.id)"
									   :loading="busyPluginId === plugin.id" @click="askUninstall(plugin)" />
							</template>
						</td>
					</tr>
				</tbody>
			</v-table>
		</v-card>

		<v-alert v-if="dwcPluginsUnloaded" type="info" variant="tonal" closable class="mt-3"
				 @update:model-value="dwcPluginsUnloaded = false">
			<div class="d-flex align-center">
				<span class="flex-grow-1">{{ $t("settings.plugins.refreshNote") }}</span>
				<v-btn class="ms-2" variant="text" density="comfortable"
					   prepend-icon="mdi-refresh" @click="reloadDwc">
					{{ $t("settings.plugins.refreshNow") }}
				</v-btn>
			</div>
		</v-alert>

		<v-dialog v-model="uninstallDialog.shown" width="480">
			<v-card>
				<v-card-title>
					<v-icon class="mr-1">mdi-delete</v-icon>
					{{ $t("settings.plugins.uninstallTitle") }}
				</v-card-title>
				<v-card-text>
					{{ $t("settings.plugins.uninstallPrompt", [uninstallDialog.plugin?.name]) }}
					<v-checkbox v-if="uninstallHasData" v-model="uninstallDialog.deleteData"
								hide-details density="compact" class="mt-2"
								:label="$t('settings.plugins.uninstallDeleteData')" />
				</v-card-text>
				<v-card-actions>
					<v-spacer />
					<v-btn color="blue-darken-1" variant="text" @click="uninstallDialog.shown = false">
						{{ $t("generic.cancel") }}
					</v-btn>
					<v-btn color="error" variant="text" @click="confirmUninstall">
						{{ $t("settings.plugins.uninstall") }}
					</v-btn>
				</v-card-actions>
			</v-card>
		</v-dialog>

		<input ref="pluginInput" type="file" accept=".zip" hidden @change="onPluginPicked" />
	</div>
</template>

<script setup lang="ts">
import { useDisplay } from "vuetify";
import type { Plugin, PluginManifest } from "@duet3d/objectmodel";

import i18n from "@/i18n";
import { getBuiltInPlugins, isPluginBuiltIn, isPluginLoaded, loadDwcPlugin, unloadDwcPlugin } from "@/plugins";
import { samePluginId } from "@/utils/plugins";
import { useCacheStore } from "@/stores/cache";
import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";
import { LogLevel, useUiStore } from "@/stores/ui";
import Events from "@/utils/events";

const cacheStore = useCacheStore();
const machineStore = useMachineStore();
const settingsStore = useSettingsStore();
const uiStore = useUiStore();
const { mdAndUp } = useDisplay();

// Combined list: built-in DWC plugins (HeightMap, ObjectModelBrowser, ...) plus everything the
// machine reports through the object model (DSF and RRF plugins). Both sources contribute to
// the same management table
const plugins = computed<Array<PluginManifest>>(() => {
	const byId = new Map<string, PluginManifest>();
	for (const builtIn of getBuiltInPlugins()) {
		byId.set(builtIn.id, builtIn);
	}
	for (const entry of machineStore.model.plugins.values()) {
		if (entry !== null) {
			// OM-reported entry wins over the built-in placeholder if the same id shows up on
			// both sides - it carries the live pid we need for status
			byId.set(entry.id, entry);
		}
	}
	// Built-in plugins first (alphabetical within group), then external (alphabetical) - groups
	// the "shipped with DWC" entries at the top of the table
	return Array.from(byId.values()).sort((a, b) => {
		const aBuiltin = isPluginBuiltIn(a.id) ? 0 : 1;
		const bBuiltin = isPluginBuiltIn(b.id) ? 0 : 1;
		if (aBuiltin !== bBuiltin) {
			return aBuiltin - bBuiltin;
		}
		return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
	});
});

function isBuiltin(id: string): boolean {
	return isPluginBuiltIn(id);
}

const pluginLoadTick = ref(0);
const bumpLoadTick = () => { pluginLoadTick.value += 1; };
Events.on("dwcPluginLoaded", bumpLoadTick);
Events.on("dwcPluginUnloaded", bumpLoadTick);
onBeforeUnmount(() => {
	Events.off("dwcPluginLoaded", bumpLoadTick);
	Events.off("dwcPluginUnloaded", bumpLoadTick);
});

function isStarted(id: string): boolean {
	pluginLoadTick.value;
	if (isPluginLoaded(id)) {
		return true;
	}
	const sbcPid = machineStore.model.plugins.get(id)?.pid ?? -1;
	if (sbcPid > 0) {
		return true;
	}
	return settingsStore.enabledPlugins.some(p => samePluginId(p, id));
}

type PluginStatus = "started" | "starting" | "stopping" | "partial" | "installed" | "pending" | "stopped";

function pluginStatus(id: string): PluginStatus {
	pluginLoadTick.value;
	const plugin = machineStore.model.plugins.get(id);
	const hasDwc = (plugin?.dwcFiles?.length ?? 0) > 0;
	const hasSbc = !!plugin?.sbcExecutable;
	const dwcRunning = isPluginLoaded(id);

	// DSF sets pid to 0 while the plugin process is shutting down, and keeps started false between
	// launch and the plugin's own readiness signal (sbcNotifyStarted plugins) - so pid alone can't
	// tell "coming up" from "fully up"
	const sbcPid = plugin?.pid ?? -1;
	const sbcStopping = sbcPid === 0;
	const sbcStarting = sbcPid > 0 && !(plugin?.started ?? false);
	const sbcStarted = sbcPid > 0 && (plugin?.started ?? false);

	if (hasSbc) {
		// SBC process transitions describe the live lifecycle and take precedence
		if (sbcStopping) {
			return "stopping";
		}
		if (sbcStarting) {
			return "starting";
		}
		if (hasDwc) {
			if (dwcRunning && sbcStarted) {
				return "started";
			}
			if (dwcRunning || sbcStarted) {
				return "partial";
			}
		} else if (sbcStarted) {
			return "started";
		}
	} else if (hasDwc) {
		if (dwcRunning) {
			return "started";
		}
	} else if (plugin) {
		// RRF-side-only plugin registered through the object model - nothing for DWC to start
		// or load, the firmware just exposes it as present
		return "installed";
	} else if (isPluginBuiltIn(id)) {
		// Built-in DWC plugin: no OM entry, no external transport. Either loaded ("started")
		// or not ("stopped"); never "pending" - there's no remote runtime to wait on
		return dwcRunning ? "started" : "stopped";
	} else if (dwcRunning) {
		return "started";
	}

	// External plugin enabled in settings but not yet loaded by the runtime (reconnect away)
	if (settingsStore.enabledPlugins.some(p => samePluginId(p, id))) {
		return "pending";
	}
	return "stopped";
}

const pluginStatusColor: Record<PluginStatus, string> = {
	started: "success",
	starting: "info",
	stopping: "warning",
	partial: "warning",
	pending: "secondary",
	installed: "primary",
	stopped: "error",
};

// Uninstall is rendered for every row so the column reads consistently, but it's only enabled
// for non-built-in plugins that aren't currently running - built-ins ship with DWC, running
// external plugins must be stopped first
function canUninstall(id: string): boolean {
	return !isPluginBuiltIn(id) && !isStarted(id);
}

// External plugins must carry either an SBC executable + DSF version or DWC assets to be
// startable from the UI. RRF-only plugins are firmware-managed and have no runtime hook on the
// DWC side, so the Start button is greyed out
function canStart(id: string): boolean {
	const plugin = machineStore.model.plugins.get(id);
	if (!plugin) {
		return true;
	}
	return (!!plugin.sbcExecutable && !!plugin.sbcDsfVersion) || !!plugin.dwcVersion;
}

function startTooltip(id: string): string {
	if (!canStart(id)) {
		return i18n.global.t("settings.plugins.notStartable");
	}
	return i18n.global.t("settings.plugins.start");
}

function uninstallTooltip(id: string): string {
	if (isPluginBuiltIn(id)) {
		return i18n.global.t("settings.plugins.uninstallBuiltin");
	}
	if (isStarted(id)) {
		return i18n.global.t("settings.plugins.uninstallWhileRunning");
	}
	return i18n.global.t("settings.plugins.uninstall");
}

function pluginRequirements(id: string): string {
	const plugin = machineStore.model.plugins.get(id);
	if (!plugin) {
		return "";
	}
	const parts: string[] = [];
	if (plugin.sbcDsfVersion) {
		parts.push(`DSF ${plugin.sbcDsfVersion}`);
	}
	if (plugin.dwcVersion) {
		parts.push(`DWC ${plugin.dwcVersion}`);
	}
	if (plugin.rrfVersion) {
		parts.push(`RRF ${plugin.rrfVersion}`);
	}
	return parts.join(", ");
}

const busyPluginId = ref<string | null>(null);

async function start(id: string) {
	busyPluginId.value = id;
	try {
		const plugin = machineStore.model.plugins.get(id);
		// Only plugins shipping an SBC executable need DSF to spawn a process; start it when not
		// already running. DWC-only plugins are registered in the object model too (standalone's
		// PollConnector lists them), but there's no DSF to call - startSbcPlugin would throw
		if (plugin && plugin.sbcExecutable && (plugin.pid ?? -1) <= 0) {
			await machineStore.startSbcPlugin(id);
		}
		// Load the browser-side bundle when there is one (built-in plugins have no OM entry but
		// still need loading; external plugins only need it when dwcFiles ship in the package)
		const hasDwcAssets = plugin
			? (plugin.dwcFiles?.length ?? 0) > 0
			: isPluginBuiltIn(id);
		if (hasDwcAssets) {
			await loadDwcPlugin(id);
		}
		uiStore.log(LogLevel.success, i18n.global.t("notification.plugins.started"));
	} catch (e) {
		console.warn(e);
		uiStore.notifyError(e, i18n.global.t("settings.plugins.startError", [id]));
	} finally {
		busyPluginId.value = null;
	}
}

async function stop(id: string) {
	busyPluginId.value = id;
	try {
		const plugin = machineStore.model.plugins.get(id);
		if (isPluginLoaded(id)) {
			await unloadDwcPlugin(id);
			// Module code that the plugin imported is still in the JS heap and any registered
			// routes / components stay live until the next page load
			dwcPluginsUnloaded.value = true;
		}
		if (plugin && plugin.sbcExecutable && (plugin.pid ?? -1) > 0) {
			await machineStore.stopSbcPlugin(id);
		}
		uiStore.log(LogLevel.success, i18n.global.t("notification.plugins.stopped"));
	} catch (e) {
		console.warn(e);
		uiStore.notifyError(e, i18n.global.t("settings.plugins.stopError", [id]));
	} finally {
		busyPluginId.value = null;
	}
}

const dwcPluginsUnloaded = ref(false);

function reloadDwc() {
	location.reload();
}

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
		Events.emit("installPlugin", { zipFilename: file.name, zipBlob: file, zipFile, start: true });
	} catch (e) {
		console.warn(e);
		uiStore.notifyError(e, i18n.global.t("settings.plugins.installError", [file.name]));
	} finally {
		installing.value = false;
	}
}

const uninstallDialog = reactive<{ shown: boolean; plugin: PluginManifest | null; deleteData: boolean }>({
	shown: false,
	plugin: null,
	deleteData: false,
});

// Offer the "delete stored data" option only when the plugin actually has persisted DWC settings or
// cache values - an SBC/RRF-only plugin (or one that never called registerPluginData) has nothing to
// delete on the DWC side
const uninstallHasData = computed(() => {
	const id = uninstallDialog.plugin?.id;
	return !!id && (settingsStore.hasPluginData(id) || cacheStore.hasPluginData(id));
});

function askUninstall(plugin: PluginManifest) {
	uninstallDialog.plugin = plugin;
	uninstallDialog.deleteData = true;
	uninstallDialog.shown = true;
}

async function confirmUninstall() {
	const plugin = uninstallDialog.plugin;
	if (!plugin) {
		return;
	}
	const deleteData = uninstallDialog.deleteData;
	uninstallDialog.shown = false;
	busyPluginId.value = plugin.id;
	try {
		// machineStore.uninstallPlugin expects a Plugin; only OM-reported entries reach here
		// because the Uninstall button is gated on !isBuiltin
		await machineStore.uninstallPlugin(plugin as Plugin);
		if (deleteData) {
			settingsStore.deletePluginData(plugin.id);
			cacheStore.deletePluginData(plugin.id);
		}
		uiStore.log(LogLevel.success, i18n.global.t("notification.plugins.uninstalled"));
	} catch (e) {
		console.warn(e);
		uiStore.notifyError(e, i18n.global.t("settings.plugins.uninstallError", [plugin.name]));
	} finally {
		busyPluginId.value = null;
	}
}
</script>
