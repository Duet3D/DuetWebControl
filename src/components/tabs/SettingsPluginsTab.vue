<template>
	<v-simple-table>
		<template v-slot:default>
			<thead>
				<tr>
					<th class="text-left">Name</th>
					<th class="text-left">Author</th>
					<th class="text-right"></th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="plugin in plugins" :key="plugin.name">
					<td>{{ plugin.name }}</td>
					<td>{{ plugin.author }}</td>
					<td class="text-right">
						<v-btn color="primary" :disabled="plugin.loaded" @click="loadPlugin(plugin)">
							<v-icon class="mr-1">mdi-open-in-app</v-icon> {{ $t('tabs.plugins.loadPlugin') }}
						</v-btn>
					</td>
				</tr>
			</tbody>
		</template>
	</v-simple-table>
</template>

<script>
'use strict'

import Vue from 'vue'

import Plugins from '../../plugins'
import { registerSettingTab } from '../../routes'

export default {
	install() {
		// Register a settings tab on the General settings page
		registerSettingTab(true, 'settings-plugins-tab', this, 'tabs.plugins.caption');
	},
	computed: {
		plugins: () => Plugins
	},
	methods: {
		loadPlugin(plugin) {
			// TODO Load external plugins via import(/* webpackIgnore: true */ 'ignored-module.js');
			plugin.module().then(function(module) {
				try {
					Vue.use(module.default);
					plugin.loaded = true;
				} catch (e) {
					alert(`Failed to load plugin:\n${e}`);
				}
			});
		},
		toggleAutoLoad() {
			alert('Sorry, not implemented yet');
		}
	}
}
</script>
