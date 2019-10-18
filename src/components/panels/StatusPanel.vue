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

			<status-label v-if="this.state.status"></status-label>

			<v-spacer></v-spacer>

			<span v-if="state.mode">{{ $t('panel.status.mode', [state.mode]) }}</span>
		</v-card-title>

		<v-card-text class="px-0 pt-0 pb-2 content text-xs-center" v-show="sensorsPresent || (move.axes.length + move.extruders.length)">
			<!-- Axis Positions -->
			<template v-if="move.axes.length">
				<v-row no-gutters class="flex-nowrap">
					<v-col tag="strong" class="category-header">
						<a href="javascript:void(0)" @click="displayToolPosition = !displayToolPosition">
							{{ $t(displayToolPosition ? 'panel.status.toolPosition' : 'panel.status.machinePosition') }}
						</a>
					</v-col>

					<v-col>
						<v-row align-content="center" no-gutters>
							<v-col v-for="(axis, index) in move.axes.filter(axis => axis.visible)" :key="index" class="d-flex flex-column align-center">
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
				<v-divider v-show="move.axes.length" class="my-2"></v-divider>

				<v-row align-content="center" no-gutters class="flex-nowrap">
					<v-col tag="strong" class="category-header">
						{{ $t('panel.status.extruders') }}
					</v-col>

					<v-col>
						<v-row align-content="center" no-gutters>
					<v-col v-for="(extruder, index) in move.extruders" :key="index" class="d-flex flex-column align-center">
						<strong>
							{{ $t('panel.status.extruderDrive', [index]) }}
						</strong>
						<span>
							{{ displayExtruderPosition(extruder, index) }}
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
							{{ $display(move.currentMove.requestedSpeed, 0, 'mm/s') }}
						</span>
					</v-col>

					<v-col v-if="isNumber(move.currentMove.topSpeed)" class="d-flex flex-column align-center">
						<strong>
							{{ $t('panel.status.topSpeed') }}
						</strong>
						<span>
							{{ $display(move.currentMove.topSpeed, 0, 'mm/s') }}
						</span>
					</v-col>
						</v-row>
					</v-col>
				</v-row>
			</template>

			<!-- Sensors -->
			<template v-show="sensorsPresent">
				<v-divider v-show="move.axes.length || move.extruders.length || isNumber(move.currentMove.requestedSpeed) || isNumber(move.currentMove.topSpeed)" class="my-2"></v-divider>

				<v-row align-content="center" no-gutters class="flex-nowrap">
					<v-col tag="strong" class="category-header">
						{{ $t('panel.status.sensors') }}
					</v-col>

					<v-col>
						<v-row align-content="center" justify="center" no-gutters>
							<v-col v-if="electronics.vIn.current !== null" class="d-flex flex-column align-center">
								<strong>
									{{ $t('panel.status.vIn') }}
								</strong>
								<v-tooltip bottom>
									<template #activator="{ on }">
										<span v-on="on" class="text-no-wrap">
											{{ $display(electronics.vIn.current, 1, 'V') }}
										</span>
									</template>

									{{ $t('panel.status.vInTitle', [$display(electronics.vIn.min, 1, 'V'), $display(electronics.vIn.max, 1, 'V')]) }}
								</v-tooltip>
							</v-col>

							<v-col v-if="electronics.mcuTemp.current !== null" md="auto" class="d-flex flex-column align-center">
								<strong>
									{{ $t('panel.status.mcuTemp') }}
								</strong>
								<v-tooltip bottom>
									<template #activator="{ on }">
										<span v-on="on" class="text-no-wrap">
											{{ $display(electronics.mcuTemp.current, 1, 'C') }}
										</span>
									</template>

									{{ $t('panel.status.mcuTempTitle', [$display(electronics.mcuTemp.min, 1, 'C'), $display(electronics.mcuTemp.max, 1, 'C')]) }}
								</v-tooltip>
							</v-col>

							<v-col v-if="fanRPM.length" class="d-flex flex-column align-center">
								<strong>
									{{ $t('panel.status.fanRPM') }}
								</strong>
								<span>
									{{ fanRPM.join(', ') }}
								</span>
							</v-col>

							<v-col v-if="sensors.probes.length" class="d-flex flex-column align-center">
								<strong>
									{{ $tc('panel.status.probe', sensors.probes.length) }}
								</strong>
								<div class="d-flex-inline">
									<span v-for="(probe, index) in sensors.probes" :key="index" class="pa-1 probe-span" :class="probeSpanClasses(probe, index)">
										{{ $display(probe.value, 0) }}
										<template v-if="probe.secondaryValues.length"> ({{ $display(probe.secondaryValues, 0) }})</template>
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

export default {
	computed: {
		...mapState('settings', ['darkTheme']),
		...mapState('machine/model', ['electronics', 'fans', 'move', 'sensors', 'state']),
		...mapGetters(['isConnected']),
		...mapGetters('machine/model', ['isPrinting']),
		fanRPM() { return this.fans.map(fan => fan.rpm).filter(rpm => rpm !== null); },
		sensorsPresent() {
			return (this.electronics.vIn.current !== null) || (this.electronics.mcuTemp.current !== null) || this.fanRPM.length || (this.sensors.probes.length);
		}
	},
	data() {
		return {
			displayToolPosition: true
		}
	},
	methods: {
		displayAxisPosition(axis) {
			let position = NaN;
			if (this.displayToolPosition) {
				if (axis.drives.length > 0) {
					position = this.move.drives[axis.drives[0]].position;
				}
			} else {
				position = axis.machinePosition;
			}
			return (axis.letter === 'Z') ? this.$displayZ(position, false) : this.$display(position, 1);
		},
		displayExtruderPosition(extruder) {
			const position = (extruder.drives.length > 0) ? this.move.drives[extruder.drives[0]].position : NaN;
			return this.$display(position, 1);
		},
		probeSpanClasses(probe, index) {
			let result = [];
			if (index && this.sensors.probes.length > 1) {
				result.push('ml-2');
			}
			if (!this.isPrinting && probe.value !== null) {
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
