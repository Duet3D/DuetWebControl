<style scoped>
.no-wrap {
	white-space: nowrap;
}

button {
	width: 100%;
}
</style>

<template>
	<div>
		<v-simple-table v-show="!noPlugins">
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
						<th width="1%" class="no-wrap"></th>
						<th width="1%" class="no-wrap"></th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="plugin in plugins" :key="plugin.id">
						<td :title="plugin.id">
							{{ plugin.name }}
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
								   :disabled="!canStartPlugin(plugin) || loadingDwcPlugins"
								   :loading="isPluginBusy(plugin)">
								<v-icon class="mr-1">mdi-play</v-icon>
								{{ $t("tabs.plugins.start") }}
							</v-btn>
							<v-btn v-else color="warning" @click="stopPlugin(plugin)"
								   :disabled="!canStopPlugin(plugin) || loadingDwcPlugins"
								   :loading="isPluginBusy(plugin)">
								<v-icon class="mr-1">mdi-stop</v-icon>
								{{ $t("tabs.plugins.stop") }}
							</v-btn>
						</td>
						<td class="pl-0 no-wrap">
							<v-btn color="primary" class="px-3" @click="doUninstallPlugin(plugin)"
								   :disabled="!canUninstallPlugin(plugin)" :loading="isPluginBusy(plugin)">
								<v-icon class="mr-1">mdi-delete</v-icon> {{ $t("tabs.plugins.uninstall") }}
							</v-btn>
						</td>
					</tr>
				</tbody>
			</template>
		</v-simple-table>

		<v-alert :value="noPlugins" type="info" class="text-left ma-0" @contextmenu.prevent="">
			{{ $t("tabs.plugins.noPlugins") }}
		</v-alert>

		<v-alert :value="dwcPluginsUnloaded" type="info" class="text-left ma-0" @contextmenu.prevent="">
			{{ $t("tabs.plugins.refreshNote") }}
		</v-alert>
	</div>
</template>

<script lang="ts">
import { Plugin } from "@duet3d/objectmodel";
import Vue from "vue";

import store from "@/store";
import { getErrorMessage } from "@/utils/errors";
import { makeNotification } from "@/utils/notifications";
import { LogType } from "@/utils/logging";

export default Vue.extend({
	computed: {
		plugins(): Array<Plugin> {
			return Array.from(store.state.machine.model.plugins.values()) as Array<Plugin>;
		},
		noPlugins(): boolean {
			return store.state.machine.model.plugins.size == 0;
		},
		loadingDwcPlugins(): boolean {
			return store.state.loadingDwcPlugins;
		}
	},
	data() {
		return {
			dwcPluginsUnloaded: false,
			busyPlugins: new Array<string>
		}
	},
	methods: {
		isPluginBusy(plugin: Plugin) {
			return this.busyPlugins.indexOf(plugin.id) !== -1;
		},
		getPluginDependencies(plugin: Plugin) {
			let result = []
			if (plugin.dwcVersion) {
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
		getPluginStatus(plugin: Plugin) {
			if (store.state.machine.model.sbc && plugin.sbcExecutable) {
				if (plugin.pid > 0 && (!plugin.dwcVersion || store.state.machine.settings.enabledPlugins.includes(plugin.id))) {
					return this.$t("tabs.plugins.started");
				}
				if (plugin.dwcVersion) {
					if ((plugin.pid >= 0) != store.state.machine.settings.enabledPlugins.includes(plugin.id)) {
						return this.$t("tabs.plugins.partiallyStarted");
					}
					if (store.state.loadedDwcPlugins.includes(plugin.id)) {
						return this.$t("tabs.plugins.deactivated");
					}
				}
			} else if (plugin.dwcVersion && store.state.loadedDwcPlugins.includes(plugin.id)) {
				return store.state.machine.settings.enabledPlugins.includes(plugin.id) ? this.$t("tabs.plugins.started") : this.$t("tabs.plugins.deactivated");
			}
			return this.$t("tabs.plugins.stopped");
		},
		isPluginStarted(plugin: Plugin) {
			return (plugin.pid > 0) || store.state.loadedDwcPlugins.includes(plugin.id);
		},
		canStartPlugin(plugin: Plugin) {
			return (plugin.sbcExecutable && plugin.sbcDsfVersion) || plugin.dwcVersion;
		},
		canStopPlugin(plugin: Plugin) {
			return (plugin.pid > 0) || store.state.machine.settings.enabledPlugins.includes(plugin.id);
		},
		canUninstallPlugin(plugin: Plugin) {
			return (plugin.pid <= 0) && !store.state.loadedDwcPlugins.includes(plugin.id);
		},
		async startPlugin(plugin: Plugin) {
			this.busyPlugins.push(plugin.id);
			try {
				try {
					// Start the plugin on the SBC
					if (plugin.sbcExecutable && plugin.pid <= 0) {
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
					makeNotification(LogType.success, this.$t("notification.plugins.started"));
				} catch (e) {
					makeNotification(LogType.error, this.$t("notification.plugins.startError"), getErrorMessage(e));
					throw e;
				}
			} finally {
				this.busyPlugins = this.busyPlugins.filter(item => item != plugin.id);
			}
		},
		async stopPlugin(plugin: Plugin) {
			this.busyPlugins.push(plugin.id);
			try {
				// Stop the plugin on the SBC (if needed)
				if (plugin.sbcExecutable && plugin.pid > 0) {
					try {
						await store.dispatch("machine/stopSbcPlugin", plugin.id);
						makeNotification(LogType.success, this.$t("notification.plugins.stopped"));
					} catch (e) {
						makeNotification(LogType.error, this.$t("notification.plugins.stopError"), getErrorMessage(e));
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
		},
		async doUninstallPlugin(plugin: Plugin) {
			this.busyPlugins.push(plugin.id);
			try {
				try {
					// Uninstall the plugin
					await store.dispatch("machine/uninstallPlugin", plugin);

					// Display a message
					makeNotification(LogType.success, this.$t("notification.plugins.uninstalled"));
				}
				catch (e) {
					makeNotification(LogType.error, this.$t("notification.plugins.uninstallError"), getErrorMessage(e));
					throw e;
				}
			} finally {
				this.busyPlugins = this.busyPlugins.filter(item => item != plugin.id);
			}
		}
	}
});
</script>
