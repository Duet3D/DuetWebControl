<template>
	<v-tabs v-model="tab" class="elevation-2 mt-3">
		<v-tabs-slider></v-tabs-slider>

		<v-tab v-for="(tab, index) in tabs" :key="index" :href="`#machine-tab-${index}`">
			<v-icon v-if="tab.icon" class="mr-1">{{ tab.icon }}</v-icon> {{ tab.translated ? tab.caption : $t(tab.caption) }}
		</v-tab>

		<v-tab-item v-for="(tab, index) in tabs" :key="index" :value="`machine-tab-${index}`">
			<component :is="tab.component"></component>
		</v-tab-item>
	</v-tabs>
</template>

<script>
'use strict'

import { registerRoute, MachineSettingTabs } from '..'

export default {
	install() {
		// Register a route via Settings -> Machine
		registerRoute(this, {
			Settings: {
				Machine: {
					icon: 'mdi-cogs',
					caption: 'menu.settings.machine',
					path: '/Settings/Machine'
				}
			}
		});
	},
	data() {
		return {
			tab: 'machine-tab-0',
			tabs: MachineSettingTabs
		}
	}
}
</script>
