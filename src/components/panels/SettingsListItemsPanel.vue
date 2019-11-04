<template>
	<v-card>
		<v-card-title class="pb-0">
			{{ $t('panel.settingsListItems.caption') }}
		</v-card-title>

		<v-container fluid grid-list-lg class="px-3 py-0">
			<v-tabs>
				<v-tab>{{ $t('panel.settingsListItems.toolTemperatures') }}</v-tab>
				<v-tab>{{ $t('panel.settingsListItems.bedTemperatures') }}</v-tab>
				<v-tab>{{ $t('panel.settingsListItems.chamberTemperatures') }}</v-tab>
				<v-tab>{{ $t('panel.settingsListItems.spindleRPM') }}</v-tab>
				<v-tab-item>
					<list-editor itemKey="tool" temperature></list-editor>
				</v-tab-item>
				<v-tab-item>
					<list-editor itemKey="bed" temperature></list-editor>
				</v-tab-item>
				<v-tab-item>
					<list-editor itemKey="chamber" temperature></list-editor>
				</v-tab-item>
				<v-tab-item>
					<list-editor itemKey="spindleRPM"></list-editor>
				</v-tab-item>
			</v-tabs>
		</v-container>
	</v-card>
</template>

<script>
'use strict'

export default {
	// required for v-tabs to work properly
}
</script>
