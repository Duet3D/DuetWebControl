<template>
	<v-card outlined>
		<v-card-title>
			{{ $t("panel.settingsBehaviour.caption") }}
		</v-card-title>

		<v-card-text>
			<v-row>
				<v-col cols="12" xs="12">
					<v-switch class="mt-0 mb-3" v-model="behaviourJobStart"
							  :label="$t('panel.settingsBehaviour.behaviourJobStart')" hide-details />
				</v-col>
			</v-row>
		</v-card-text>
	</v-card>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import { useSettingsStore } from "@/store/settings";

export default defineComponent({
	computed: {
		behaviourJobStart: {
			get(): boolean { return useSettingsStore().behaviour.jobStart; },
			set(value: boolean) { useSettingsStore().behaviour.jobStart = value; }
		}
	}
});
</script>
