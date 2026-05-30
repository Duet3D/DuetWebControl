<template>
	<v-dialog v-model="shown" max-width="480" :persistent="isPersistent" no-click-animation>
		<v-card>
			<v-card-title>{{ title }}</v-card-title>

			<v-card-text>
				<v-window v-model="currentPage" :touch="false">
					<!-- #region Page 0: Manifest preview -->
					<v-window-item :value="Page.start">
						{{ $t("dialog.pluginInstallation.prompt") }}

						<v-card variant="outlined" class="my-3">
							<v-card-text>
								{{ `${pluginManifest.name || $t("generic.noValue")} ${pluginManifest.version || ""}` }}<br>
								{{ $t("dialog.pluginInstallation.by", [pluginManifest.author || $t("generic.noValue")]) }}<br>
								<template v-if="pluginManifest.license">
									{{ $t("dialog.pluginInstallation.license", [pluginManifest.license]) }}<br>
								</template>
								<template v-if="pluginManifest.homepage">
									{{ $t("dialog.pluginInstallation.homepage") }}
									<a :href="pluginManifest.homepage" target="_blank" rel="noopener noreferrer">
										{{ homepageDomain }}
									</a>
									<br>
								</template>
							</v-card-text>
						</v-card>

						<template v-if="hasDsfFiles || hasDwcFiles || hasSdFiles">
							{{ $t("dialog.pluginInstallation.contents") }}
							<ul class="mt-1">
								<li v-show="hasDsfFiles">
									{{ $t("dialog.pluginInstallation.dsf") }}
								</li>
								<li v-show="hasDwcFiles">
									{{ $t("dialog.pluginInstallation.dwc") }}
								</li>
								<li v-show="hasSdFiles">
									{{ $t("dialog.pluginInstallation.rrf") }}
								</li>
							</ul>
						</template>
					</v-window-item>
					<!-- #endregion -->

					<!-- #region Page 1: Prerequisites check -->
					<v-window-item :value="Page.prerequisites">
						<template v-if="pluginManifestValid">
							<div v-if="hasSdFiles">
								<h3 class="mt-3">
									<v-icon :color="checkRrfVersion ? 'success' : 'error'">
										{{ checkRrfVersion ? "mdi-check-circle-outline" : "mdi-close-circle-outline" }}
									</v-icon>
									{{ $t("dialog.pluginInstallation.rrf") }}
								</h3>
								<span class="ml-8 text-title-small">
									{{ $t("dialog.pluginInstallation.version", [rrfVersion]) }}
								</span>
							</div>

							<div v-if="hasDwcFiles" :class="hasSdFiles ? 'pt-3' : ''">
								<h3>
									<v-icon :color="checkDwcVersion ? 'success' : 'error'">
										{{ checkDwcVersion ? "mdi-check-circle-outline" : "mdi-close-circle-outline" }}
									</v-icon>
									{{ $t("dialog.pluginInstallation.dwc") }}
								</h3>
								<span class="ml-8 text-title-small">
									{{ $t("dialog.pluginInstallation.version", [dwcVersion]) }}
								</span>
							</div>

							<div v-if="showDsfVersion" :class="(hasSdFiles || hasDwcFiles) ? 'pt-3' : ''">
								<h3>
									<v-icon :color="checkDsfVersion ? 'success' : 'error'">
										{{ checkDsfVersion ? "mdi-check-circle-outline" : "mdi-close-circle-outline" }}
									</v-icon>
									{{ $t("dialog.pluginInstallation.dsf") }}
								</h3>
								<span class="ml-8 text-title-small">
									{{ $t("dialog.pluginInstallation.version", [dsfVersion]) }}
								</span>
							</div>

							<div v-if="!pluginsSupported" class="pt-3">
								<h3>
									<v-icon color="error">mdi-close-circle-outline</v-icon>
									{{ $t("dialog.pluginInstallation.noPluginSupport") }}
								</h3>
							</div>
							<div v-else-if="requiresRoot" class="pt-3">
								<h3>
									<v-icon :color="checkRoot ? 'success' : 'error'">
										{{ checkRoot ? "mdi-check-circle-outline" : "mdi-close-circle-outline" }}
									</v-icon>
									{{ $t("dialog.pluginInstallation.rootSupport") }}
								</h3>
							</div>
						</template>
						<div v-else class="pt-3">
							<h3>
								<v-icon color="error">mdi-close-circle-outline</v-icon>
								{{ $t("dialog.pluginInstallation.invalidManifest") }}
							</h3>
						</div>
					</v-window-item>
					<!-- #endregion -->

					<!-- #region Page 2: Permissions -->
					<v-window-item :value="Page.permissions">
						<v-alert v-show="hasDwcFiles" density="compact" variant="outlined" type="warning"
								 icon="mdi-alert-outline" class="text-title-small mb-3">
							{{ $t("dialog.pluginInstallation.dwcWarning") }}
						</v-alert>

						<v-alert v-if="requiresRoot" density="compact" variant="outlined" type="error"
								 icon="mdi-alert-circle-outline" class="text-title-small mb-0"
								 :class="hasDwcFiles ? 'mt-3' : ''">
							{{ $t("dialog.pluginInstallation.rootWarning") }}
						</v-alert>
						<template v-else-if="permissions.size > 0">
							{{ $t("dialog.pluginInstallation.sbcPermissions") }}
							<ul class="mt-1">
								<li v-for="permission in permissions" :key="permission">
									{{ $t(`pluginPermissions.${permission}`) }}
								</li>
							</ul>
						</template>
						<template v-else-if="!hasDwcFiles">
							{{ $t("dialog.pluginInstallation.noSpecialPermissions") }}
						</template>
					</v-window-item>
					<!-- #endregion -->

					<!-- #region Page 3: Ready -->
					<v-window-item :value="Page.ready">
						{{ $t("dialog.pluginInstallation.readyMessage") }}
						<br><br>
						{{ $t("dialog.pluginInstallation.readyDisclaimer") }}
						<div class="pl-2 pb-2">
							<v-checkbox v-model="disclaimerAccepted"
										:label="$t('dialog.pluginInstallation.checkboxDisclaimer')"
										class="text-title-small" hide-details />
							<v-checkbox v-model="startWhenFinished"
										:label="$t('dialog.pluginInstallation.checkboxStart')"
										class="text-title-small" hide-details />
						</div>
					</v-window-item>
					<!-- #endregion -->

					<!-- #region Page 4: Progress / result -->
					<v-window-item :value="Page.finish">
						<span v-show="!isFinished">
							{{ $t("dialog.pluginInstallation.progressText") }}
						</span>
						<span v-show="isFinished && installationError" class="text-error">
							{{ installationError }}
						</span>
						<v-progress-linear v-show="!isFinished" indeterminate color="primary" class="mt-3" />
					</v-window-item>
					<!-- #endregion -->
				</v-window>
			</v-card-text>

			<v-card-actions>
				<v-btn v-show="canCancel" color="blue-darken-1" variant="text" @click="shown = false">
					{{ $t("dialog.pluginInstallation.cancel") }}
				</v-btn>
				<v-spacer />
				<v-btn v-show="isFinished" color="blue-darken-1" variant="text" @click="finish">
					{{ $t("dialog.pluginInstallation.finish") }}
				</v-btn>
				<v-spacer />
				<v-btn v-show="currentPage > 0 && currentPage < Page.finish" color="blue-darken-1"
					   variant="text" @click="currentPage--">
					{{ $t("dialog.pluginInstallation.back") }}
				</v-btn>
				<v-btn v-show="currentPage < Page.finish" color="blue-darken-1" variant="text"
					   :disabled="!canNext" @click="next">
					{{ $t("dialog.pluginInstallation.next") }}
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script setup lang="ts">
import { initObject, PluginManifest, SbcPermission } from "@duet3d/objectmodel";
import type JSZip from "jszip";

import { showConfirmDialog } from "@/composables/useConfirmDialog";
import i18n from "@/i18n";
import { checkManifest, checkVersion, getBuiltInPlugins, isPluginLoaded } from "@/plugins";
import { useMachineStore } from "@/stores/machine";
import { getErrorMessage } from "@/utils/errors";
import Events from "@/utils/events";

import packageInfo from "../../../package.json";

enum Page {
	start = 0,
	prerequisites = 1,
	permissions = 2,
	ready = 3,
	finish = 4,
}

const machineStore = useMachineStore();

// #region Wizard state

const shown = ref(false);
// Stored as plain number so the increment/comparison code in next() stays readable; the enum
// is just a label for the page indices
const currentPage = ref<number>(Page.start);
const disclaimerAccepted = ref(false);
const isFinished = ref(false);
const installationError = ref<string | null>(null);
const startWhenFinished = ref(false);

const zipFilename = ref("");
const zipBlob = ref<Blob | null>(null);
const zipFile = ref<JSZip | null>(null);
const hasDsfFiles = ref(false);
const hasDwcFiles = ref(false);
const hasSdFiles = ref(false);
const pluginManifest = ref<PluginManifest>(new PluginManifest());
const pluginManifestValid = ref(false);

// #endregion

// #region Derived state

const title = computed(() => {
	switch (currentPage.value) {
		case Page.start: return i18nT("dialog.pluginInstallation.installation");
		case Page.prerequisites: return i18nT("dialog.pluginInstallation.prerequisites");
		case Page.permissions: return i18nT("dialog.pluginInstallation.permissions");
		case Page.ready: return i18nT("dialog.pluginInstallation.ready");
		case Page.finish:
			if (isFinished.value) {
				return installationError.value
					? i18nT("dialog.pluginInstallation.installationFailed")
					: i18nT("dialog.pluginInstallation.installationSuccess");
			}
			return i18nT("dialog.pluginInstallation.progress");
		default: return i18nT("generic.noValue");
	}
});

function i18nT(key: string, params?: unknown[]): string {
	// vue-i18n's `t` returns a localised string; tiny wrapper keeps the switch above readable
	return params ? i18n.global.t(key, params) : i18n.global.t(key);
}

const canCancel = computed(() => currentPage.value < Page.finish);
const isPersistent = computed(() => currentPage.value === Page.finish);

const canNext = computed(() => {
	switch (currentPage.value) {
		case Page.start: return true;
		case Page.prerequisites: return pluginManifestValid.value && checkRrfVersion.value
			&& checkDsfVersion.value && checkDwcVersion.value && pluginsSupported.value && checkRoot.value;
		case Page.permissions: return true;
		case Page.ready: return disclaimerAccepted.value;
		default: return false;
	}
});

const homepageDomain = computed(() => {
	const homepage = pluginManifest.value.homepage;
	if (!homepage) {
		return "";
	}
	const match = /(?:https?:\/\/)?([\w-]+\.[\w.-]+)/i.exec(homepage);
	return match?.[1] ?? "";
});

// #endregion

// #region Version checks

const rrfVersion = computed(() => {
	const boards = machineStore.model.boards;
	if (boards.length > 0 && boards[0].firmwareVersion) {
		return boards[0].firmwareVersion;
	}
	return i18n.global.t("generic.noValue");
});

const checkRrfVersion = computed(() => {
	if (!pluginManifest.value.rrfVersion) {
		return true;
	}
	const boards = machineStore.model.boards;
	if (boards.length > 0 && boards[0].firmwareVersion) {
		return checkVersion(boards[0].firmwareVersion, pluginManifest.value.rrfVersion);
	}
	return false;
});

const dsfVersion = computed(() => machineStore.model.sbc?.dsf.version ?? i18n.global.t("generic.noValue"));

const showDsfVersion = computed(() => pluginManifest.value.sbcRequired && hasDsfFiles.value);

const checkDsfVersion = computed(() => {
	if (pluginManifest.value.sbcDsfVersion) {
		const sbc = machineStore.model.sbc;
		if (sbc && sbc.dsf.pluginSupport) {
			return checkVersion(sbc.dsf.version, pluginManifest.value.sbcDsfVersion);
		}
		return false;
	}
	return !pluginManifest.value.sbcRequired;
});

const dwcVersion = computed(() => packageInfo.version);

const checkDwcVersion = computed(() => {
	if (!pluginManifest.value.dwcVersion) {
		return true;
	}
	return checkVersion(packageInfo.version, pluginManifest.value.dwcVersion);
});

const pluginsSupported = computed(() => machineStore.model.sbc ? machineStore.model.sbc.dsf.pluginSupport : true);

const permissions = computed(() => pluginManifest.value.sbcPermissions || new Set<SbcPermission>());

const requiresRoot = computed(() => permissions.value.has(SbcPermission.superUser));

const checkRoot = computed(() => !requiresRoot.value || !!machineStore.model.sbc?.dsf.rootPluginSupport);

// #endregion

// #region Wizard navigation

async function next() {
	currentPage.value++;
	if (currentPage.value === Page.finish) {
		installationError.value = null;
		isFinished.value = false;
		try {
			await machineStore.installPlugin(zipFilename.value, zipBlob.value!, zipFile.value!, startWhenFinished.value);
		} catch (e) {
			console.warn(e);
			installationError.value = getErrorMessage(e);
		} finally {
			isFinished.value = true;
		}
	}
}

async function finish() {
	shown.value = false;
	// If we just replaced a DWC plugin that's currently mounted, the user needs to reload to
	// pick up the new bundle - otherwise the old code keeps running in the page
	if (!(hasDwcFiles.value && isPluginLoaded(pluginManifest.value.id))) {
		return;
	}
	if (await showConfirmDialog(i18n.global.t("dialog.pluginInstallation.reloadPrompt.title"), i18n.global.t("dialog.pluginInstallation.reloadPrompt.prompt"), "mdi-restart")) {
		location.reload();
	}
}

// #endregion

// #region Event bus wiring

Events.on("installPlugin", openWizard);
onBeforeUnmount(() => Events.off("installPlugin", openWizard));

async function openWizard(payload: { zipFilename: string; zipBlob: Blob; zipFile: JSZip; start: boolean }) {
	zipFilename.value = payload.zipFilename;
	zipBlob.value = payload.zipBlob;
	zipFile.value = payload.zipFile;
	startWhenFinished.value = payload.start;
	isFinished.value = false;
	installationError.value = null;

	try {
		const manifestEntry = payload.zipFile.file("plugin.json");
		if (!manifestEntry) {
			throw new Error("plugin.json missing from archive");
		}
		const manifestJson = JSON.parse(await manifestEntry.async("string"));
		pluginManifest.value = initObject(PluginManifest, manifestJson);

		pluginManifestValid.value = checkManifest(pluginManifest.value);
		if (pluginManifestValid.value && getBuiltInPlugins().some((p) => p.id === pluginManifest.value.id)) {
			console.warn("Plugin identifier already reserved by built-in plugin");
			pluginManifestValid.value = false;
		}

		hasDsfFiles.value = false;
		hasDwcFiles.value = false;
		hasSdFiles.value = false;
		payload.zipFile.forEach((file) => {
			if (file.startsWith("dsf/")) hasDsfFiles.value = true;
			else if (file.startsWith("dwc/")) hasDwcFiles.value = true;
			else if (file.startsWith("sd/")) hasSdFiles.value = true;
		});

		if (!hasSdFiles.value && !hasDwcFiles.value && !hasDsfFiles.value) {
			console.warn("Plugin has no files to install");
			pluginManifestValid.value = false;
		}
	} catch (e) {
		console.warn(e);
		pluginManifestValid.value = false;
	}

	currentPage.value = Page.start;
	disclaimerAccepted.value = false;
	shown.value = true;
}

// Closing the wizard mid-install is allowed (the request is fire-and-forget), but we should
// abandon a pending wizard whenever the connected machine changes - the manifest preview no
// longer matches what the user is about to install
watch(() => machineStore.isConnected, (to) => {
	if (!to) {
		shown.value = false;
	}
});

// #endregion
</script>
