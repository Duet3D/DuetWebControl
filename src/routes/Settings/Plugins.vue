<template>
    <div>
        <v-simple-table v-show="plugins.length > 0">
			<template #default>
				<thead>
					<tr>
						<th class="text-left">
							{{ $t("tabs.plugins.headers.name") }}
						</th>
						<th class="text-left">
							{{ $t("tabs.plugins.headers.author") }}
						</th>
						<th class="text-left">
							{{ $t("tabs.plugins.headers.version") }}
						</th>
						<th class="text-left">
							{{ $t("tabs.plugins.headers.license") }}
						</th>
						<th class="text-left">
							{{ $t("tabs.plugins.headers.dependencies") }}
						</th>
						<th class="text-left">
							{{ $t("tabs.plugins.headers.status") }}
						</th>
						<th width="1%" class="no-wrap" colspan="2">
							<upload-btn ref="mainUpload" :elevation="1" color="primary" target="plugin" block />
						</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="plugin in plugins" :key="plugin.id">
						<td :title="plugin.id">
							{{ plugin.name }}
                            <v-chip v-if="isIntegratedPlugin(plugin)" small class="ml-1">
                                {{ $t("tabs.plugins.builtIn") }}
                            </v-chip>
						</td>
						<td>
							{{ plugin.author }}
						</td>
						<td>
							{{ plugin.version }}
						</td>
						<td>
							{{ plugin.license }}
						</td>
						<td>
							{{ getPluginDependencies(plugin) }}
						</td>
						<td>
							{{ getPluginStatus(plugin) }}
						</td>
						<td class="no-wrap">
							<v-btn v-if="!isPluginStarted(plugin)" color="success" @click="startPlugin(plugin)"
								   :disabled="!canStartPlugin(plugin) || loadingDwcPlugins" :loading="isPluginBusy(plugin)">
								<v-icon class="mr-1">mdi-play</v-icon>
								{{ $t("tabs.plugins.start") }}
							</v-btn>
							<v-btn v-else color="warning" @click="stopPlugin(plugin)"
								   :disabled="!canStopPlugin(plugin) || loadingDwcPlugins" :loading="isPluginBusy(plugin)">
								<v-icon class="mr-1">mdi-stop</v-icon>
								{{ $t("tabs.plugins.stop") }}
							</v-btn>
						</td>
						<td class="pl-0 no-wrap">
							<v-btn color="primary" class="px-3" @click="doUninstallPlugin(plugin)"
								   :disabled="!canUninstallPlugin(plugin)" :loading="isPluginBusy(plugin)">
								<v-icon class="mr-1">mdi-delete</v-icon>
								{{ $t("tabs.plugins.uninstall") }}
							</v-btn>
						</td>
					</tr>
				</tbody>
			</template>
		</v-simple-table>

		<v-alert :value="plugins.length === 0" type="info" class="text-left ma-0" @contextmenu.prevent="">
			{{ $t("tabs.plugins.noPlugins") }}
		</v-alert>

		<v-alert :value="dwcPluginsUnloaded" type="info" class="text-left ma-0" @contextmenu.prevent="">
			{{ $t("tabs.plugins.refreshNote") }}
			<v-btn text small @click="reloadDwc" class="float-right">
				<v-icon small class="mr-1">mdi-refresh</v-icon>
				{{ $t("tabs.plugins.refreshNow") }}
			</v-btn>
		</v-alert>
    </div>
</template>

<script lang="ts">
import Vue from "vue";
import { Plugin, PluginManifest } from "@duet3d/objectmodel";

import packageInfo from "@/../package.json";

import Plugins from "@/plugins";
import store from "@/store";
import { LogType } from "@/utils/logging";
import { getErrorMessage } from "@/utils/errors";

export default Vue.extend({
    computed: {
		plugins: () => {
			const plugins: PluginManifest[] = [...Plugins];
			for (const plugin of store.state.machine.model.plugins.values()) {
				if (plugin !== null) {
					plugins.push(plugin);
				}
			}
			return plugins;
		},
        loadingDwcPlugins(): boolean { return store.state.loadingDwcPlugins; }
    },
    data() {
        return {
            dwcPluginsUnloaded: false,
			busyPlugins: new Array<string>
        }
    },
	methods: {
		isDwcPlugin(plugin: PluginManifest) {
			return !store.state.machine.model.plugins.has(plugin.id) || plugin.dwcVersion != null
		},
		isDsfPlugin(plugin: PluginManifest) {
			return plugin.sbcDsfVersion != null;
		},
		isRrfPlugin(plugin: PluginManifest) {
			return plugin.rrfVersion != null;
		},
        isIntegratedPlugin(plugin: PluginManifest) {
            return !store.state.machine.model.plugins.has(plugin.id);
        },
        isPluginBusy(plugin: PluginManifest) {
			return this.busyPlugins.includes(plugin.id);
		},
		getPluginDependencies(plugin: PluginManifest) {
			let result = []
			if (!store.state.machine.model.plugins.has(plugin.id)) {
				result.push(`DWC ${packageInfo.version}`);
			} else if (plugin.dwcVersion) {
				result.push(`DWC ${plugin.dwcVersion}`);
			}
			if (plugin.sbcDsfVersion) {
				result.push(`DSF ${plugin.sbcDsfVersion}`);
			}
			if (plugin.rrfVersion) {
				result.push(`RRF ${plugin.rrfVersion}`);
			}
			return (result.length > 0) ? result.join(", ") : this.$t("generic.noValue");
		},
		getPluginStatus(plugin: PluginManifest) {
			if (!store.state.machine.model.plugins.has(plugin.id)) {
				if (store.state.loadedDwcPlugins.includes(plugin.id)) {
					const enabled = store.state.settings.enabledPlugins.includes(plugin.id) || store.state.machine.settings.enabledPlugins.includes(plugin.name);
					return this.$t(enabled ? "tabs.plugins.started" : "tabs.plugins.deactivated");
				}
				return this.$t("tabs.plugins.stopped");
			}

			if (store.state.machine.model.sbc && plugin.sbcExecutable) {
				const externalPlugin = store.state.machine.model.plugins.get(plugin.id)!;
				if (externalPlugin.pid > 0 && (!plugin.dwcVersion || store.state.machine.settings.enabledPlugins.includes(plugin.id))) {
					return this.$t("tabs.plugins.started");
				}
				if (plugin.dwcVersion) {
					if ((externalPlugin.pid >= 0) != store.state.machine.settings.enabledPlugins.includes(plugin.id)) {
						return this.$t("tabs.plugins.partiallyStarted");
					}
					if (store.state.loadedDwcPlugins.includes(plugin.id)) {
						return this.$t("tabs.plugins.deactivated");
					}
				}
				return this.$t("tabs.plugins.stopped");
			} else if (plugin.dwcVersion && store.state.loadedDwcPlugins.includes(plugin.id)) {
				return store.state.machine.settings.enabledPlugins.includes(plugin.id) ? this.$t("tabs.plugins.started") : this.$t("tabs.plugins.deactivated");
			}
			return this.$t("tabs.plugins.installed");
		},
		isPluginStarted(plugin: PluginManifest) {
			if (!store.state.machine.model.plugins.has(plugin.id)) {
				return store.state.loadedDwcPlugins.includes(plugin.id);
			}

			const externalPlugin = store.state.machine.model.plugins.get(plugin.id)!;
			return (externalPlugin.pid > 0) || store.state.loadedDwcPlugins.includes(plugin.id);
		},
		canStartPlugin(plugin: PluginManifest) {
			if (!store.state.machine.model.plugins.has(plugin.id)) {
				return true;
			}
			return (plugin.sbcExecutable && plugin.sbcDsfVersion) || plugin.dwcVersion;
		},
		canStopPlugin(plugin: PluginManifest) {
			if (!store.state.machine.model.plugins.has(plugin.id)) {
				return store.state.settings.enabledPlugins.includes(plugin.id) || store.state.machine.settings.enabledPlugins.includes(plugin.name);
			}

			const externalPlugin = store.state.machine.model.plugins.get(plugin.id)!;
			return (externalPlugin.pid > 0) || store.state.machine.settings.enabledPlugins.includes(plugin.id);
		},
		canUninstallPlugin(plugin: PluginManifest) {
			if (!store.state.machine.model.plugins.has(plugin.id)) {
				return false;
			}

			const externalPlugin = store.state.machine.model.plugins.get(plugin.id)!;
			return (externalPlugin.pid <= 0) && !store.state.loadedDwcPlugins.includes(plugin.id);
		},
		async startPlugin(plugin: PluginManifest) {
			if (!store.state.machine.model.plugins.has(plugin.id)) {
				this.busyPlugins.push(plugin.id);
				try {
					try {
						// Load DWC resources
						await store.dispatch("loadDwcPlugin", {
							id: plugin.id,
							saveSettings: true
						});

						// Display a message
						this.$makeNotification(LogType.success, this.$t("notification.plugins.started"));
					} catch (e) {
						alert(e);
						throw e;
					}
				} finally {
					this.busyPlugins = this.busyPlugins.filter(item => item != plugin.id);
				}
			} else {
				this.busyPlugins.push(plugin.id);
				try {
					try {
						// Start the plugin on the SBC
						const externalPlugin = store.state.machine.model.plugins.get(plugin.id)!;
						if (plugin.sbcExecutable && externalPlugin.pid <= 0) {
							await store.dispatch("machine/startSbcPlugin", plugin.id);
						}

						// Load DWC resources
						if (plugin.dwcVersion && !store.state.loadedDwcPlugins.some(item => item === plugin.id)) {
							await store.dispatch("machine/loadDwcPlugin", {
								id: plugin.id,
								saveSettings: true
							});
						}

						// Display a message
						this.$makeNotification(LogType.success, this.$t("notification.plugins.started"));
					} catch (e) {
						this.$makeNotification(LogType.error, this.$t("notification.plugins.startError"), getErrorMessage(e));
						throw e;
					}
				} finally {
					this.busyPlugins = this.busyPlugins.filter(item => item != plugin.id);
				}
			}
		},
		async stopPlugin(plugin: PluginManifest) {
			if (!store.state.machine.model.plugins.has(plugin.id)) {
				if (!await store.dispatch("unloadDwcPlugin", plugin.id)) {
					await store.dispatch("unloadDwcPlugin", plugin.name);
				}
				this.dwcPluginsUnloaded = true;
			} else {
				this.busyPlugins.push(plugin.id);
				try {
					// Stop the plugin on the SBC (if needed)
					const externalPlugin = store.state.machine.model.plugins.get(plugin.id)!;
					if (plugin.sbcExecutable && externalPlugin.pid > 0) {
						try {
							await store.dispatch("machine/stopSbcPlugin", plugin.id);
							this.$makeNotification(LogType.success, this.$t("notification.plugins.stopped"));
						} catch (e) {
							this.$makeNotification(LogType.error, this.$t("notification.plugins.stopError"), getErrorMessage(e));
							throw e;
						}
					}

					// Remove the plugin from the auto load list and tell the user to reload DWC
					if (store.state.loadedDwcPlugins.includes(plugin.id)) {
						store.dispatch("machine/unloadDwcPlugin", plugin.id);
						this.dwcPluginsUnloaded = true;
					}
				} finally {
					this.busyPlugins = this.busyPlugins.filter(item => item != plugin.id);
				}
			}
		},
		async doUninstallPlugin(plugin: PluginManifest) {
			this.busyPlugins.push(plugin.id);
			try {
				try {
					// Uninstall the plugin
					await store.dispatch("machine/uninstallPlugin", plugin);

					// Display a message
					this.$makeNotification(LogType.success, this.$t("notification.plugins.uninstalled"));
				}
				catch (e) {
					this.$makeNotification(LogType.error, this.$t("notification.plugins.uninstallError"), getErrorMessage(e));
					throw e;
				}
			} finally {
				this.busyPlugins = this.busyPlugins.filter(item => item != plugin.id);
			}
		},
		reloadDwc() {
			location.reload();
		}
    }
});
</script>
