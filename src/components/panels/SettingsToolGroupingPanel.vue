<template>
	<v-card outlined>
		<v-card-title class="pb-0">
			{{ $t("panel.settingsToolGrouping.caption") }}
		</v-card-title>

		<v-card-text>
			<v-row :dense="$vuetify.breakpoint.mobile">
				<v-col cols="12">
					<v-switch :label="$t('panel.settingsToolGrouping.groupTools')" hide-details v-model="groupTools" />
				</v-col>
				<v-col cols="6">
					<v-switch :label="$t('panel.settingsToolGrouping.groupByExtruders')" hide-details v-model="groupByExtruders" />
				</v-col>
				<v-col cols="6">
					<v-switch :label="$t('panel.settingsToolGrouping.groupByHeaters')" hide-details v-model="groupByHeaters" />
				</v-col>
				<v-col cols="6">
					<v-switch :label="$t('panel.settingsToolGrouping.groupByOffsets')" hide-details v-model="groupByOffsets" />
				</v-col>
				<v-col cols="6">
					<v-switch :label="$t('panel.settingsToolGrouping.groupBySpindle')" hide-details v-model="groupBySpindle" />
				</v-col>
			</v-row>
		</v-card-text>
	</v-card>
</template>

<script lang="ts">
import Vue from "vue";

import store from "@/store";
import { MachineSettingsState, ToolChangeMacro } from "@/store/machine/settings";

export default Vue.extend({
	computed: {
		groupTools: {
			get(): boolean { return store.state.machine.settings.groupTools; },
			set(value: boolean) { this.update({ groupTools: value }); }
		},
		groupByExtruders: {
			get(): boolean { return store.state.machine.settings.groupByExtruders; },
			set(value: boolean) { this.update({ groupByExtruders: value }); }
		},
		groupByHeaters: {
			get(): boolean { return store.state.machine.settings.groupByHeaters; },
			set(value: boolean) { this.update({ groupByHeaters: value }); }
		},
		groupByOffsets: {
			get(): boolean { return store.state.machine.settings.groupByOffsets; },
			set(value: boolean) { this.update({ groupByOffsets: value }); }
		},
		groupBySpindle: {
			get(): boolean { return store.state.machine.settings.groupBySpindle; },
			set(value: boolean) { this.update({ groupBySpindle: value }); }
		}
	},
	methods: {
		update(data: Partial<MachineSettingsState>) {
			store.commit("machine/settings/update", data);
		}
	}
});
</script>
