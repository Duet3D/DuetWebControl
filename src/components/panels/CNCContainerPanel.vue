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
					<v-card-title class="py-2">
						<strong>Status</strong>
					</v-card-title>
					<v-card-text>
						<status-label v-if="status"></status-label>
					</v-card-text>
				</v-card>
			</v-col>
			<v-col cols="12" lg="4" md="4" order="4" order-md="2" sm="12">
				<cnc-axes-position :machinePosition="true" class="fill-height"></cnc-axes-position>
			</v-col>
			<v-col cols="5" lg="3" md="3" order="2" order-lg="3" sm="4">
				<v-card class="fill-height">
					<v-card-title class="py-2">
						<strong>Requested Speed</strong>
					</v-card-title>
					<v-card-text>{{ displaySpeed(move.currentMove.requestedSpeed) }}</v-card-text>
				</v-card>
			</v-col>
			<v-col cols="4" lg="3" md="3" order="2" order-lg="4" sm="4">
				<v-card class="fill-height" order="5">
					<v-card-title class="py-2">
						<strong>Top Speed</strong>
					</v-card-title>
					<v-card-text>{{ displaySpeed(move.currentMove.topSpeed) }}</v-card-text>
				</v-card>
			</v-col>
			<v-col cols="12" order="6" v-if="sensorsPresent">
				<v-card class="fill-height">
					<v-card-title class="py-2" no-gutters>
						<v-col class="category-header" tag="strong">{{ $t('panel.status.sensors') }}</v-col>
					</v-card-title>
					<v-card-text>
						<v-row class="flex-nowrap" no-gutters>
							<v-col>
								<v-row align-content="center" justify="center" no-gutters>
									<v-col class="d-flex flex-column align-center" v-if="boards.length && boards[0].vIn.current > 0">
										<strong>{{ $t('panel.status.vIn') }}</strong>
										<v-tooltip bottom>
											<template #activator="{ on }">
												<span class="text-no-wrap" v-on="on">{{ $display(boards[0].vIn.current, 1, 'V') }}</span>
											</template>
											{{ $t('panel.status.minMax', [$display(boards[0].vIn.min, 1, 'V'), $display(boards[0].vIn.max, 1, 'V')]) }}
										</v-tooltip>
									</v-col>

									<v-col class="d-flex flex-column align-center" v-if="boards.length && boards[0].v12 !== null && boards[0].v12.current > 0">
										<strong>{{ $t('panel.status.v12') }}</strong>
										<v-tooltip bottom>
											<template #activator="{ on }">
												<span class="text-no-wrap" v-on="on">{{ $display(boards[0].v12.current, 1, 'V') }}</span>
											</template>
											{{ $t('panel.status.minMax', [$display(boards[0].v12.min, 1, 'V'), $display(boards[0].v12.max, 1, 'V')]) }}
										</v-tooltip>
									</v-col>

									<v-col class="d-flex flex-column align-center" v-if="boards.length && boards[0].mcuTemp.current > -273">
										<strong class="text-no-wrap">{{ $t('panel.status.mcuTemp') }}</strong>
										<v-tooltip bottom>
											<template #activator="{ on }">
												<span class="text-no-wrap" v-on="on">{{ $display(boards[0].mcuTemp.current, 1, '°C') }}</span>
											</template>
											{{ $t('panel.status.minMax', [$display(boards[0].mcuTemp.min, 1, '°C'), $display(boards[0].mcuTemp.max, 1, '°C')]) }}
										</v-tooltip>
									</v-col>

									<v-col class="d-flex flex-column align-center" v-if="fanRPM.length">
										<strong>{{ $t('panel.status.fanRPM') }}</strong>

										<div class="d-flex flex-row">
											<template v-for="(item, index) in fanRPM">
												<template v-if="index !== 0">,</template>
												<span :key="index" :title="item.name" class="mx-0">{{ item.rpm }}</span>
											</template>
										</div>
									</v-col>

									<v-col class="d-flex flex-column align-center" v-if="probesPresent">
										<strong>{{ $tc('panel.status.probe', sensors.probes.length) }}</strong>
										<div class="d-flex-inline">
											<span :class="probeSpanClasses(probe, index)" :key="index" class="pa-1 probe-span" v-for="(probe, index) in probes">{{ formatProbeValue(probe.value) }}</span>
										</div>
									</v-col>

									<v-col class="d-flex flex-column align-center" v-for="(analog, index) in analogs" :key="index" >
										<strong>{{analog.name}}</strong>
										<div class="d-flex-inline">
											<span class="pa-1 probe-span" >{{ analog.lastReading }}</span>
										</div>
									</v-col>

								</v-row>
							</v-col>
						</v-row>
					</v-card-text>
				</v-card>
			</v-col>
			<v-col cols="12" order="7">
				<cnc-axes-position :machinePosition="false" class="fill-height"></cnc-axes-position>
			</v-col>
		</v-row>
	</div>
</template>

<script>
import {mapState} from 'vuex';
import {ProbeType, isPrinting, AnalogSensorType} from '../../store/machine/modelEnums.js';
import { UnitOfMeasure } from '../../store/settings.js';
export default {
	computed: {
		...mapState('settings', ['displayUnits']),
		...mapState('machine/model', {
			move: (state) => state.move,
			machineMode: (state) => state.state.machineMode,
			status: (state) => state.state.status,
			sensors: (state) => state.sensors,
			boards: (state) => state.boards,
			fans: (state) => state.fans,
		}),
		visibleAxes() {
			return this.move.axes.filter((axis) => axis.visible);
		},
		fanRPM() {
			return this.fans
				.filter((fan) => fan && fan.rpm >= 0)
				.map(
					(fan, index) => ({
						name: fan.name || this.$t('panel.fan.fan', [index]),
						rpm: fan.rpm,
					}),
					this
				);
		},
		probesPresent() {
			return this.sensors.probes.some((probe) => probe && probe.type !== ProbeType.none);
		},
		probes() {
			return this.sensors.probes.filter((probe) => probe !== null && probe.type !== ProbeType.none);
		},
		sensorsPresent() {
			return (this.boards.length && this.boards[0].vIn.current > 0) || (this.boards.length && this.boards[0].v12.current > 0) || (this.boards.length && this.boards[0].mcuTemp.current > -273) || this.fanRPM.length !== 0 || this.probesPresent;
		},
		analogsPresent() {
			return this.sensors.analog.some((analog) => analog && analog.type !== AnalogSensorType.unknown && analog.type !== null);
		},
		analogs() {
			return this.sensors.analog.filter((analog) => analog !== null && analog.name !== null && analog.name !== '' && analog.type !== AnalogSensorType.unknown && analog.type !== null);
		},
	},
	methods: {
		displaySpeed(speed) {
			if(this.displayUnits == UnitOfMeasure.imperial) {
				return this.$display(speed*60/25.4, 1, this.$t('panel.settingsAppearance.unitInchSpeed'));	// to ipm
			}
			return this.$display(speed, 1,  this.$t('panel.settingsAppearance.unitMmSpeed'));
		},
		formatProbeValue(values) {
			if (values.length === 1) {
				return values[0];
			}
			return `${values[0]} (${values.slice(1).join(', ')})`;
		},
		probeSpanClasses(probe, index) {
			let result = [];
			if (index && this.sensors.probes.length > 1) {
				result.push('ml-2');
			}
			if (!isPrinting(this.stats) && probe.value !== null) {
				if (probe.value >= probe.threshold) {
					result.push('red');
					result.push(this.darkTheme ? 'darken-3' : 'lighten-4');
				} else if (probe.value > probe.threshold * 0.9) {
					result.push('orange');
					result.push(this.darkTheme ? 'darken-2' : 'lighten-4');
				}
			}
			return result;
		},
	},
};
</script>
