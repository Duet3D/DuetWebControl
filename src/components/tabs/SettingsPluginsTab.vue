<style scoped>
.no-wrap {
	white-space: nowrap;
}
</style>

<template>
	<v-simple-table>
		<template v-slot:default>
			<thead>
				<tr>
					<th class="text-left">Name</th>
					<th class="text-left">Author</th>
					<th class="text-left">Version</th>
					<th class="text-left">License</th>
					<th class="text-left">Dependencies</th>
					<th width="1%" class="no-wrap">Load automatically</th>
					<th width="1%" class="no-wrap"></th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="plugin in plugins" :key="plugin.name">
					<td>{{ plugin.name }}</td>
					<td>{{ plugin.author }}</td>
					<td>{{ plugin.version }}</td>
					<td>{{ plugin.license }}</td>
					<td>{{ plugin.dependencies }}</td>
					<td width="1%">
						<v-simple-checkbox :value="autoLoadPlugins.indexOf(plugin.name) >= 0" @input="toggleAutoLoadPlugin(plugin.name)"></v-simple-checkbox>
					</td>
					<td class="no-wrap">
						<v-btn color="primary" :disabled="plugin.loaded" @click="doLoadPlugin(plugin.name)">
							<v-icon class="mr-1">mdi-open-in-app</v-icon> {{ $t('tabs.plugins.loadPlugin') }}
						</v-btn>
					</td>
				</tr>
			</tbody>
		</template>

		<template #no-data>
			<v-alert :value="true" type="info" class="text-left ma-0" @contextmenu.prevent="">
				No Plugins
			</v-alert>
		</template>
	</v-simple-table>
</template>

<script>
'use strict'

import { mapState, mapActions, mapMutations } from 'vuex'

import { registerSettingTab } from '../../routes'

export default {
	install() {
		// Register a settings tab on the General settings page
		registerSettingTab(true, 'settings-plugins-tab', this, 'tabs.plugins.caption');
	},

	computed: {
		...mapState(['plugins']),
		...mapState('settings', ['autoLoadPlugins'])
	},
	methods: {
		...mapActions(['loadPlugin']),
		...mapMutations('settings', ['toggleAutoLoadPlugin']),
		async doLoadPlugin(pluginName) {
			try {
				await this.loadPlugin(pluginName);
			} catch (e) {
				alert(e);
				throw e;
			}
		}
	}
}
</script>
