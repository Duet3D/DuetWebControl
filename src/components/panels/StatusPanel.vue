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

a:not(:hover) {
	color: inherit;
}

.content span,
.content strong {
	padding-left: 8px;
	padding-right: 8px;
}

.probe-span {
	border-radius: 5px;
	white-space: nowrap;
}

.probe-span:not(:last-child) {
	margin-right: 8px;
}
</style>

<template>
	<v-card>
		<v-card-title class="py-2">
			<v-icon small class="mr-1">mdi-information</v-icon>
			{{ $t("panel.status.caption") }}

			<v-spacer />

			<status-label v-if="status" />

			<v-spacer />

			<span v-if="machineMode">
				{{ $t("panel.status.mode", [machineMode.toUpperCase()]) }}
			</span>
		</v-card-title>

		<v-card-text v-if="sensorsPresent || (visibleAxes.length + extruders.length > 0)"
					 class="px-0 pt-0 pb-2 content text-xs-center">
			<!-- Axis Positions -->
			<template v-if="visibleAxes.length > 0">
				<v-row no-gutters class="flex-nowrap">
					<v-col tag="strong" class="category-header">
						<a href="javascript:void(0)" @click="displayToolPosition = !displayToolPosition">
							{{ $t(displayToolPosition ? "panel.status.toolPosition" : "panel.status.machinePosition") }}
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
									{{ $displayAxisPosition(axis, !displayToolPosition) }}
								</span>
							</v-col>
						</v-row>
					</v-col>
				</v-row>
			</template>

			<!-- Extruders -->
			<template v-if="extruders.length > 0">
				<v-divider v-if="visibleAxes.length > 0" class="my-2" />

				<v-row align-content="center" no-gutters class="flex-nowrap">
					<v-col tag="strong" class="category-header">
						{{ $t("panel.status.extruders") }}
					</v-col>

					<v-col>
						<v-row align-content="center" no-gutters>
							<v-col v-for="(extruder, index) in extruders" :key="index"
								   class="d-flex flex-column align-center">
								<strong>
									{{ $t("panel.status.extruderDrive", [index]) }}
									<v-icon v-if="isFilamentSensorPresent(index)" small>
										{{ isFilamentPresent(index) ? "mdi-check" : "mdi-window-close" }}
									</v-icon>
								</strong>
								<span>
									{{ $display(extruder.position, 1) }}
								</span>
							</v-col>
						</v-row>
					</v-col>
				</v-row>
			</template>

			<!-- Speeds -->
			<template v-if="isFinite(requestedSpeed) || isFinite(topSpeed)">
				<v-divider v-if="visibleAxes.length + extruders.length > 0" class="my-2" />

				<v-row align-content="center" no-gutters class="flex-nowrap">
					<v-col tag="strong" class="category-header">
						{{ $t("panel.status.speeds") }}
					</v-col>

					<v-col>
						<v-row align-content="center" no-gutters>
							<v-col v-if="isFinite(requestedSpeed)"
								   class="d-flex flex-column align-center">
								<strong>
									{{ $t("panel.status.requestedSpeed") }}
								</strong>
								<span>
									{{ $displayMoveSpeed(requestedSpeed) }}
								</span>
							</v-col>

							<v-col v-if="isFinite(topSpeed)"
								   class="d-flex flex-column align-center">
								<strong>
									{{ $t("panel.status.topSpeed") }}
								</strong>
								<span>
									{{ $displayMoveSpeed(topSpeed) }}
								</span>
							</v-col>
							
							<v-col v-if="isFinite(extrusionRate) && isFFF"
								   class="d-flex flex-column align-center">
								<strong>
									<a href="javascript:void(0)" @click="displayVolumetricFlow = !displayVolumetricFlow">
										{{ displayVolumetricFlow ? $t("panel.status.volumetricFlow") : $t("panel.status.extrusionRate") }}
									</a>
								</strong>
								<span>
									{{ displayVolumetricFlow ? $display(volumetricFlow, 1, "mm³/s") : $displayMoveSpeed(extrusionRate) }}
								</span>
							</v-col>
						</v-row>
					</v-col>
				</v-row>
			</template>

			<!-- Sensors -->
			<template v-if="sensorsPresent">
				<v-divider v-if="(axes.length + extruders.length > 0) || isFinite(requestedSpeed) || isFinite(topSpeed)"
						   class="my-2" />

				<v-row align-content="center" no-gutters class="flex-nowrap">
					<v-col tag="strong" class="category-header">
						{{ $t("panel.status.sensors") }}
					</v-col>

					<v-col>
						<v-row align-content="center" justify="center" no-gutters>
							<template v-if="mainboard !== null">
								<v-col v-if="mainboard.vIn !== null" class="d-flex flex-column align-center">
									<strong>
										{{ $t('panel.status.vIn') }}
									</strong>
									<v-tooltip bottom>
										<template #activator="{ on }">
											<span v-on="on" class="text-no-wrap">
												{{ $display(mainboard.vIn.current, 1, 'V') }}
											</span>
										</template>

										{{ $t('panel.status.minMax', [$display(mainboard.vIn.min, 1, 'V'), $display(mainboard.vIn.max, 1, 'V')]) }}
									</v-tooltip>
								</v-col>

								<v-col v-if="mainboard.v12 !== null" class="d-flex flex-column align-center">
									<strong>
										{{ $t('panel.status.v12') }}
									</strong>
									<v-tooltip bottom>
										<template #activator="{ on }">
											<span v-on="on" class="text-no-wrap">
												{{ $display(mainboard.v12.current, 1, 'V') }}
											</span>
										</template>

										{{ $t('panel.status.minMax', [$display(mainboard.v12.min, 1, 'V'), $display(mainboard.v12.max, 1, 'V')]) }}
									</v-tooltip>
								</v-col>

								<v-col v-if="mainboard.mcuTemp !== null" class="d-flex flex-column align-center">
									<strong class="text-no-wrap">
										{{ $t('panel.status.mcuTemp') }}
									</strong>
									<v-tooltip bottom>
										<template #activator="{ on }">
											<span v-on="on" class="text-no-wrap">
												{{ $display(mainboard.mcuTemp.current, 1, '°C') }}
											</span>
										</template>

										{{ $t('panel.status.minMax', [$display(mainboard.mcuTemp.min, 1, '°C'), $display(mainboard.mcuTemp.max, 1, '°C')]) }}
									</v-tooltip>
								</v-col>
							</template>

							<v-col v-if="fanRPM.length > 0" class="d-flex flex-column align-center">
								<strong>
									{{ $t("panel.status.fanRPM") }}
								</strong>

								<div class="d-flex flex-row">
									<template v-for="(item, index) in fanRPM">
										<template v-if="index !== 0">
											,
										</template>
										<span :key="index" :title="item.name" class="mx-0">
											{{ item.rpm }}
										</span>
									</template>
								</div>
							</v-col>

							<v-col v-if="validProbes.length > 0" class="d-flex flex-column align-center">
								<strong>
									{{ $tc("panel.status.probe", validProbes.length) }}
								</strong>
								<div class="d-flex-inline">
									<span v-for="(probe, index) in validProbes" :key="index" class="pa-1 probe-span"
										  :class="probeSpanClasses(probe, index === 0)">
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
			<v-alert :value="true" type="info">
				{{ $t("panel.status.noStatus") }}
			</v-alert>
		</v-card-text>
	</v-card>
</template>

<script lang="ts">
import { Axis, Board, FilamentMonitorEnableMode, MachineMode, Probe, ProbeType } from "@duet3d/objectmodel";
import { mapState } from "pinia";
import Vue from "vue";

import { useMachineStore } from "@/store/machine";
import { useSettingsStore } from "@/store/settings";
import { useUiStore } from "@/store/ui";
import { isPrinting } from "@/utils/enums";

export default Vue.extend({
	computed: {
		...mapState(useMachineStore, {
			isConnected: state => state.isConnected,
			axes: state => state.model.move.axes,
			boards: state => state.model.boards,
			currentTool: state => state.model.state.currentTool,
			endstops: state => state.model.sensors.endstops,
			extruders: state => state.model.move.extruders,
			extrusionRate: state => state.model.move.currentMove.extrusionRate,
			fans: state => state.model.fans,
			filamentMonitors: state => state.model.sensors.filamentMonitors,
			machineMode: state => state.model.state.machineMode,
			probes: state => state.model.sensors.probes,
			requestedSpeed: state => state.model.move.currentMove.requestedSpeed,
			status: state => state.model.state.status,
			tools: state => state.model.tools,
			topSpeed: state => state.model.move.currentMove.topSpeed
		}),
		...mapState(useSettingsStore, ["darkTheme", "dashboardMode",]),
		...mapState(useUiStore, ["isFFF"]),
		volumetricFlow(): number {
			if (this.currentTool >= 0 && this.currentTool < this.tools.length) {
				const selectedTool = this.tools[this.currentTool];
				if (selectedTool !== null) {
					// Get the average extruder diameter x mix ratio
					let numExtruders = 0, filamentArea = 0;
					for (let i = 0; i < selectedTool.extruders.length; i++) {
						const extruderIndex = selectedTool.extruders[i];
						if (extruderIndex >= 0 && extruderIndex < this.extruders.length) {
							const extruder = this.extruders[extruderIndex];
							if (extruder !== null) {
								filamentArea += selectedTool.mix[i] * (Math.PI * Math.pow((extruder.filamentDiameter / 2), 2));
								numExtruders++;
							}
						}
					}

					// Compute volumetric flow
					if (numExtruders > 0) {
						filamentArea /= numExtruders;
						return filamentArea * this.extrusionRate;
					}
				}
			}
			return NaN;
		},
		fanRPM(): Array<{ name: string, rpm: number }> {
			return this.fans
				.filter(fan => (fan !== null) && (fan.rpm >= 0))
				.map((fan, index) => ({
					name: fan!.name || this.$t("panel.fan.fan", [index]),
					rpm: fan!.rpm
				}), this);
		},
		validProbes(): Array<Probe> {
			return this.probes.filter(probe => (probe !== null) && (probe.type !== ProbeType.none)) as Array<Probe>;
		},
		mainboard(): Board | null {
			return this.boards.find(board => !board.canAddress) ?? null;
		},
		sensorsPresent(): boolean {
			return ((this.mainboard !== null) && ((this.mainboard.vIn !== null) || (this.mainboard.v12 !== null) || (this.mainboard.mcuTemp !== null))) ||
					(this.fanRPM.length > 0) || (this.validProbes.length > 0);
		},
		visibleAxes(): Array<Axis> {
			return this.axes.filter(axis => axis.visible);
		}
	},
	data() {
		return {
			displayToolPosition: true,
			displayVolumetricFlow: true
		}
	},
	methods: {
		axisSpanClasses(axisIndex: number) {
			if (axisIndex >= 0 && axisIndex < this.endstops.length && this.endstops[axisIndex]?.triggered) {
				return this.darkTheme ? "light-green darken-3" : "light-green lighten-4";
			}
			return null;
		},
		isFilamentSensorPresent(extruderIndex: number) {
			if (extruderIndex >= 0 && extruderIndex < this.filamentMonitors.length) {
				const filamentMonitor = this.filamentMonitors[extruderIndex];
				if (filamentMonitor !== null) {
					return (filamentMonitor.enableMode !== FilamentMonitorEnableMode.disabled) && typeof (filamentMonitor as any)["filamentPresent"] === "boolean";
				}
			}
			return false;
		},
		isFilamentPresent(extruderIndex: number) {
			if (extruderIndex >= 0 && extruderIndex < this.filamentMonitors.length) {
				const filamentMonitor = this.filamentMonitors[extruderIndex];
				return (filamentMonitor !== null) && (this.filamentMonitors[extruderIndex] as any).filamentPresent;
			}
			return false;
		},
		formatProbeValues(values: Array<number>) {
			if (values.length === 1) {
				return values[0];
			}
			return `${values[0]} (${values.slice(1).join(", ")})`;
		},
		isValidProbe(probe: Probe | null) {
			return (probe !== null) && (probe.type !== ProbeType.none);
		},
		probeSpanClasses(probe: Probe, isFirstItem: boolean) {
			let result = [];
			if (!isFirstItem) {
				result.push("ml-2");
			}
			if (!isPrinting(this.status) && probe.value.length > 0) {
				if (probe.value[0] >= probe.threshold) {
					result.push("red");
					result.push(this.darkTheme ? "darken-3" : "lighten-4");
				} else if (probe.value[0] > probe.threshold * 0.9) {
					result.push("orange");
					result.push(this.darkTheme ? "darken-2" : "lighten-4");
				}
			}
			return result;
		}
	}
});
</script>
