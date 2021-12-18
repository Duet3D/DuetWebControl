<template>
	<v-row class="pa-3" :dense="$vuetify.breakpoint.mobile">
		<v-col cols="12" md="4">
			<v-row :dense="$vuetify.breakpoint.mobile">
				<v-col cols="12" md="12">
					<settings-electronics-panel></settings-electronics-panel>
				</v-col>
				<v-col cols="12" sm="6" md="12">
					<settings-machine-panel></settings-machine-panel>
				</v-col>
				<v-col cols="12" sm="6" md="12">
					<settings-communication-panel></settings-communication-panel>
				</v-col>
			</v-row>
		</v-col>

		<v-col cols="12" md="8">
			<settings-list-items-panel></settings-list-items-panel>
		</v-col>
	</v-row>
</template>

<script>
'use strict'

import { registerSettingTab } from '../../routes'

export default {
	install() {
		// Register a settings tab on the Machine settings page
		registerSettingTab(false, 'settings-machine-tab', this, 'tabs.machineSettings.caption');
	}
}
</script>
