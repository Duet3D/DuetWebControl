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
						<th class="text-left">{{ $t('tabs.plugins.headers.name') }}</th>
						<th class="text-left">{{ $t('tabs.plugins.headers.author') }}</th>
						<th class="text-left">{{ $t('tabs.plugins.headers.version') }}</th>
						<th class="text-left">{{ $t('tabs.plugins.headers.license') }}</th>
						<th class="text-left">{{ $t('tabs.plugins.headers.dependencies') }}</th>
						<th class="text-left">{{ $t('tabs.plugins.headers.status') }}</th>
						<th width="1%" class="no-wrap"></th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="plugin in plugins" :key="plugin.id">
						<td :title="plugin.id">{{ plugin.name }}</td>
						<td>{{ plugin.author }}</td>
						<td>{{ plugin.version }}</td>
						<td>{{ plugin.license }}</td>
						<td>{{ getPluginDependencies(plugin) }}</td>
						<td>{{ getPluginStatus(plugin) }}</td>
						<td class="no-wrap">
							<v-btn v-if="!isPluginStarted(plugin)" color="success" @click="startPlugin(plugin)" :loading="isPluginBusy(plugin)">
								<v-icon class="mr-1">mdi-play</v-icon> {{ $t('tabs.plugins.start') }}
							</v-btn>
							<v-btn v-else color="warning" @click="stopPlugin(plugin)" :disabled="!canStopPlugin(plugin)" :loading="isPluginBusy(plugin)">
								<v-icon class="mr-1">mdi-stop</v-icon> {{ $t('tabs.plugins.stop') }}
							</v-btn>
						</td>
					</tr>
				</tbody>
			</template>
		</v-simple-table>

		<v-alert :value="plugins.length === 0" type="info" class="text-left ma-0" @contextmenu.prevent="">
			{{ $t('tabs.plugins.noPlugins') }}
		</v-alert>

		<v-alert :value="dwcPluginsUnloaded" type="info" class="text-left ma-0" @contextmenu.prevent="">
			{{ $t('tabs.plugins.refreshNote') }}
		</v-alert>
	</div>
</template>

<script>
'use strict'

import { mapState, mapActions } from 'vuex'

import Plugins from '../../plugins'
import { registerSettingTab } from '../../routes'
import { makeNotification } from '../../utils/toast.js'

export default {
	install() {
		if (Plugins.length > 0) {
			// Register a settings tab on the General settings page
			registerSettingTab(true, 'settings-general-plugins-tab', this, 'tabs.plugins.generalCaption');
		}
	},

	computed: {
		...mapState(['loadedDwcPlugins']),
		...mapState('settings', ['enabledPlugins']),
		plugins: () => Plugins
	},
	data() {
		return {
			dwcPluginsUnloaded: false,
			busyPlugins: []
		}
	},
	methods: {
		...mapActions(['loadDwcPlugin', 'unloadDwcPlugin']),
		...mapActions('machine', ['startSbcPlugin', 'stopSbcPlugin']),
		isPluginBusy(plugin) {
			return this.busyPlugins.indexOf(plugin.id) !== -1;
		},
		getPluginDependencies(plugin) {
			return `DWC ${plugin.dwcVersion}`;
		},
		getPluginStatus(plugin) {
			if (this.loadedDwcPlugins.indexOf(plugin.id) !== -1) {
				const enabled = (this.enabledPlugins.indexOf(plugin.id) !== -1) || (this.enabledPlugins.indexOf(plugin.name) !== -1);
				return this.$t(enabled ? 'tabs.plugins.started' : 'tabs.plugins.deactivated');
			}
			return this.$t('tabs.plugins.stopped');
		},
		isPluginStarted(plugin) {
			return this.loadedDwcPlugins.indexOf(plugin.id) !== -1;
		},
		canStopPlugin(plugin) {
			return (this.enabledPlugins.indexOf(plugin.id) !== -1) || (this.enabledPlugins.indexOf(plugin.name) !== -1);
		},
		async startPlugin(plugin) {
			this.busyPlugins.push(plugin.id);
			try {
				try {
					// Load DWC resources
					await this.loadDwcPlugin({ id: plugin.id, saveSettings: true });

					// Display a message
					makeNotification('success', this.$t('notification.plugins.started'));
				} catch (e) {
					alert(e);
					throw e;
				}
			} finally {
				this.busyPlugins = this.busyPlugins.filter(item => item != plugin.id);
			}
		},
		async stopPlugin(plugin) {
			if (!await this.unloadDwcPlugin(plugin.id)) {
				await this.unloadDwcPlugin(plugin.name);
			}
			this.dwcPluginsUnloaded = true;
		}
	}
}
</script>
