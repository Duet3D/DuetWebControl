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
						<th class="text-left">{{ $t('tabs.plugins.headers.components') }}</th>
						<th class="text-left">{{ $t('tabs.plugins.headers.dependencies') }}</th>
						<th class="text-left">{{ $t('tabs.plugins.headers.status') }}</th>
						<th width="1%" class="no-wrap"></th>
						<th width="1%" class="no-wrap"></th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="plugin in plugins" :key="plugin.name">
						<td>{{ plugin.name }}</td>
						<td>{{ plugin.author }}</td>
						<td>{{ plugin.version }}</td>
						<td>{{ plugin.license }}</td>
						<td>{{ getPluginFunctionality(plugin) }}</td>
						<td>{{ getPluginDependencies(plugin) }}</td>
						<td>{{ getPluginStatus(plugin) }}</td>
						<td class="no-wrap">
							<v-btn v-if="!isPluginStarted(plugin)" color="success" @click="startPlugin(plugin)" :disabled="!canStartPlugin(plugin)" :loading="isPluginBusy(plugin)">
								<v-icon class="mr-1">mdi-play</v-icon> {{ $t('tabs.plugins.start') }}
							</v-btn>
							<v-btn v-else color="warning" @click="stopPlugin(plugin)" :disabled="!canStopPlugin(plugin)" :loading="isPluginBusy(plugin)">
								<v-icon class="mr-1">mdi-stop</v-icon> {{ $t('tabs.plugins.stop') }}
							</v-btn>
						</td>
						<td class="pl-0 no-wrap">
							<v-btn color="primary" class="px-3" @click="doUninstallPlugin(plugin)" :loading="isPluginBusy(plugin)">
								<v-icon class="mr-1">mdi-delete</v-icon> {{ $t('tabs.plugins.uninstall') }}
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

export default {
	install() {
		if (Plugins.length > 0 && process.env.NODE_ENV !== 'development') {
			// Register a settings tab on the Machine settings page
			registerSettingTab(false, 'settings-machine-plugins-tab', this, 'tabs.plugins.machineCaption');
		}
	},

	computed: {
		...mapState(['loadedDwcPlugins']),
		...mapState('machine/model', ['plugins']),
		...mapState('machine/settings', ['enabledPlugins']),
		onGlobalSettings() {
			return !this.$route.path.contains('Machine');
		}
	},
	data() {
		return {
			dwcPluginsUnloaded: false,
			busyPlugins: []
		}
	},
	methods: {
		...mapActions('machine', ['uninstallPlugin', 'loadDwcPlugin', 'unloadDwcPlugin', 'startSbcPlugin', 'stopSbcPlugin']),
		isPluginBusy(plugin) {
			return this.busyPlugins.indexOf(plugin.name) !== -1;
		},
		getPluginFunctionality(plugin) {
			let result = [];
			if (plugin.dwcFiles.length > 0 && plugin.dwcWebpackChunk) {
				result.push('DWC');
			}
			if (plugin.dsfFiles.length > 0) {
				result.push(plugin.sbcRequired ? 'DSF' : `DSF (${this.$t('tabs.plugins.optional')})`);
			}
			if (plugin.sdFiles.lenght > 0) {
				result.push('RRF');
			}
			return (result.length > 0) ? result.join(', ') : this.$t('generic.noValue');
		},
		getPluginDependencies(plugin) {
			let result = []
			if (plugin.dwcWebpackChunk && plugin.dwcVersion) {
				result.push(`DWC ${plugin.dwcVersion}`);
			}
			if (plugin.sbcDsfVersion) {
				result.push(`DSF ${plugin.sbcDsfVersion}`);
			}
			if (plugin.rrfVersion) {
				result.push(`RRF ${plugin.rrfVersion}`);
			}
			return (result.length > 0) ? result.join(', ') : this.$t('generic.noValue');
		},
		getPluginStatus(plugin) {
			if (plugin.sbcExecutable) {
				if (plugin.pid > 0 && (!plugin.dwcWebpackChunk || this.enabledPlugins.indexOf(plugin.name) !== -1)) {
					return this.$t('tabs.plugins.started');
				}
				if (plugin.pid < 0 && plugin.dwcWebpackChunk && this.enabledPlugins.indexOf(plugin.name) !== -1) {
					return this.$t('tabs.plugins.partiallyStarted');
				}
				return this.$t((plugin.pid === 0 || (plugin.dwcWebpackChunk && this.loadedDwcPlugins.indexOf(plugin.name) !== -1)) ? 'tabs.plugins.deactivated' : 'tabs.plugins.stopped');
			}

			if (plugin.dwcWebpackChunk && this.loadedDwcPlugins.indexOf(plugin.name) !== -1) {
				return this.$t((this.enabledPlugins.indexOf(plugin.name) !== -1) ? 'tabs.plugins.started' : 'tabs.plugins.deactivated');
			}
			return this.$t('tabs.plugins.stopped');
		},
		isPluginStarted(plugin) {
			return (plugin.pid > 0) || (this.loadedDwcPlugins.indexOf(plugin.name) !== -1);
		},
		canStartPlugin(plugin) {
			return plugin.sbcExecutable || plugin.dwcWebpackChunk;
		},
		canStopPlugin(plugin) {
			return (plugin.pid > 0) || (this.enabledPlugins.indexOf(plugin.name) !== -1);
		},
		async startPlugin(plugin) {
			this.busyPlugins.push(plugin.name);
			try {
				try {
					// Start the plugin on the SBC
					if (plugin.sbcExecutable && plugin.pid <= 0) {
						await this.startSbcPlugin(plugin.name);
					}

					// Load DWC resources
					if (plugin.dwcWebpackChunk && !this.loadedDwcPlugins.some(item => item.name === plugin.name)) {
						await this.loadDwcPlugin( { name: plugin.name, saveSettings: true });
					}

					// Display a message
					alert('Plugin has been started');
				} catch (e) {
					alert(e);
					throw e;
				}
			} finally {
				this.busyPlugins = this.busyPlugins.filter(item => item != plugin.name);
			}
		},
		async stopPlugin(plugin) {
			this.busyPlugins.push(plugin.name);
			try {
				// Stop the plugin on the SBC
				if (plugin.sbcExecutable && plugin.pid > 0) {
					try {
						await this.stopSbcPlugin(plugin.name);
					} catch (e) {
						alert(e);
						throw e;
					}
				}

				// Remove the plugin from the auto load list and tell the user to reload DWC
				if (this.loadedDwcPlugins.indexOf(plugin.name) !== -1) {
					this.unloadDwcPlugin(plugin.name);
					this.dwcPluginsUnloaded = true;
				}
			} finally {
				this.busyPlugins = this.busyPlugins.filter(item => item != plugin.name);
			}
		},
		async doUninstallPlugin(plugin) {
			this.busyPlugins.push(plugin.name);
			try {
				await this.uninstallPlugin(plugin);
			} finally {
				this.busyPlugins = this.busyPlugins.filter(item => item != plugin.name);
			}
		}
	}
}
</script>
