<template>
	<v-card outlined>
		<v-tabs>
			<!-- Tab Titles-->
			<v-tab>
				{{ $t("panel.settingsListItems.toolTemperatures") }}
			</v-tab>
			<v-tab>
				{{ $t("panel.settingsListItems.bedTemperatures") }}
			</v-tab>
			<v-tab>
				{{ $t("panel.settingsListItems.chamberTemperatures") }}
			</v-tab>
			<v-tab>
				{{ $t("panel.settingsListItems.spindleRPM") }}
			</v-tab>

			<!-- Tab Contents-->
			<v-tab-item class="pa-3">
				<list-editor itemKey="tool" temperature />
			</v-tab-item>
			<v-tab-item class="pa-3">
				<list-editor itemKey="bed" temperature />
			</v-tab-item>
			<v-tab-item class="pa-3">
				<list-editor itemKey="chamber" temperature />
			</v-tab-item>
			<v-tab-item class="pa-3">
				<list-editor itemKey="spindleRPM" />
			</v-tab-item>
		</v-tabs>
	</v-card>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({});
</script>
