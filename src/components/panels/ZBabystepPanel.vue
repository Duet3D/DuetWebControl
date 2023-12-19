<template>
	<v-card>
		<v-card-title class="pb-0">
			<v-icon small class="mr-1">mdi-format-vertical-align-center</v-icon> {{ $t('panel.babystepping.caption') }}
		</v-card-title>

		<v-card-text class="pt-1">
			{{ $t('panel.babystepping.current', [$displayZ(babystepping)]) }}

			<v-row class="mt-1" dense>
				<v-col>
					<code-btn :code="`M290 R1 Z${-babystepAmount}`" no-wait block>
						<v-icon>mdi-arrow-collapse-vertical</v-icon>
						{{ $displayZ(-babystepAmount) }}
					</code-btn>
				</v-col>

				<v-col>
					<code-btn :code="`M290 R1 Z${babystepAmount}`" no-wait block>
						<v-icon>mdi-arrow-split-horizontal</v-icon>
						+{{ $displayZ(babystepAmount) }}
					</code-btn>
				</v-col>
			</v-row>
		</v-card-text>
	</v-card>
</template>

<script lang="ts">
import { AxisLetter } from "@duet3d/objectmodel";
import Vue from "vue";

import store from "@/store";

export default Vue.extend({
	computed: {
		babystepping(): number {
			return store.state.machine.model.move.axes.find(axis => axis.letter === AxisLetter.Z)?.babystep ?? 0;
		},
		babystepAmount(): number {
			return store.state.machine.settings.babystepAmount;
		}
	}
});
</script>
