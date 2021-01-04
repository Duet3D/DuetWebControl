<template>
	<v-card outlined>
		<v-tabs>
			<v-tab>{{ $t('panel.settingsListItems.toolTemperatures') }}</v-tab>
			<v-tab>{{ $t('panel.settingsListItems.bedTemperatures') }}</v-tab>
			<v-tab>{{ $t('panel.settingsListItems.chamberTemperatures') }}</v-tab>
			<v-tab>{{ $t('panel.settingsListItems.spindleRPM') }}</v-tab>
			<v-tab-item class="pa-3">
				<list-editor itemKey="tool" temperature></list-editor>
			</v-tab-item>
			<v-tab-item class="pa-3">
				<list-editor itemKey="bed" temperature></list-editor>
			</v-tab-item>
			<v-tab-item class="pa-3">
				<list-editor itemKey="chamber" temperature></list-editor>
			</v-tab-item>
			<v-tab-item class="pa-3">
				<list-editor itemKey="spindleRPM"></list-editor>
			</v-tab-item>
		</v-tabs>
	</v-card>
</template>

<script>
'use strict'

export default {
	// required for v-tabs to work properly
}
</script>
