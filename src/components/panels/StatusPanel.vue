<style scoped>
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

			<status-label v-if="model.state.status" />

			<v-spacer />

			<span v-if="model.state.machineMode">
				{{ $t("panel.status.mode", [model.state.machineMode.toUpperCase()]) }}
			</span>
		</v-card-title>

		<v-card-text v-if="sensorsPresent || (visibleAxes.length + model.move.extruders.length > 0)"
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
								<strong>
									{{ axis.letter }}
								</strong>
								<span>
									{{ $displayAxisPosition(axis, !displayToolPosition) }}
								</span>
							</v-col>
						</v-row>
					</v-col>
				</v-row>
			</template>

			<!-- Extruders -->
			<template v-if="model.move.extruders.length > 0">
				<v-divider v-if="visibleAxes.length > 0" class="my-2" />

				<v-row align-content="center" no-gutters class="flex-nowrap">
					<v-col tag="strong" class="category-header">
						{{ $t("panel.status.extruders") }}
					</v-col>

					<v-col>
						<v-row align-content="center" no-gutters>
							<v-col v-for="(extruder, index) in model.move.extruders" :key="index"
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
			<template v-if="isFinite(model.move.currentMove.requestedSpeed) || isFinite(model.move.currentMove.topSpeed)">
				<v-divider v-if="visibleAxes.length + model.move.extruders.length > 0" class="my-2" />

				<v-row align-content="center" no-gutters class="flex-nowrap">
					<v-col tag="strong" class="category-header">
						{{ $t("panel.status.speeds") }}
					</v-col>

					<v-col>
						<v-row align-content="center" no-gutters>
							<v-col v-if="isFinite(model.move.currentMove.requestedSpeed)"
								   class="d-flex flex-column align-center">
								<strong>
									{{ $t("panel.status.requestedSpeed") }}
								</strong>
								<span>
									{{ $displayMoveSpeed(model.move.currentMove.requestedSpeed) }}
								</span>
							</v-col>

							<v-col v-if="isFinite(model.move.currentMove.topSpeed)"
								   class="d-flex flex-column align-center">
								<strong>
									{{ $t("panel.status.topSpeed") }}
								</strong>
								<span>
									{{ $displayMoveSpeed(model.move.currentMove.topSpeed) }}
								</span>
							</v-col>
						</v-row>
					</v-col>
				</v-row>
			</template>

			<!-- Sensors -->
			<template v-if="sensorsPresent">
				<v-divider v-if="(model.move.axes.length + model.move.extruders.length > 0) || isFinite(model.move.currentMove.requestedSpeed) || isFinite(model.move.currentMove.topSpeed)"
						   class="my-2" />

				<v-row align-content="center" no-gutters class="flex-nowrap">
					<v-col tag="strong" class="category-header">
						{{ $t("panel.status.sensors") }}
					</v-col>

					<v-col>
						<v-row align-content="center" justify="center" no-gutters>

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
import ObjectModel, { Axis, Board, Probe, ProbeType } from "@duet3d/objectmodel";
import Vue from "vue";

import store from "@/store";
import { isPrinting } from "@/utils/enums";

export default Vue.extend({
	computed: {
		isConnected(): boolean {
			return store.getters["isConnected"];
		},
		model(): ObjectModel {
			return store.state.machine.model;
		},
		fanRPM(): Array<{ name: string, rpm: number }> {
			return store.state.machine.model.fans
				.filter(fan => (fan !== null) && (fan.rpm >= 0))
				.map((fan, index) => ({
					name: fan!.name || this.$t("panel.fan.fan", [index]),
					rpm: fan!.rpm
				}), this);
		},
		validProbes(): Array<Probe> {
			return store.state.machine.model.sensors.probes.filter((probe) => (probe !== null) && (probe.type !== ProbeType.none)) as Array<Probe>;
		},
		mainboard(): Board | null {
			return this.model.boards.find(board => !board.canAddress) ?? null;
		},
		sensorsPresent(): boolean {
			return ((this.mainboard !== null) && ((this.mainboard.vIn !== null) || (this.mainboard.v12 !== null) || (this.mainboard.mcuTemp !== null))) ||
				(this.fanRPM.length > 0) || (this.validProbes.length > 0);
		},
		visibleAxes(): Array<Axis> {
			return this.model.move.axes.filter(axis => axis.visible);
		},
		darkTheme(): boolean {
			return store.state.settings.darkTheme;
		}
	},
	data() {
		return {
			displayToolPosition: true
		}
	},
	methods: {
		isFilamentSensorPresent(extruderIndex: number) {
			return (extruderIndex >= 0) && (extruderIndex < this.model.sensors.filamentMonitors.length) &&
				(this.model.sensors.filamentMonitors[extruderIndex] !== null) && this.model.sensors.filamentMonitors[extruderIndex]!.enabled &&
				(typeof (this.model.sensors.filamentMonitors[extruderIndex] as any).filamentPresent === "boolean");
		},
		isFilamentPresent(extruderIndex: number) {
			return (this.model.sensors.filamentMonitors[extruderIndex] as any).filamentPresent;
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
			if (!isPrinting(this.model.state.status) && probe.value.length > 0) {
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
