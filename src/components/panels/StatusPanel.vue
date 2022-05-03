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
			<v-icon small class="mr-1">mdi-information</v-icon> {{ $t('panel.status.caption') }}

			<v-spacer></v-spacer>

			<status-label v-if="status"></status-label>

			<v-spacer></v-spacer>

			<span v-if="machineMode">{{ $t('panel.status.mode', [machineMode.toUpperCase()]) }}</span>
		</v-card-title>

		<v-card-text class="px-0 pt-0 pb-2 content text-xs-center" v-show="sensorsPresent || (visibleAxes.length + move.extruders.length)">
			<!-- Axis Positions -->
			<template v-if="visibleAxes.length">
				<v-row no-gutters class="flex-nowrap">
					<v-col tag="strong" class="category-header">
						<a href="javascript:void(0)" @click="displayToolPosition = !displayToolPosition">
							{{ $t(displayToolPosition ? 'panel.status.toolPosition' : 'panel.status.machinePosition') }}
						</a>
					</v-col>

					<v-col>
						<v-row align-content="center" no-gutters>
							<v-col v-for="(axis, index) in visibleAxes" :key="index" class="d-flex flex-column align-center">
								<strong>
									{{ axis.letter }}
								</strong>
								<span>
									{{ displayAxisPosition(axis, index) }}
								</span>
							</v-col>
						</v-row>
					</v-col>
				</v-row>
			</template>

			<!-- Extruders -->
			<template v-if="move.extruders.length">
				<v-divider v-show="visibleAxes.length" class="my-2"></v-divider>

				<v-row align-content="center" no-gutters class="flex-nowrap">
					<v-col tag="strong" class="category-header">
						{{ $t('panel.status.extruders') }}
					</v-col>

					<v-col>
						<v-row align-content="center" no-gutters>
							<v-col v-for="(extruder, index) in move.extruders" :key="index" class="d-flex flex-column align-center">
								<strong>
									{{ $t('panel.status.extruderDrive', [index]) }}
									<v-icon v-if="isFilamentSensorPresent(index)" small>
										{{ sensors.filamentSensors[index].filamentPresent ? 'mdi-check' : 'mdi-window-close' }}
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
			<template v-show="isNumber(move.currentMove.requestedSpeed) || isNumber(move.currentMove.topSpeed)">
				<v-divider v-show="move.axes.length + move.extruders.length" class="my-2"></v-divider>

				<v-row align-content="center" no-gutters class="flex-nowrap">
					<v-col tag="strong" class="category-header">
						{{ $t('panel.status.speeds') }}
					</v-col>

					<v-col>
						<v-row align-content="center" no-gutters>
					<v-col v-if="isNumber(move.currentMove.requestedSpeed)" class="d-flex flex-column align-center">
						<strong>
							{{ $t('panel.status.requestedSpeed') }}
						</strong>
						<span>
							{{ displaySpeed(move.currentMove.requestedSpeed) }}
						</span>
					</v-col>

					<v-col v-if="isNumber(move.currentMove.topSpeed)" class="d-flex flex-column align-center">
						<strong>
							{{ $t('panel.status.topSpeed') }}
						</strong>
						<span>
							{{ displaySpeed(move.currentMove.topSpeed) }}
						</span>
					</v-col>
						</v-row>
					</v-col>
				</v-row>
			</template>

			<!-- Sensors -->
			<template v-if="sensorsPresent">
				<v-divider v-show="move.axes.length || move.extruders.length || isNumber(move.currentMove.requestedSpeed) || isNumber(move.currentMove.topSpeed)" class="my-2"></v-divider>

				<v-row align-content="center" no-gutters class="flex-nowrap">
					<v-col tag="strong" class="category-header">
						{{ $t('panel.status.sensors') }}
					</v-col>

					<v-col>
						<v-row align-content="center" justify="center" no-gutters>
							<v-col v-if="boards.length && boards[0].vIn && boards[0].vIn.current > 0" class="d-flex flex-column align-center">
								<strong>
									{{ $t('panel.status.vIn') }}
								</strong>
								<v-tooltip bottom>
									<template #activator="{ on }">
										<span v-on="on" class="text-no-wrap">
											{{ $display(boards[0].vIn.current, 1, 'V') }}
										</span>
									</template>

									{{ $t('panel.status.minMax', [$display(boards[0].vIn.min, 1, 'V'), $display(boards[0].vIn.max, 1, 'V')]) }}
								</v-tooltip>
							</v-col>

							<v-col v-if="boards.length && boards[0].v12 && boards[0].v12.current > 0" class="d-flex flex-column align-center">
								<strong>
									{{ $t('panel.status.v12') }}
								</strong>
								<v-tooltip bottom>
									<template #activator="{ on }">
										<span v-on="on" class="text-no-wrap">
											{{ $display(boards[0].v12.current, 1, 'V') }}
										</span>
									</template>

									{{ $t('panel.status.minMax', [$display(boards[0].v12.min, 1, 'V'), $display(boards[0].v12.max, 1, 'V')]) }}
								</v-tooltip>
							</v-col>

							<v-col v-if="boards.length && boards[0].mcuTemp && boards[0].mcuTemp.current > -273" class="d-flex flex-column align-center">
								<strong class="text-no-wrap">
									{{ $t('panel.status.mcuTemp') }}
								</strong>
								<v-tooltip bottom>
									<template #activator="{ on }">
										<span v-on="on" class="text-no-wrap">
											{{ $display(boards[0].mcuTemp.current, 1, '°C') }}
										</span>
									</template>

									{{ $t('panel.status.minMax', [$display(boards[0].mcuTemp.min, 1, '°C'), $display(boards[0].mcuTemp.max, 1, '°C')]) }}
								</v-tooltip>
							</v-col>

							<v-col v-if="fanRPM.length" class="d-flex flex-column align-center">
								<strong>
									{{ $t('panel.status.fanRPM') }}
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

							<v-col v-if="probesPresent" class="d-flex flex-column align-center">
								<strong>
									{{ $tc('panel.status.probe', sensors.probes.length) }}
								</strong>
								<div class="d-flex-inline">
									<span v-for="(probe, index) in probes" :key="index" class="pa-1 probe-span" :class="probeSpanClasses(probe, index)">
										{{ formatProbeValue(probe.value) }}
									</span>
								</div>
							</v-col>
						</v-row>
					</v-col>
				</v-row>
			</template>
		</v-card-text>

		<v-card-text class="pa-0" v-show="!sensorsPresent && !(move.axes.length + move.extruders.length)">
			<v-alert :value="true" type="info">
				{{ $t('panel.status.noStatus') }}
			</v-alert>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

import { mapState, mapGetters } from 'vuex'

import { ProbeType, isPrinting } from '../../store/machine/modelEnums.js'
import { UnitOfMeasure } from '../../store/settings.js'

export default {
	computed: {
		...mapState('settings', ['darkTheme', 'displayUnits', 'decimalPlaces']),
		...mapState('machine/model', {
			boards: state => state.boards,
			fans: state => state.fans,
			move: state => state.move,
			machineMode: state => state.state.machineMode,
			sensors: state => state.sensors,
			status: state => state.state.status
		}),
		...mapGetters(['isConnected']),
		fanRPM() {
			return this.fans
				.filter(fan => fan && fan.rpm >= 0)
				.map((fan, index) => ({
					name: fan.name || this.$t('panel.fan.fan', [index]),
					rpm: fan.rpm
				}), this);
		},
		probesPresent() {
			return this.sensors.probes.some(probe => probe && probe.type !== ProbeType.none);
		},
		probes() {
			return this.sensors.probes.filter(probe => probe !== null && probe.type !== ProbeType.none);
		},
		sensorsPresent() {
			return ((this.boards.length && this.boards[0].vIn && this.boards[0].vIn.current > 0) ||
					(this.boards.length && this.boards[0].v12 && this.boards[0].v12.current > 0) ||
					(this.boards.length && this.boards[0].mcuTemp && this.boards[0].mcuTemp.current > -273) ||
					(this.fanRPM.length !== 0) ||
					(this.probesPresent));
		},
		visibleAxes() {
			return this.move.axes.filter(axis => axis.visible);
		}
	},
	data() {
		return {
			displayToolPosition: true
		}
	},
	methods: {
        displayAxisPosition(axis) {
            const position = (this.displayToolPosition ? axis.userPosition : axis.machinePosition) /
							((this.displayUnits === UnitOfMeasure.imperial) ? 25.4 : 1);
			return axis.letter === 'Z' ? this.$displayZ(position, false) : this.$display(position, this.decimalPlaces);
        },
		displaySpeed(speed) {
			if(this.displayUnits === UnitOfMeasure.imperial) {
				return this.$display(speed*60/25.4, 1, this.$t('panel.settingsAppearance.unitInchSpeed'));	// to ipm
			}
			return this.$display(speed, 1,  this.$t('panel.settingsAppearance.unitMmSpeed'));
		},
		isFilamentSensorPresent(extruderIndex) {
			return (extruderIndex < this.sensors.filamentMonitors.length) &&
					this.sensors.filamentMonitors[extruderIndex] &&
					this.sensors.filamentMonitors[extruderIndex].enabled &&
					this.sensors.filamentMonitors[extruderIndex].filamentPresent instanceof Boolean;
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
		}
	}
}
</script>
