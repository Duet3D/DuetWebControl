<template>
	<v-dialog v-model="shown" max-width="480px" :persistent="isPersistent" no-click-animation>
		<v-card>
			<v-card-title>
				<span class="headline">{{ title }}</span>
			</v-card-title>

			<v-card-text>
				<v-window v-model="currentPage">
					<!-- Plugin Installation -->
					<v-window-item>
						{{ $t('dialog.pluginInstallation.prompt') }}

						<v-card outlined class="my-3">
							<v-card-text>
								{{ `${pluginManifest.name || $t('generic.noValue')} ${pluginManifest.version || ''}` }}<br>
								{{ $t('dialog.pluginInstallation.by', [pluginManifest.author || $t('generic.noValue')]) }}<br>
								<template v-if="pluginManifest.license">
									{{ $t('dialog.pluginInstallation.license', [pluginManifest.license]) }}<br>
								</template>
								<template v-if="pluginManifest.homepage">
									{{ $t('dialog.pluginInstallation.homepage') }}
									<a :href="pluginManifest.homepage" target="_blank">{{ homepageDomain }}</a><br>
								</template>
							</v-card-text>
						</v-card>

						<template v-if="hasDsfFiles || hasDwcFiles || hasSdFiles">
							{{ $t('dialog.pluginInstallation.contents') }}
							<ul class="mt-1">
								<li v-show="hasDsfFiles">{{ $t('dialog.pluginInstallation.dsf') }}</li>
								<li v-show="hasDwcFiles">{{ $t('dialog.pluginInstallation.dwc') }}</li>
								<li v-show="hasSdFiles">{{ $t('dialog.pluginInstallation.rrf') }}</li>
							</ul>
						</template>
					</v-window-item>

					<!-- Prerequisites -->
					<v-window-item>
						<template v-if="pluginManifestValid">
							<div v-if="hasSdFiles">
								<h3 class="mt-3">
									<v-icon :class="checkRrfVersion ? 'success--text' : 'error--text'">
										{{ checkRrfVersion ? 'mdi-check-circle-outline' : 'mdi-close-circle-outline' }}
									</v-icon>
									{{ $t('dialog.pluginInstallation.rrf') }}
								</h3>
								<span class="ml-8 subtitle-2">
									{{ $t('dialog.pluginInstallation.version', [rrfVersion]) }}
								</span>
							</div>

							<div v-if="hasDwcFiles" :class="hasSdFiles ? 'pt-3' : ''">
								<h3>
									<v-icon :class="checkDwcVersion ? 'success--text' : 'error--text'">
										{{ checkDwcVersion ? 'mdi-check-circle-outline' : 'mdi-close-circle-outline' }}
									</v-icon>
									{{ $t('dialog.pluginInstallation.dwc') }}
								</h3>
								<span class="ml-8 subtitle-2">
									{{ $t('dialog.pluginInstallation.version', [dwcVersion]) }}
								</span>
							</div>

							<div v-if="showDsfVersion" :class="(pluginManifest.rrfVersion || pluginManifest.dwcVersion) ? 'pt-3' : ''">
								<h3>
									<v-icon :class="checkDsfVersion ? 'success--text' : 'error--text'">
										{{ checkDsfVersion ? 'mdi-check-circle-outline' : 'mdi-close-circle-outline' }}
									</v-icon>
									{{ $t('dialog.pluginInstallation.dsf') }}
								</h3>
								<span class="ml-8 subtitle-2">
									{{ $t('dialog.pluginInstallation.version', [dsfVersion]) }}
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
										{{ checkRoot ? 'mdi-check-circle-outline' : 'mdi-close-circle-outline' }}
									</v-icon>
									{{ $t('dialog.pluginInstallation.rootSupport') }}
								</h3>
							</div>
						</template>
						<div v-else class="pt-3">
							<h3>
								<v-icon class="error--text">mdi-close-circle-outline</v-icon>
								{{ $t('dialog.pluginInstallation.invalidManifest') }}
							</h3>
						</div>
					</v-window-item>

					<!-- Permissions -->
					<v-window-item>
						<v-alert v-show="hasDwcFiles" dense outlined type="warning" icon="mdi-alert-outline" class="subtitle-2 mb-3">
							{{ $t('dialog.pluginInstallation.dwcWarning') }}
						</v-alert>

						<v-alert v-if="requiresRoot" dense outlined type="error" icon="mdi-alert-circle-outline" class="subtitle-2 mb-0" :class="hasDwcFiles ? 'mt-3' : ''">
							{{ $t('dialog.pluginInstallation.rootWarning') }}
						</v-alert>
						<template v-else-if="permissions.length > 0">
							{{ $t('dialog.pluginInstallation.sbcPermissions') }}
							<ul class="mt-1">
								<li v-for="permission in permissions" :key="permission">
									{{ $t(`pluginPermissions.${permission}`) }}
								</li>
							</ul>
						</template>
						<template v-else-if="!hasDwcFiles">
							{{ $t('dialog.pluginInstallation.noSpecialPermissions') }}
						</template>
					</v-window-item>

					<!-- Ready To Install -->
					<v-window-item>
						{{ $t('dialog.pluginInstallation.readyMessage') }}
						<br><br>
						{{ $t('dialog.pluginInstallation.readyDisclaimer') }}
						<div class="pl-2 pb-2">
							<v-checkbox v-model="disclaimerAccepted" :label="$t('dialog.pluginInstallation.checkboxDisclaimer')" class="subtitle-2" hide-details></v-checkbox>
						</div>
					</v-window-item>

					<!-- Installation Progress -->
					<v-window-item>
						<span v-show="!isFinished">{{ $t('dialog.pluginInstallation.progressText') }}</span>
						<span v-show="isFinished && installationError" class="error--text">{{ installationError }}</span>
						<v-progress-linear v-show="!isFinished" indeterminate color="primary" class="mt-3"></v-progress-linear>
					</v-window-item>
				</v-window>
			</v-card-text>

			<v-card-actions>
				<v-btn v-show="canCancel" color="blue darken-1" text @click="shown = false">
					{{ $t('dialog.pluginInstallation.cancel') }}
				</v-btn>
				<v-spacer></v-spacer>
				<v-btn v-show="isFinished" color="blue darken-1" text @click="finish">
					{{ $t('dialog.pluginInstallation.finish') }}
				</v-btn>
				<v-spacer></v-spacer>
				<v-btn v-show="currentPage > 0 && currentPage < 4" color="blue darken-1" text @click="currentPage--">
					{{ $t('dialog.pluginInstallation.back') }}
				</v-btn>
				<v-btn v-show="currentPage < 4" color="blue darken-1" text :disabled="!canNext" @click="next">
					{{ $t('dialog.pluginInstallation.next') }}
				</v-btn>
			</v-card-actions>
		</v-card>

		<confirm-dialog :title="$t('dialog.pluginInstallation.reloadPrompt.title')" :prompt="$t('dialog.pluginInstallation.reloadPrompt.prompt')" :shown.sync="showReloadPrompt" @confirmed="reload"/>
	</v-dialog>
</template>

<script>
'use strict'

import { mapState, mapActions } from 'vuex'

import { version } from '../../../package.json'
import Plugins, { checkVersion } from '@/plugins'
import { PluginManifest, SbcPermission } from '@/plugins/manifest'
import Events from '@/utils/events.js'

export default {
	computed: {
		...mapState(['loadedDwcPlugins', 'selectedMachine']),
		...mapState('machine/model', ['boards', 'state']),
		title() {
			switch (this.currentPage) {
				case 0: return this.$t('dialog.pluginInstallation.installation');
				case 1: return this.$t('dialog.pluginInstallation.prerequisites');
				case 2: return this.$t('dialog.pluginInstallation.permissions');
				case 3: return this.$t('dialog.pluginInstallation.ready');
				case 4:
					if (this.isFinished) {
						if (this.installationError) {
							return this.$t('dialog.pluginInstallation.installationFailed');
						}
						return this.$t('dialog.pluginInstallation.installationSuccess');
					}
					return this.$t('dialog.pluginInstallation.progress');
				default: return this.$t('generic.noValue');
			}
		},
		canNext() {
			switch (this.currentPage) {
				case 0: return true;
				case 1: return this.pluginManifestValid && this.checkRrfVersion && this.checkDsfVersion && this.checkDwcVersion && this.checkRoot;
				case 2: return true;
				case 3: return this.disclaimerAccepted;
				default: return false;
			}
		},
		canCancel() {
			return this.currentPage < 4;
		},
		canClose() {
			return this.currentPage === 4;
		},
		isPersistent() {
			return this.currentPage === 4;
		},

		homepageDomain() {
			if (this.pluginManifest.homepage) {
				const regex = /(?:http[s]?:\/\/)?(\w+\.\w+(\.\w+)?)/i;
				const matches = regex.exec(this.pluginManifest.homepage);
				if (matches && matches.length >= 2) {
					return matches[1];
				}
			}
			return '';
		},

		rrfVersion() {
			if (this.boards.length > 0 && this.boards[0].firmwareVersion) {
				return this.boards[0].firmwareVersion;
			}
			return this.$t('generic.noValue');
		},
		checkRrfVersion() {
			if (this.pluginManifest.rrfVersion) {
				if (this.boards.length > 0 && this.boards[0].firmwareVersion) {
					return checkVersion(this.boards[0].firmwareVersion, this.pluginManifest.rrfVersion);
				}
				return false;
			}
			return true;
		},
		dsfVersion() {
			return this.state.dsfVersion || this.$t('generic.noValue');
		},
		showDsfVersion() {
			return this.pluginManifest.sbcRequired && this.hasDsfFiles;
		},
		checkDsfVersion() {
			if (this.pluginManifest.sbcDsfVersion) {
				if (this.state.dsfVersion && this.state.dsfPluginSupport) {
					return checkVersion(this.state.dsfVersion, this.pluginManifest.sbcDsfVersion);
				}
				return false;
			}
			return !this.pluginManifest.sbcRequired;
		},
		dwcVersion() {
			return version;
		},
		checkDwcVersion() {
			if (this.pluginManifest.dwcVersion) {
				return checkVersion(version, this.pluginManifest.dwcVersion);
			}
			return true;
		},
		pluginsSupported() {
			if (this.state.dsfVersion) {
				return this.state.dsfPluginSupport;
			}
			return true;
		},
		requiresRoot() {
			return this.permissions.indexOf(SbcPermission.superUser) !== -1;
		},
		checkRoot() {
			return !this.requiresRoot || this.state.dsfRootPluginSupport;
		},

		permissions() {
			return this.pluginManifest.sbcPermissions || [];
		}
	},
	data() {
		return {
			shown: false,
			currentPage: 0,
			disclaimerAccepted: false,
			isFinished: false,
			installationError: null,
			startWhenFinished: false,

			zipFilename: '',
			zipBlob: null,
			zipFile: null,
			hasDsfFiles: false,
			hasDwcFiles: false,
			hasSdFiles: false,
			pluginManifest: {},
			pluginManifestValid: false,

			showReloadPrompt: false
		}
	},
	mounted() {
		this.$root.$on(Events.installPlugin, this.installPluginHook);
	},
	beforeDestroy() {
		this.$root.$off(this.installPluginHook);
	},
	methods: {
		...mapActions('machine', ['installPlugin']),	// TODO improve this for multi-machine support
		async installPluginHook({ machine, zipFilename, zipBlob, zipFile, start }) {
			if (process.env.NODE_ENV === 'development') {
				alert('Third-party plugins are not supported in dev mode');
				return;
			}

			this.machine = machine;
			this.zipFilename = zipFilename;
			this.zipBlob = zipBlob;
			this.zipFile = zipFile;
			this.startWhenFinished = start;
			this.isFinished = false;

			try {
				const manifestJson = JSON.parse(await zipFile.file('plugin.json').async('string'));
				this.pluginManifest = new PluginManifest(manifestJson);
				this.pluginManifestValid = this.pluginManifest.check();
				if (this.pluginManifestValid && Plugins.some(plugin => plugin.id === this.pluginManifest.id, this)) {
					console.warn('Plugin identifier already reserved by built-in plugin');
					this.pluginManifestValid = false;
				}

				this.hasSdFiles = this.hasDwcFiles = this.hasDsfFiles = false;
				const that = this;
				zipFile.forEach(function(file) {
					if (file.startsWith('dsf/')) {
						that.hasDsfFiles = true;
					} else if (file.startsWith('dwc/')) {
						that.hasDwcFiles = true;
					} else if (file.startsWith('sd/')) {
						that.hasSdFiles = true;
					}
				});

				if (!this.hasSdFiles && !this.hasDwcFiles && !this.hasDsfFiles) {
					console.warn('Plugin has no files to install');
					this.pluginManifestValid = false;
				}
			} catch (e) {
				console.warn(e);
				this.pluginManifest = {};
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
						await this.installPlugin({
							zipFilename: this.zipFilename,
							zipBlob: this.zipBlob,
							zipFile: this.zipFile,
							start: this.startWhenFinished
						});
					} catch (e) {
						this.installationError = e.reason || e;
						console.warn(e);
					}
				} finally {
					this.isFinished = true;
				}
			}
		},
		finish() {
			this.shown = false;
			this.showReloadPrompt = this.hasDwcFiles && this.loadedDwcPlugins.includes(this.pluginManifest.id);
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
}
</script>
