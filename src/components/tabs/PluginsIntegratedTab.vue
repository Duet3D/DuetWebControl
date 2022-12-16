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
							{{ $t("tabs.plugins.headers.status") }}
						</th>
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
							{{ getPluginStatus(plugin) }}
						</td>
						<td class="no-wrap">
							<v-btn v-if="!isPluginStarted(plugin)" color="success" @click="startPlugin(plugin)"
								   :loading="isPluginBusy(plugin)">
								<v-icon class="mr-1">mdi-play</v-icon>
								{{ $t("tabs.plugins.start") }}
							</v-btn>
							<v-btn v-else color="warning" @click="stopPlugin(plugin)" :disabled="!canStopPlugin(plugin)"
								   :loading="isPluginBusy(plugin)">
								<v-icon class="mr-1">mdi-stop</v-icon>
								{{ $t("tabs.plugins.stop") }}
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
		</v-alert>
	</div>
</template>

<script lang="ts">
import { PluginManifest } from "@duet3d/objectmodel";
import Vue from "vue";

import Plugins from "@/plugins";
import store from "@/store";
import { makeNotification } from "@/utils/notifications";
import { LogType } from "@/utils/logging";

export default Vue.extend({
	computed: {
		plugins: () => Plugins
	},
	data() {
		return {
			dwcPluginsUnloaded: false,
			busyPlugins: new Array<string>
		}
	},
	methods: {
		isPluginBusy(plugin: PluginManifest) {
			return this.busyPlugins.includes(plugin.id);
		},
		getPluginStatus(plugin: PluginManifest) {
			if (store.state.loadedDwcPlugins.indexOf(plugin.id) !== -1) {
				const enabled = store.state.settings.enabledPlugins.includes(plugin.id) || store.state.settings.enabledPlugins.includes(plugin.name);
				return this.$t(enabled ? "tabs.plugins.started" : "tabs.plugins.deactivated");
			}
			return this.$t("tabs.plugins.stopped");
		},
		isPluginStarted(plugin: PluginManifest) {
			return store.state.loadedDwcPlugins.includes(plugin.id);
		},
		canStopPlugin(plugin: PluginManifest) {
			return store.state.settings.enabledPlugins.includes(plugin.id) || store.state.settings.enabledPlugins.includes(plugin.name);
		},
		async startPlugin(plugin: PluginManifest) {
			this.busyPlugins.push(plugin.id);
			try {
				try {
					// Load DWC resources
					await store.dispatch("loadDwcPlugin", {
						id: plugin.id,
						saveSettings: true
					});

					// Display a message
					makeNotification(LogType.success, this.$t("notification.plugins.started"));
				} catch (e) {
					alert(e);
					throw e;
				}
			} finally {
				this.busyPlugins = this.busyPlugins.filter(item => item != plugin.id);
			}
		},
		async stopPlugin(plugin: PluginManifest) {
			if (!await store.dispatch("unloadDwcPlugin", plugin.id)) {
				await store.dispatch("unloadDwcPlugin", plugin.name);
			}
			this.dwcPluginsUnloaded = true;
		}
	}
});
</script>
