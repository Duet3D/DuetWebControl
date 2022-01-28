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
						<th class="text-left">{{ $t('tabs.plugins.headers.name') }}</th>
						<th class="text-left">{{ $t('tabs.plugins.headers.author') }}</th>
						<th class="text-left">{{ $t('tabs.plugins.headers.version') }}</th>
						<th class="text-left">{{ $t('tabs.plugins.headers.license') }}</th>
						<th class="text-left">{{ $t('tabs.plugins.headers.dependencies') }}</th>
						<th class="text-left">{{ $t('tabs.plugins.headers.status') }}</th>
						<th width="1%" class="no-wrap"></th>
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
							<v-btn v-if="!isPluginStarted(plugin)" color="success" @click="startPlugin(plugin)" :disabled="!canStartPlugin(plugin)" :loading="isPluginBusy(plugin)">
								<v-icon class="mr-1">mdi-play</v-icon> {{ $t('tabs.plugins.start') }}
							</v-btn>
							<v-btn v-else color="warning" @click="stopPlugin(plugin)" :disabled="!canStopPlugin(plugin)" :loading="isPluginBusy(plugin)">
								<v-icon class="mr-1">mdi-stop</v-icon> {{ $t('tabs.plugins.stop') }}
							</v-btn>
						</td>
						<td class="pl-0 no-wrap">
							<v-btn color="primary" class="px-3" @click="doUninstallPlugin(plugin)" :disabled="!canUninstallPlugin(plugin)" :loading="isPluginBusy(plugin)">
								<v-icon class="mr-1">mdi-delete</v-icon> {{ $t('tabs.plugins.uninstall') }}
							</v-btn>
						</td>
					</tr>
				</tbody>
			</template>
		</v-simple-table>

		<v-alert :value="noPlugins" type="info" class="text-left ma-0" @contextmenu.prevent="">
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

import { makeNotification } from '../../utils/notifications.js'

export default {
    props: {
        machine: {
            type: Object,
			required: true
        }
    },
	computed: {
		...mapState(['loadedDwcPlugins']),
		...mapState('machine/model', ['plugins', 'state']),		// TODO improve this for multi-machine support
		...mapState('machine/settings', ['enabledPlugins']),
		noPlugins() {
			return Object.keys(this.plugins).length === 0;
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
			return this.busyPlugins.indexOf(plugin.id) !== -1;
		},
		getPluginDependencies(plugin) {
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
			return (result.length > 0) ? result.join(', ') : this.$t('generic.noValue');
		},
		getPluginStatus(plugin) {
			if (this.state.dsfVersion && plugin.sbcExecutable) {
				if (plugin.pid > 0 && (!plugin.dwcVersion || this.enabledPlugins.indexOf(plugin.id) !== -1)) {
					return this.$t('tabs.plugins.started');
				}
				if (plugin.pid < 0 && plugin.dwcVersion && this.enabledPlugins.indexOf(plugin.id) !== -1) {
					return this.$t('tabs.plugins.partiallyStarted');
				}
				if (plugin.dwcVersion && this.loadedDwcPlugins.indexOf(plugin.id) !== -1) {
					return this.$t('tabs.plugins.deactivated');
				}
			} else if (plugin.dwcVersion && this.loadedDwcPlugins.indexOf(plugin.id) !== -1) {
				return this.$t((this.enabledPlugins.indexOf(plugin.id) !== -1) ? 'tabs.plugins.started' : 'tabs.plugins.deactivated');
			}
			return this.$t('tabs.plugins.stopped');
		},
		isPluginStarted(plugin) {
			return (plugin.pid > 0) || (this.loadedDwcPlugins.indexOf(plugin.id) !== -1);
		},
		canStartPlugin(plugin) {
			return (plugin.sbcExecutable && plugin.sbcDsfVersion) || plugin.dwcVersion;
		},
		canStopPlugin(plugin) {
			return (plugin.pid > 0) || (this.enabledPlugins.indexOf(plugin.id) !== -1);
		},
		canUninstallPlugin(plugin) {
			return (plugin.pid <= 0)  && (this.loadedDwcPlugins.indexOf(plugin.id) === -1);
		},
		async startPlugin(plugin) {
			this.busyPlugins.push(plugin.id);
			try {
				try {
					// Start the plugin on the SBC
					if (plugin.sbcExecutable && plugin.pid <= 0) {
						await this.startSbcPlugin(plugin.id);
					}

					// Load DWC resources
					if (plugin.dwcVersion && !this.loadedDwcPlugins.some(item => item.id === plugin.id)) {
						await this.loadDwcPlugin( { id: plugin.id, saveSettings: true });
					}

					// Display a message
					makeNotification('success', this.$t('notification.plugins.started'));
				} catch (e) {
					makeNotification('error', this.$t('notification.plugins.startError'), e.reason || e.toString());
					throw e;
				}
			} finally {
				this.busyPlugins = this.busyPlugins.filter(item => item != plugin.id);
			}
		},
		async stopPlugin(plugin) {
			this.busyPlugins.push(plugin.id);
			try {
				// Stop the plugin on the SBC (if needed)
				if (plugin.sbcExecutable && plugin.pid > 0) {
					try {
						await this.stopSbcPlugin(plugin.id);
						makeNotification('success', this.$t('notification.plugins.stopped'));
					} catch (e) {
						makeNotification('error', this.$t('notification.plugins.stopError'), e.reason || e.toString());
						throw e;
					}
				}

				// Remove the plugin from the auto load list and tell the user to reload DWC
				if (this.loadedDwcPlugins.indexOf(plugin.id) !== -1) {
					this.unloadDwcPlugin(plugin.id);
					this.dwcPluginsUnloaded = true;
				}
			} finally {
				this.busyPlugins = this.busyPlugins.filter(item => item != plugin.id);
			}
		},
		async doUninstallPlugin(plugin) {
			this.busyPlugins.push(plugin.id);
			try {
				try {
					// Uninstall the plugin
					await this.uninstallPlugin(plugin);

					// Display a message
					makeNotification('success', this.$t('notification.plugins.uninstalled'));
				}
				catch (e) {
					makeNotification('error', this.$t('notification.plugins.uninstallError'), e.reason || e.toString());
					throw e;
				}
			} finally {
				this.busyPlugins = this.busyPlugins.filter(item => item != plugin.id);
			}
		}
	}
}
</script>
