<template>
	<v-card>
		<v-card-title class="py-2 d-flex align-center">
			<v-icon size="small" class="mr-1">mdi-information</v-icon>
			{{ $t("panel.status.caption") }}

			<v-spacer />

			<StatusLabel v-if="machineStore.model.state.status" />

			<v-spacer />

			<span v-if="machineStore.model.state.machineMode">
				{{ $t("panel.status.mode", [machineStore.model.state.machineMode.toUpperCase()]) }}
			</span>
		</v-card-title>

		<v-card-text v-if="hasContent" class="px-0 pt-0 pb-2 content text-xs-center">
			<!-- Axis positions -->
			<template v-if="visibleAxes.length > 0">
				<v-row no-gutters class="flex-nowrap">
					<v-col tag="strong" class="category-header">
						<a href="javascript:void(0)" @click="displayToolPosition = !displayToolPosition">
							{{ displayToolPosition ? $t("panel.status.toolPosition") : $t("panel.status.machinePosition") }}
						</a>
					</v-col>
					<v-col>
						<v-row align-content="center" no-gutters>
							<v-col v-for="(axis, index) in visibleAxes" :key="index"
								   class="d-flex flex-column align-center">
								<span class="axis-span font-weight-bold" :class="axisSpanClasses(index)">
									{{ axis.letter }}
								</span>
								<span>
									{{ displayAxisPosition(axis, !displayToolPosition) }}
								</span>
							</v-col>
						</v-row>
					</v-col>
				</v-row>
			</template>

			<!-- Extruders -->
			<template v-if="machineStore.model.move.extruders.length > 0">
				<v-divider v-if="visibleAxes.length > 0" class="my-2" />

				<v-row align-content="center" no-gutters class="flex-nowrap">
					<v-col tag="strong" class="category-header">
						<a href="javascript:void(0)" @click="displayVirtualEPos = !displayVirtualEPos">
							{{ displayVirtualEPos ? $t("panel.status.virtualEPos") : $t("panel.status.extruders") }}
						</a>
					</v-col>
					<v-col v-if="displayVirtualEPos" class="d-flex align-center justify-center">
						{{ display(virtualEPos, 1) }}
					</v-col>
					<v-col v-else>
						<v-row align-content="center" no-gutters>
							<v-col v-for="(extruder, index) in machineStore.model.move.extruders" :key="index"
								   class="d-flex flex-column align-center">
								<strong>{{ $t("panel.status.extruderDrive", [index]) }}</strong>
								<span>{{ display(extruder.position, 1) }}</span>
							</v-col>
						</v-row>
					</v-col>
				</v-row>
			</template>

			<!-- Speeds -->
			<template v-if="hasSpeedReadings">
				<v-divider v-if="visibleAxes.length + machineStore.model.move.extruders.length > 0" class="my-2" />

				<v-row align-content="center" no-gutters class="flex-nowrap">
					<v-col tag="strong" class="category-header">
						{{ $t("panel.status.speeds") }}
					</v-col>
					<v-col>
						<v-row align-content="center" no-gutters>
							<v-col v-if="isFinite(machineStore.model.move.currentMove.requestedSpeed)"
								   class="d-flex flex-column align-center">
								<strong>{{ $t("panel.status.requestedSpeed") }}</strong>
								<span class="text-no-wrap">
									{{ displayMoveSpeed(machineStore.model.move.currentMove.requestedSpeed) }}
								</span>
							</v-col>
							<v-col v-if="isFinite(machineStore.model.move.currentMove.topSpeed)"
								   class="d-flex flex-column align-center">
								<strong>{{ $t("panel.status.topSpeed") }}</strong>
								<span class="text-no-wrap">
									{{ displayMoveSpeed(machineStore.model.move.currentMove.topSpeed) }}
								</span>
							</v-col>
							<v-col v-if="isFinite(machineStore.model.move.currentMove.extrusionRate) && uiStore.isFFF"
								   class="d-flex flex-column align-center">
								<strong>
									<a href="javascript:void(0)"
									   @click="displayVolumetricFlow = !displayVolumetricFlow">
										{{ displayVolumetricFlow ? $t("panel.status.volumetricFlow") : $t("panel.status.extrusionRate") }}
									</a>
								</strong>
								<span class="text-no-wrap">
									{{ displayVolumetricFlow
										? display(volumetricFlow, 1, "mm³/s")
										: displayMoveSpeed(machineStore.model.move.currentMove.extrusionRate) }}
								</span>
							</v-col>
						</v-row>
					</v-col>
				</v-row>
			</template>

			<!-- Sensors -->
			<template v-if="sensorsPresent">
				<v-divider v-if="(machineStore.model.move.axes.length + machineStore.model.move.extruders.length > 0) || hasSpeedReadings"
						   class="my-2" />

				<v-row align-content="center" no-gutters class="flex-nowrap">
					<v-col tag="strong" class="category-header">
						{{ $t("panel.status.sensors") }}
					</v-col>
					<v-col>
						<v-row align-content="center" justify="center" no-gutters>
							<template v-if="mainboard !== null">
								<v-col v-if="mainboard.vIn !== null" class="d-flex flex-column align-center">
									<strong>{{ $t("panel.status.vIn") }}</strong>
									<v-tooltip location="bottom"
											   :text="$t('panel.status.minMax', [display(mainboard.vIn.min, 1, 'V'), display(mainboard.vIn.max, 1, 'V')])">
										<template #activator="{ props: tooltipProps }">
											<span v-bind="tooltipProps" class="text-no-wrap">
												{{ display(mainboard.vIn.current, 1, "V") }}
											</span>
										</template>
									</v-tooltip>
								</v-col>
								<v-col v-if="mainboard.v12 !== null" class="d-flex flex-column align-center">
									<strong>{{ $t("panel.status.v12") }}</strong>
									<v-tooltip location="bottom"
											   :text="$t('panel.status.minMax', [display(mainboard.v12.min, 1, 'V'), display(mainboard.v12.max, 1, 'V')])">
										<template #activator="{ props: tooltipProps }">
											<span v-bind="tooltipProps" class="text-no-wrap">
												{{ display(mainboard.v12.current, 1, "V") }}
											</span>
										</template>
									</v-tooltip>
								</v-col>
								<v-col v-if="mainboard.mcuTemp !== null" class="d-flex flex-column align-center">
									<strong class="text-no-wrap">{{ $t("panel.status.mcuTemp") }}</strong>
									<v-tooltip location="bottom"
											   :text="$t('panel.status.minMax', [display(mainboard.mcuTemp.min, 1, '°C'), display(mainboard.mcuTemp.max, 1, '°C')])">
										<template #activator="{ props: tooltipProps }">
											<span v-bind="tooltipProps" class="text-no-wrap">
												{{ display(mainboard.mcuTemp.current, 1, "°C") }}
											</span>
										</template>
									</v-tooltip>
								</v-col>
							</template>

							<v-col v-if="fanRPM.length > 0" class="d-flex flex-column align-center">
								<strong>{{ $t("panel.status.fanRPM") }}</strong>
								<div class="d-flex flex-row">
									<template v-for="(item, index) in fanRPM" :key="index">
										<template v-if="index !== 0">,&nbsp;</template>
										<span :title="item.name" class="mx-0">{{ item.rpm }}</span>
									</template>
								</div>
							</v-col>

							<v-col v-if="validProbes.length > 0" class="d-flex flex-column align-center">
								<strong>{{ $t("panel.status.probe", validProbes.length) }}</strong>
								<div class="d-flex">
									<span v-for="(probe, index) in validProbes" :key="index"
										  class="pa-1 probe-span" :class="probeSpanClasses(probe, index === 0)">
										{{ formatProbeValues(probe.value) }}
									</span>
								</div>
							</v-col>
						</v-row>
					</v-col>
				</v-row>
			</template>
		</v-card-text>

		<v-card-text v-else class="pa-0">
			<v-alert type="info" :text="$t('panel.status.noStatus')" tile />
		</v-card-text>
	</v-card>
</template>

<style scoped>
.axis-span {
	border-radius: 5px;
}

strong {
	align-self: center;
	text-align: center;
}

.category-header {
	flex: 0 0 100px;
}

a {
	color: inherit;
	text-decoration: none;
}

.content span,
.content strong {
	padding-left: 8px;
	padding-right: 8px;
}

.probe-span {
	border-radius: 5px;
	text-align: center;
	white-space: nowrap;
	width: 60px;
}

.probe-span:not(:last-child) {
	margin-right: 8px;
}
</style>

<script setup lang="ts">
import { ProbeType, type Probe } from "@duet3d/objectmodel";

import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";
import { useUiStore } from "@/stores/ui";
import { display, displayAxisPosition, displayMoveSpeed } from "@/utils/display";
import { isPrinting } from "@/utils/enums";

const machineStore = useMachineStore();
const settingsStore = useSettingsStore();
const uiStore = useUiStore();

const displayToolPosition = ref(true);
const displayVirtualEPos = ref(false);
const displayVolumetricFlow = ref(true);

const visibleAxes = computed(() => machineStore.model.move.axes.filter(axis => axis.visible));

const mainboard = computed(() => machineStore.model.boards.find(board => !board.canAddress) ?? null);

const fanRPM = computed(() =>
	machineStore.model.fans
		.filter(fan => fan !== null && fan.rpm >= 0)
		.map((fan, index) => ({
			name: fan!.name || `Fan ${index}`,
			rpm: fan!.rpm
		}))
);

const validProbes = computed(() =>
	machineStore.model.sensors.probes.filter(probe => probe !== null && probe.type !== ProbeType.none) as Array<Probe>
);

const sensorsPresent = computed(() =>
	(mainboard.value !== null && (mainboard.value.vIn !== null || mainboard.value.v12 !== null || mainboard.value.mcuTemp !== null))
	|| fanRPM.value.length > 0
	|| validProbes.value.length > 0
);

const hasSpeedReadings = computed(() =>
	isFinite(machineStore.model.move.currentMove.requestedSpeed)
	|| isFinite(machineStore.model.move.currentMove.topSpeed)
);

const hasContent = computed(() => sensorsPresent.value || visibleAxes.value.length + machineStore.model.move.extruders.length > 0);

// Virtual extrusion position belongs to the currently-selected motion system; defaults to 0 when only
// one motion system is configured (the common case)
const virtualEPos = computed(() => {
	const ms = machineStore.model.move.motionSystems[machineStore.selectedMotionSystem];
	return ms?.virtualEPos ?? NaN;
});

const volumetricFlow = computed(() => {
	const currentToolIndex = machineStore.model.state.currentTool;
	if (currentToolIndex < 0 || currentToolIndex >= machineStore.model.tools.length) {
		return NaN;
	}
	const selectedTool = machineStore.model.tools[currentToolIndex];
	if (!selectedTool) {
		return NaN;
	}

	let numExtruders = 0;
	let filamentArea = 0;
	for (let i = 0; i < selectedTool.extruders.length; i++) {
		const extruderIndex = selectedTool.extruders[i];
		if (extruderIndex >= 0 && extruderIndex < machineStore.model.move.extruders.length) {
			const extruder = machineStore.model.move.extruders[extruderIndex];
			if (extruder !== null) {
				filamentArea += selectedTool.mix[i] * (Math.PI * Math.pow(extruder.filamentDiameter / 2, 2));
				numExtruders++;
			}
		}
	}
	if (numExtruders === 0) {
		return NaN;
	}
	filamentArea /= numExtruders;
	return filamentArea * machineStore.model.move.currentMove.extrusionRate;
});

function axisSpanClasses(axisIndex: number): string | null {
	const endstops = machineStore.model.sensors.endstops;
	if (axisIndex >= 0 && axisIndex < endstops.length && endstops[axisIndex]?.triggered) {
		return settingsStore.darkTheme ? "bg-light-green-darken-3" : "bg-light-green-lighten-4";
	}
	return null;
}

function formatProbeValues(values: Array<number>): string | number {
	if (values.length === 1) {
		return values[0];
	}
	return `${values[0]} (${values.slice(1).join(", ")})`;
}

function probeSpanClasses(probe: Probe, isFirstItem: boolean): Array<string> {
	const result: Array<string> = [];
	if (!isFirstItem) {
		result.push("ml-2");
	}
	if (!isPrinting(machineStore.model.state.status) && probe.value.length > 0) {
		if (probe.value[0] >= probe.threshold) {
			result.push(settingsStore.darkTheme ? "bg-red-darken-3" : "bg-red-lighten-4");
		} else if (probe.value[0] > probe.threshold * 0.9) {
			result.push(settingsStore.darkTheme ? "bg-orange-darken-2" : "bg-orange-lighten-4");
		}
	}
	return result;
}
</script>
