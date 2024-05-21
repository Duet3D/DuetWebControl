<template>
	<v-dialog v-model="shown" max-width="480px" :persistent="isPersistent" no-click-animation>
		<v-card>
			<v-card-title>
				<span class="headline">
					{{ title }}
				</span>
			</v-card-title>

			<v-card-text>
				<v-window v-model="currentPage">
					<!-- Plugin Installation -->
					<v-window-item>
						{{ $t("dialog.pluginInstallation.prompt") }}

						<v-card outlined class="my-3">
							<v-card-text>
								{{ `${pluginManifest.name || $t("generic.noValue")} ${pluginManifest.version || ""}` }}<br>
								{{ $t("dialog.pluginInstallation.by", [pluginManifest.author || $t("generic.noValue")]) }}<br>
								<template v-if="pluginManifest.license">
									{{ $t("dialog.pluginInstallation.license", [pluginManifest.license]) }}<br>
								</template>
								<template v-if="pluginManifest.homepage">
									{{ $t("dialog.pluginInstallation.homepage") }}
									<a :href="pluginManifest.homepage" target="_blank">
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

					<!-- Prerequisites -->
					<v-window-item>
						<template v-if="pluginManifestValid">
							<div v-if="hasSdFiles">
								<h3 class="mt-3">
									<v-icon :class="checkRrfVersion ? 'success--text' : 'error--text'">
										{{ checkRrfVersion ? "mdi-check-circle-outline" : "mdi-close-circle-outline" }}
									</v-icon>
									{{ $t("dialog.pluginInstallation.rrf") }}
								</h3>
								<span class="ml-8 subtitle-2">
									{{ $t("dialog.pluginInstallation.version", [rrfVersion]) }}
								</span>
							</div>

							<div v-if="hasDwcFiles" :class="hasSdFiles ? 'pt-3' : ''">
								<h3>
									<v-icon :class="checkDwcVersion ? 'success--text' : 'error--text'">
										{{ checkDwcVersion ? "mdi-check-circle-outline" : "mdi-close-circle-outline" }}
									</v-icon>
									{{ $t("dialog.pluginInstallation.dwc") }}
								</h3>
								<span class="ml-8 subtitle-2">
									{{ $t("dialog.pluginInstallation.version", [dwcVersion]) }}
								</span>
							</div>

							<div v-if="showDsfVersion"
								 :class="(pluginManifest.rrfVersion || pluginManifest.dwcVersion) ? 'pt-3' : ''">
								<h3>
									<v-icon :class="checkDsfVersion ? 'success--text' : 'error--text'">
										{{ checkDsfVersion ? "mdi-check-circle-outline" : "mdi-close-circle-outline" }}
									</v-icon>
									{{ $t("dialog.pluginInstallation.dsf") }}
								</h3>
								<span class="ml-8 subtitle-2">
									{{ $t("dialog.pluginInstallation.version", [dsfVersion]) }}
								</span>
							</div>

							<div v-if="!pluginsSupported" class="pt-3">
								<h3>
									<v-icon class="error--text">mdi-close-circle-outline</v-icon>
									{{ $t('dialog.pluginInstallation.noPluginSupport') }}
								</h3>
							</div>
							<div v-else-if="requiresRoot" class="pt-3">
								<h3>
									<v-icon :class="checkRoot ? 'success--text' : 'error--text'">
										{{ checkRoot ? "mdi-check-circle-outline" : "mdi-close-circle-outline" }}
									</v-icon>
									{{ $t("dialog.pluginInstallation.rootSupport") }}
								</h3>
							</div>
						</template>
						<div v-else class="pt-3">
							<h3>
								<v-icon class="error--text">mdi-close-circle-outline</v-icon>
								{{ $t("dialog.pluginInstallation.invalidManifest") }}
							</h3>
						</div>
					</v-window-item>

					<!-- Permissions -->
					<v-window-item>
						<v-alert v-show="hasDwcFiles" dense outlined type="warning" icon="mdi-alert-outline"
								 class="subtitle-2 mb-3">
							{{ $t("dialog.pluginInstallation.dwcWarning") }}
						</v-alert>

						<v-alert v-if="requiresRoot" dense outlined type="error" icon="mdi-alert-circle-outline"
								 class="subtitle-2 mb-0" :class="hasDwcFiles ? 'mt-3' : ''">
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

					<!-- Ready To Install -->
					<v-window-item>
						{{ $t("dialog.pluginInstallation.readyMessage") }}
						<br><br>
						{{ $t("dialog.pluginInstallation.readyDisclaimer") }}
						<div class="pl-2 pb-2">
							<v-checkbox v-model="disclaimerAccepted"
										:label="$t('dialog.pluginInstallation.checkboxDisclaimer')" class="subtitle-2"
										hide-details />
						</div>
					</v-window-item>

					<!-- Installation Progress -->
					<v-window-item>
						<span v-show="!isFinished">
							{{ $t("dialog.pluginInstallation.progressText") }}
						</span>
						<span v-show="isFinished && installationError" class="error--text">
							{{ installationError }}
						</span>
						<v-progress-linear v-show="!isFinished" indeterminate color="primary" class="mt-3" />
					</v-window-item>
				</v-window>
			</v-card-text>

			<v-card-actions>
				<v-btn v-show="canCancel" color="blue darken-1" text @click="shown = false">
					{{ $t("dialog.pluginInstallation.cancel") }}
				</v-btn>
				<v-spacer></v-spacer>
				<v-btn v-show="isFinished" color="blue darken-1" text @click="finish">
					{{ $t("dialog.pluginInstallation.finish") }}
				</v-btn>
				<v-spacer></v-spacer>
				<v-btn v-show="currentPage > 0 && currentPage < 4" color="blue darken-1" text @click="currentPage--">
					{{ $t("dialog.pluginInstallation.back") }}
				</v-btn>
				<v-btn v-show="currentPage < 4" color="blue darken-1" text :disabled="!canNext" @click="next">
					{{ $t("dialog.pluginInstallation.next") }}
				</v-btn>
			</v-card-actions>
		</v-card>

		<confirm-dialog :title="$t('dialog.pluginInstallation.reloadPrompt.title')"
						:prompt="$t('dialog.pluginInstallation.reloadPrompt.prompt')" :shown.sync="showReloadPrompt"
						@confirmed="reload" />
	</v-dialog>
</template>

<script lang="ts">
import { initObject, PluginManifest, SbcPermission } from "@duet3d/objectmodel";
import Vue from "vue";

import packageInfo from "../../../package.json";
import Plugins, { checkManifest, checkVersion } from "@/plugins";
import store from "@/store";
import Events from "@/utils/events";
import { getErrorMessage } from "@/utils/errors";
import JSZip from "jszip";

enum Page {
	start,
	prerequisites,
	permissions,
	ready,
	finish
}

export default Vue.extend({
	computed: {
		title(): string {
			const page = this.currentPage as Page;
			switch (page) {
				case Page.start: return this.$t("dialog.pluginInstallation.installation");
				case Page.prerequisites: return this.$t("dialog.pluginInstallation.prerequisites");
				case Page.permissions: return this.$t("dialog.pluginInstallation.permissions");
				case Page.ready: return this.$t("dialog.pluginInstallation.ready");
				case Page.finish:
					if (this.isFinished) {
						if (this.installationError) {
							return this.$t("dialog.pluginInstallation.installationFailed");
						}
						return this.$t("dialog.pluginInstallation.installationSuccess");
					}
					return this.$t("dialog.pluginInstallation.progress");
				default:
					const _exhaustiveCheck: never = page;
					return this.$t("generic.noValue");
			}
		},
		canNext(): boolean {
			switch (this.currentPage) {
				case Page.start: return true;
				case Page.prerequisites: return this.pluginManifestValid && this.checkRrfVersion && this.checkDsfVersion && this.checkDwcVersion && this.checkRoot;
				case Page.permissions: return true;
				case Page.ready: return this.disclaimerAccepted;
				default: return false;
			}
		},
		canCancel(): boolean {
			return this.currentPage < Page.finish;
		},
		canClose(): boolean {
			return this.currentPage === Page.finish;
		},
		isPersistent(): boolean {
			return this.currentPage === Page.finish;
		},

		homepageDomain(): string {
			if (this.pluginManifest.homepage) {
				const regex = /(?:http[s]?:\/\/)?(\w+\.\w+(\.\w+)?)/i;
				const matches = regex.exec(this.pluginManifest.homepage);
				if (matches && matches.length >= 2) {
					return matches[1];
				}
			}
			return "";
		},

		rrfVersion(): string {
			if (store.state.machine.model.boards.length > 0 && store.state.machine.model.boards[0].firmwareVersion) {
				return store.state.machine.model.boards[0].firmwareVersion;
			}
			return this.$t("generic.noValue");
		},
		checkRrfVersion(): boolean {
			if (this.pluginManifest.rrfVersion) {
				if (store.state.machine.model.boards.length > 0 && store.state.machine.model.boards[0].firmwareVersion) {
					return checkVersion(store.state.machine.model.boards[0].firmwareVersion, this.pluginManifest.rrfVersion);
				}
				return false;
			}
			return true;
		},
		dsfVersion(): string {
			return store.state.machine.model.sbc?.dsf.version ?? this.$t("generic.noValue");
		},
		showDsfVersion(): boolean {
			return this.pluginManifest.sbcRequired && this.hasDsfFiles;
		},
		checkDsfVersion(): boolean {
			if (this.pluginManifest.sbcDsfVersion) {
				if (store.state.machine.model.sbc && store.state.machine.model.sbc.dsf.pluginSupport) {
					return checkVersion(store.state.machine.model.sbc.dsf.version, this.pluginManifest.sbcDsfVersion);
				}
				return false;
			}
			return !this.pluginManifest.sbcRequired;
		},
		dwcVersion(): string {
			return packageInfo.version;
		},
		checkDwcVersion(): boolean {
			if (this.pluginManifest.dwcVersion) {
				return checkVersion(packageInfo.version, this.pluginManifest.dwcVersion);
			}
			return true;
		},
		pluginsSupported(): boolean {
			if (store.state.machine.model.sbc) {
				return store.state.machine.model.sbc.dsf.pluginSupport;
			}
			return true;
		},
		requiresRoot(): boolean {
			return this.permissions.has(SbcPermission.superUser);
		},
		checkRoot(): boolean {
			return !this.requiresRoot || !!store.state.machine.model.sbc?.dsf.rootPluginSupport;
		},
		permissions(): Set<SbcPermission> {
			return this.pluginManifest.sbcPermissions || new Set<SbcPermission>();
		}
	},
	data() {
		return {
			shown: false,
			currentPage: Page.start,
			disclaimerAccepted: false,
			isFinished: false,
			installationError: null,
			startWhenFinished: false,

			zipFilename: '',
			zipBlob: null as File | null,
			zipFile: null as JSZip | null,
			hasDsfFiles: false,
			hasDwcFiles: false,
			hasSdFiles: false,
			pluginManifest: {} as PluginManifest,
			pluginManifestValid: false,

			showReloadPrompt: false
		}
	},
	mounted() {
		this.$root.$on(Events.installPlugin, this.installPluginHook);
	},
	beforeDestroy() {
		this.$root.$off(this.installPluginHook as any);
	},
	methods: {
		async installPluginHook({ zipFilename, zipBlob, zipFile, start }: { zipFilename: string, zipBlob: File, zipFile: JSZip, start: boolean }) {
			this.zipFilename = zipFilename;
			this.zipBlob = zipBlob;
			this.zipFile = zipFile;
			this.startWhenFinished = start;
			this.isFinished = false;

			try {
				const manifestJson = JSON.parse(await zipFile.file("plugin.json")!.async("string"));
				this.pluginManifest = initObject(PluginManifest, manifestJson);
				this.pluginManifestValid = checkManifest(this.pluginManifest);
				if (this.pluginManifestValid && Plugins.some(plugin => plugin.id === this.pluginManifest.id, this)) {
					console.warn("Plugin identifier already reserved by built-in plugin");
					this.pluginManifestValid = false;
				}

				this.hasSdFiles = this.hasDwcFiles = this.hasDsfFiles = false;
				const that = this;
				zipFile.forEach(function (file) {
					if (file.startsWith("dsf/")) {
						that.hasDsfFiles = true;
					} else if (file.startsWith("dwc/")) {
						that.hasDwcFiles = true;
					} else if (file.startsWith("sd/")) {
						that.hasSdFiles = true;
					}
				});

				if (!this.hasSdFiles && !this.hasDwcFiles && !this.hasDsfFiles) {
					console.warn('Plugin has no files to install');
					this.pluginManifestValid = false;
				}
			} catch (e) {
				console.warn(e);
				this.pluginManifestValid = false;
			}

			this.currentPage = 0;
			this.disclaimerAccepted = false;
			this.shown = true;
		},
		async next() {
			this.currentPage++;
			if (this.currentPage === 4) {
				this.installationError = null;
				this.isFinished = false;
				try {
					try {
						await store.dispatch("machine/installPlugin", {
							zipFilename: this.zipFilename,
							zipBlob: this.zipBlob,
							zipFile: this.zipFile,
							start: this.startWhenFinished
						});
					} catch (e) {
						console.warn(e);
						this.installationError = getErrorMessage(e);
					}
				} finally {
					this.isFinished = true;
				}
			}
		},
		finish() {
			this.shown = false;
			this.showReloadPrompt = this.hasDwcFiles && store.state.loadedDwcPlugins.includes(this.pluginManifest.id);
		},
		reload() {
			location.reload(true);
		}
	},
	watch: {
		selectedMachine() {
			// Dismiss plugin installation prompt when the selected machine changes
			this.shown = false;
		}
	}
});
</script>
