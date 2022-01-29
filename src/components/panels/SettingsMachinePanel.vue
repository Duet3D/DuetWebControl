<template>
	<v-card outlined>
		<v-card-title class="pb-0">
			{{ $t('panel.settingsMachine.caption') }}
		</v-card-title>

		<v-card-text>
			<v-row :dense="$vuetify.breakpoint.mobile">
				<v-col cols="12" lg="6">
					<v-text-field v-model.number="babystepAmount" type="number" step="any" min="0.001" :label="$t('panel.settingsMachine.babystepAmount', ['mm'])" hide-details></v-text-field>
				</v-col>
				<v-col cols="12" lg="6">
					<v-text-field v-model.number="moveFeedrate" type="number" step="any" min="0.001" :label="$t('panel.settingsMachine.moveFeedrate', ['mm/min'])" hide-details></v-text-field>
				</v-col>
				<v-col cols="12">
					<v-autocomplete v-model="toolChangeMacros" :items="toolChangeMacroList" chips clearable :label="$t('panel.settingsMachine.toolChangeMacros')" multiple hide-details>
						<template #selection="{ attrs, item, select, selected }">
							<v-chip v-bind="attrs" :input-value="selected" close @click="select" @click:close="removeToolChangeMacro(item)">
								{{ item.text }}
							</v-chip>
						</template>
					</v-autocomplete>
				</v-col>
			</v-row>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

import { mapState, mapMutations } from 'vuex'
import { ToolChangeMacro } from "@/store/machine/settings";

export default {
	computed: {
		...mapState('machine', ['settings']),
		...mapState('machine/model', ['boards']),
		babystepAmount: {
			get() { return this.settings.babystepAmount; },
			set(value) { if (this.isNumber(value) && value > 0) { this.update({ babystepAmount: value }); } }
		},
		moveFeedrate: {
			get() { return this.settings.moveFeedrate; },
			set(value) { if (this.isNumber(value) && value > 0) { this.update({ moveFeedrate: value }); } }
		},
		toolChangeMacros: {
			get() { return this.settings.toolChangeMacros; },
			set(value) { this.update({ toolChangeMacros: value }); }
		}
	},
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
		...mapMutations('machine/settings', ['update']),
		removeToolChangeMacro(item) {
			this.toolChangeMacros = this.toolChangeMacros.filter(macro => macro !== item.value);
		}
	}
}
</script>
