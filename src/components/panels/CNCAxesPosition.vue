<template>
	<v-card class="py-0">
		<v-card-title class="py-2">
			<strong>
				{{ machinePosition ? $t("panel.status.machinePosition") : $t("panel.status.toolPosition") }}
			</strong>
		</v-card-title>
		<v-card-text>
			<v-row align-content="center" no-gutters :class="{ 'large-font': !machinePosition }">
				<v-col v-for="(axis, index) in visibleAxes" :key="axis.letter" class="d-flex flex-column align-center">
					<span class="axis-span" :class="axisSpanClasses(index)">
						{{ axis.letter }}
					</span>
					<div>
						{{ displayAxisPosition(axis, machinePosition) }}
					</div>
				</v-col>
			</v-row>
		</v-card-text>
	</v-card>
</template>

<style scoped>
.axis-span {
	border-radius: 5px;
}

/* Tool position is rendered large because it's the value the operator references constantly. The
   media-query rather than a Vuetify utility class is intentional - this size depends on viewport, not on
   the container, and the value-glance UX is the same on every device class */
@media screen and (max-width: 600px) {
	.large-font-height { height: 35px; }
	.large-font { font-size: 30px; }
}

@media screen and (min-width: 601px) {
	.large-font-height { height: 55px; }
	.large-font { font-size: 50px; }
}
</style>

<script setup lang="ts">
import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";
import { displayAxisPosition } from "@/utils/display";

const props = defineProps<{
	machinePosition: boolean;
}>();

const machineStore = useMachineStore();
const settingsStore = useSettingsStore();

const visibleAxes = computed(() => machineStore.model.move.axes.filter(axis => axis.visible));

function axisSpanClasses(axisIndex: number): Array<string> {
	const classList: Array<string> = [];
	const endstops = machineStore.model.sensors.endstops;
	if (props.machinePosition
		&& axisIndex >= 0 && axisIndex < endstops.length
		&& endstops[axisIndex]?.triggered) {
		classList.push("px-2", "bg-light-green", settingsStore.darkTheme ? "darken-3" : "lighten-4");
	} else if (!props.machinePosition) {
		classList.push("large-font-height");
	}
	return classList;
}
</script>
