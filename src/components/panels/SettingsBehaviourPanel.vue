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
import Vue from "vue";

import store from "@/store";
import { SettingsState } from "@/store/settings";

export default Vue.extend({
	computed: {
		behaviourJobStart: {
			get(): boolean { return store.state.settings.behaviour.jobStart; },
			set(value: boolean) { this.update({ jobStart: value }); }
		},
	},
	methods: {
		update(data: Partial<SettingsState["behaviour"]>) {
			store.commit("settings/update", { behaviour: data });
		}
	}
});
</script>
