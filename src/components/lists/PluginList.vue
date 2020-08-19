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
					<th class="text-left">Status</th>
					<th width="1%" class="no-wrap"></th>
					<th v-if="canUninstall" width="1%" class="no-wrap"></th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="plugin in plugins" :key="plugin.name">
					<td>{{ plugin.name }}</td>
					<td>{{ plugin.author }}</td>
					<td>{{ plugin.version }}</td>
					<td>{{ plugin.license }}</td>
					<td>{{ getPluginDependencies(plugin) }}</td>
					<td>{{ getPluginStatus(plugin) }}</td>
					<td class="no-wrap">
						<v-btn v-if="!isPluginStarted(plugin)" color="success" @click="startPlugin(plugin)">
							<v-icon class="mr-1">mdi-open-in-app</v-icon> {{ $t('tabs.plugins.startPlugin') }}
						</v-btn>
						<v-btn v-else color="warning" @click="stopPlugin(plugin)" :disabled="!canStopPlugin(plugin)">
							<v-icon class="mr-1">mdi-remove</v-icon> {{ $t('tabs.plugins.stopPlugin') }}
						</v-btn>
					</td>
					<td v-if="canUninstall" class="no-wrap">
						<v-btn v-if="isPluginInstalled(plugin)" color="danger" class="px-3" @click="uninstallPlugin(plugin)">
							<v-icon class="mr-1">mdi-trash</v-icon> {{ $t('tabs.plugins.uninstallPlugin') }}
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

export default {
	props: {
		plugins: {
			type: Array,
			required: true
		},
		canUninstall: {
			type: Boolean,
			default: true
		}
	}
}
</script>
