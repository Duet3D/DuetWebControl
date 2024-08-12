<style scoped>
.axis-span {
	border-radius: 5px;
}

@media screen and (max-width: 600px) {
	.large-font-height {
		height: 35px;
	}

	.large-font {
		font-size: 30px;
	}
}

@media screen and (min-width: 601px) {
	.large-font-height {
		height: 55px;
	}

	.large-font {
		font-size: 50px;
	}
}
</style>

<template>
	<v-card class="py-0">
		<v-card-title class="py-2">
			<strong>
				{{ machinePosition ? $t("panel.status.machinePosition") : $t("panel.status.toolPosition") }}
			</strong>
		</v-card-title>
		<v-card-text>
			<v-row align-content="center" no-gutters :class="{ 'large-font' : !machinePosition }">
				<v-col v-for="(axis, index) in visibleAxes" :key="axis.letter" class="d-flex flex-column align-center">
					<span class="axis-span" :class="axisSpanClasses(index)">
						{{ axis.letter }}
					</span>
					<div>
						{{ $displayAxisPosition(axis, machinePosition) }}
					</div>
				</v-col>
			</v-row>
		</v-card-text>
	</v-card>
</template>

<script lang="ts">
import { Axis } from "@duet3d/objectmodel";
import Vue from "vue";

import store from "@/store";

export default Vue.extend({
	props: {
		machinePosition: {
			type: Boolean,
			required: true
		}
	},
	computed: {
		darkTheme(): boolean {
			return store.state.settings.darkTheme;
		},
		visibleAxes(): Array<Axis> {
			return store.state.machine.model.move.axes.filter(axis => axis.visible);
		}
	},
	methods: {
		axisSpanClasses(axisIndex: number) {
			const classList: Array<string> = [];
			if (this.machinePosition) {
				if (axisIndex >= 0 && axisIndex < store.state.machine.model.sensors.endstops.length && store.state.machine.model.sensors.endstops[axisIndex]?.triggered) {
					classList.push("px-2");
					classList.push("light-green");
					classList.push(this.darkTheme ? "darken-3" : "lighten-4");
				}
			} else {
				classList.push("large-font-height");
			}
			return classList;
		}
	}
});
</script>

