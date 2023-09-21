<template>
	<v-card>
		<v-card-title>
			<v-icon small class="mr-1">mdi-format-vertical-align-center</v-icon>
			{{ $t('panel.babystepping.caption') }}
		</v-card-title>

		<v-card-text class="pt-0">
			{{ $t('panel.babystepping.current', [$displayZ(babystepping)]) }}

			<v-row no-gutters class="mt-1">
				<v-col>
					<code-btn :code="`M290 R1 Z${-babystepAmount}`" no-wait block>
						<v-icon>mdi-arrow-collapse-vertical</v-icon> {{ $displayZ(-babystepAmount) }}
					</code-btn>
				</v-col>

				<v-col>
					<code-btn :code="`M290 R1 Z${babystepAmount}`" no-wait block>
						<v-icon>mdi-arrow-split-horizontal</v-icon> +{{ $displayZ(babystepAmount) }}
					</code-btn>
				</v-col>
			</v-row>
		</v-card-text>
	</v-card>
</template>

<script lang="ts">
import { AxisLetter } from "@duet3d/objectmodel";
import { mapState } from "pinia";
import Vue from "vue";

import { useSettingsStore } from "@/store/settings";
import { useMachineStore } from "@/store/machine";

export default Vue.extend({
	computed: {
		...mapState(useMachineStore, {
			babystepping: state => state.model.move.axes.find(axis => axis.letter === AxisLetter.Z)?.babystep ?? 0
		}),
		...mapState(useSettingsStore, ["babystepAmount"])
	}
});
</script>
