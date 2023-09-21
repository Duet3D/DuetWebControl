<template>
	<v-card outlined>
		<v-card-title class="pb-0">
			{{ $t("panel.settingsMachine.caption") }}
		</v-card-title>

		<v-card-text>
			<v-row :dense="$vuetify.display.mobile">
				<v-col cols="12" lg="6">
					<v-text-field v-model.number="babystepAmount" type="number" step="any" min="0.001"
								  :label="$t('panel.settingsMachine.babystepAmount', ['mm'])" hide-details />
				</v-col>
				<v-col cols="12">
					<v-switch :label="$t('panel.settingsMachine.checkVersions')" hide-details v-model="checkVersions" />
				</v-col>
				<v-col cols="12" lg="6">
					<v-text-field v-model.number="moveFeedrate" type="number" step="any" min="0.001"
								  :label="$t('panel.settingsMachine.moveFeedrate', ['mm/min'])" hide-details />
				</v-col>
				<v-col cols="12">
					<v-autocomplete v-model="toolChangeMacros" :items="toolChangeMacroList" chips clearable
									:label="$t('panel.settingsMachine.toolChangeMacros')" multiple hide-details>
						<template #selection="{ attrs, item, select, selected }">
							<v-chip v-bind="attrs" :input-value="selected" close @click="select"
									@click:close="removeToolChangeMacro(item.value)">
								{{ item.text }}
							</v-chip>
						</template>
					</v-autocomplete>
				</v-col>
				<v-col cols="12">
					<v-switch :label="$t('panel.settingsAppearance.groupTools')" hide-details v-model="groupTools" />
				</v-col>
				<v-col cols="6">
					<v-switch :label="$t('panel.settingsAppearance.singleBedControl')" hide-details v-model="singleBedControl" />
				</v-col>
				<v-col cols="6">
					<v-switch :label="$t('panel.settingsAppearance.singleChamberControl')" hide-details v-model="singleChamberControl" />
				</v-col>
			</v-row>
		</v-card-text>
	</v-card>
</template>

<script lang="ts">
import { mapWritableState } from "pinia";
import { defineComponent } from "vue";

import { ToolChangeMacro, useSettingsStore } from "@/store/settings";

export default defineComponent({
	computed: mapWritableState(useSettingsStore, ["babystepAmount", "checkVersions", "moveFeedrate", "toolChangeMacros", "groupTools", "singleBedControl", "singleChamberControl"]),
	data() {
		return {
			toolChangeMacroList: [
				{
					text: 'tfree.g',
					value: ToolChangeMacro.free
				},
				{
					text: 'tpre.g',
					value: ToolChangeMacro.pre
				},
				{
					text: 'tpost.g',
					value: ToolChangeMacro.post
				}
			]
		}
	},
	methods: {
		removeToolChangeMacro(item: ToolChangeMacro) {
			this.toolChangeMacros = this.toolChangeMacros.filter(macro => macro !== item);
		}
	}
});
</script>
