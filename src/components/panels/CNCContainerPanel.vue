<style scoped>
.category-header {
	flex: 0 0 100px;
}
</style>

<template>
	<div>
		<v-row align="stretch" dense>
			<v-col cols="3" lg="2" md="2" order="1" order-lg="1" sm="4">
				<v-card class="justify-center fill-height">
					<v-card-title class="py-2 font-weight-bold">
						{{ $t("panel.status.caption") }}
					</v-card-title>
					<v-card-text>
						<status-label />
					</v-card-text>
				</v-card>
			</v-col>
			<v-col cols="12" lg="4" md="4" order="4" order-md="2" sm="12">
				<cnc-axes-position :machinePosition="true" class="fill-height" />
			</v-col>
			<v-col cols="5" lg="3" md="3" order="2" order-lg="3" sm="4">
				<v-card class="fill-height">
					<v-card-title class="py-2 font-weight-bold">
						{{ $t("panel.status.requestedSpeed") }}
					</v-card-title>
					<v-card-text>
						{{ $displayMoveSpeed(currentMove.requestedSpeed) }}
					</v-card-text>
				</v-card>
			</v-col>
			<v-col cols="4" lg="3" md="3" order="2" order-lg="4" sm="4">
				<v-card class="fill-height" order="5">
					<v-card-title class="py-2 font-weight-bold">
						{{ $t("panel.status.topSpeed") }}
					</v-card-title>
					<v-card-text>
						{{ $displayMoveSpeed(currentMove.topSpeed) }}
					</v-card-text>
				</v-card>
			</v-col>
			<v-col v-if="sensorsPresent" cols="12" order="6">
				<v-card class="fill-height">
					<v-card-title class="py-2" no-gutters>
						<v-col class="category-header" tag="strong">
							{{ $t("panel.status.sensors") }}
						</v-col>
					</v-card-title>
					<v-card-text>
						<v-row class="flex-nowrap" no-gutters>
							<v-col>
								<v-row align-content="center" justify="center" no-gutters>
									<v-col v-if="mainboard && (mainboard.vIn !== null)"
										   class="d-flex flex-column align-center">
										<strong>
											{{ $t("panel.status.vIn") }}
										</strong>
										<v-tooltip bottom>
											<template #activator="{ on }">
												<span class="text-no-wrap" v-on="on">
													{{ $display(mainboard.vIn.current, 1, "V") }}
												</span>
											</template>
											{{ $t("panel.status.minMax", [$display(mainboard.vIn.min, 1, "V"), $display(mainboard.vIn.max, 1, "V")]) }}
										</v-tooltip>
									</v-col>

									<v-col v-if="mainboard && (mainboard.v12 !== null)"
										   class="d-flex flex-column align-center">
										<strong>
											{{ $t("panel.status.v12") }}
										</strong>
										<v-tooltip bottom>
											<template #activator="{ on }">
												<span class="text-no-wrap" v-on="on">
													{{ $display(mainboard.v12.current, 1, "V") }}
												</span>
											</template>
											{{ $t("panel.status.minMax", [$display(mainboard.v12.min, 1, "V"), $display(mainboard.v12.max, 1, "V")]) }}
										</v-tooltip>
									</v-col>

									<v-col v-if="mainboard && mainboard.mcuTemp != null"
										   class="d-flex flex-column align-center">
										<strong class="text-no-wrap">
											{{ $t("panel.status.mcuTemp") }}
										</strong>
										<v-tooltip bottom>
											<template #activator="{ on }">
												<span class="text-no-wrap" v-on="on">
													{{ $display(mainboard.mcuTemp.current, 1, "°C") }}
												</span>
											</template>
											{{ $t("panel.status.minMax", [$display(mainboard.mcuTemp.min, 1, "°C"), $display(mainboard.mcuTemp.max, 1, "°C")]) }}
										</v-tooltip>
									</v-col>

									<v-col class="d-flex flex-column align-center" v-if="fanRPM.length">
										<strong>
											{{ $t("panel.status.fanRPM") }}
										</strong>

										<div class="d-flex flex-row">
											<template v-for="(item, index) in fanRPM">
												<template v-if="index !== 0">, </template>
												<span :key="index" :title="item.name" class="mx-0">{{ item.rpm }}</span>
											</template>
										</div>
									</v-col>

									<v-col class="d-flex flex-column align-center" v-if="probesPresent">
										<strong>
											{{ $tc("panel.status.probe", probes.length) }}
										</strong>
										<div class="d-flex-inline">
											<template v-for="(probe, index) in probes">
												<span v-if="probe !== null" :key="index"
													  :class="probeSpanClasses(probe, index)" class="pa-1 probe-span">
													{{ formatProbeValue(probe.value) }}
												</span>
											</template>
										</div>
									</v-col>

									<v-col v-for="(sensor, index) in analogSensors" :key="index"
										   class="d-flex flex-column align-center">
										<strong>
											{{ sensor.name }}
										</strong>
										<div class="d-flex-inline">
											<span class="pa-1 probe-span">
												{{ sensor.lastReading }}
											</span>
										</div>
									</v-col>
								</v-row>
							</v-col>
						</v-row>
					</v-card-text>
				</v-card>
			</v-col>
			<v-col cols="12" order="7">
				<cnc-axes-position :machinePosition="false" class="fill-height" />
			</v-col>
		</v-row>
	</div>
</template>

<script lang="ts">
import Vue from "vue";

import { ProbeType, AnalogSensorType, Board, CurrentMove, Probe, AnalogSensor } from "@duet3d/objectmodel";

import store from "@/store";
import { isPrinting } from "@/utils/enums";

export default Vue.extend({
	computed: {
		currentMove(): CurrentMove { return store.state.machine.model.move.currentMove; },
		mainboard(): Board | undefined { return store.state.machine.model.boards.find(board => !board.canAddress); },
		fanRPM(): Array<{ name: string, rpm: number }> {
			return store.state.machine.model.fans
				.filter((fan) => (fan !== null) && fan.rpm >= 0)
				.map(
					(fan, index) => ({
						name: fan!.name || this.$t("panel.fan.fan", [index]),
						rpm: fan!.rpm,
					}),
					this
				);
		},
		probesPresent() { return store.state.machine.model.sensors.probes.some((probe) => probe && probe.type !== ProbeType.none); },
		probes(): Array<Probe | null> { return store.state.machine.model.sensors.probes; },
		sensorsPresent(): boolean { return (this.mainboard && ((this.mainboard.vIn !== null) || (this.mainboard.v12 !== null) || (this.mainboard.mcuTemp !== null))) || this.fanRPM.length > 0 || this.probesPresent; },
		analogSensors(): Array<AnalogSensor> {
			return store.state.machine.model.sensors.analog.filter((sensor) => (sensor !== null) && sensor.name && (sensor.type !== AnalogSensorType.unknown)) as Array<AnalogSensor>;
		}
	},
	methods: {
		formatProbeValue(values: Array<number>) {
			if (values.length === 1) {
				return values[0];
			}
			return `${values[0]} (${values.slice(1).join(", ")})`;
		},
		probeSpanClasses(probe: Probe, index: number) {
			let result: Array<string> = [];
			if (index && store.state.machine.model.sensors.probes.length > 1) {
				result.push("ml-2");
			}
			if (!isPrinting(store.state.machine.model.state.status) && probe.value.length > 0) {
				if (probe.value[0] >= probe.threshold) {
					result.push("red");
					result.push(store.state.settings.darkTheme ? "darken-3" : "lighten-4");
				} else if (probe.value[0] > probe.threshold * 0.9) {
					result.push("orange");
					result.push(store.state.settings.darkTheme ? "darken-2" : "lighten-4");
				}
			}
			return result;
		}
	}
});
</script>
