<style scoped>
.equal-width {
	flex-basis: 0;
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
			<v-icon small class="mr-1">info</v-icon> {{ $t('panel.status.caption') }}

			<v-spacer></v-spacer>

			<status-label v-if="this.state.status"></status-label>

			<v-spacer></v-spacer>

			<span v-if="state.mode">{{ $t('panel.status.mode', [state.mode]) }}</span>
		</v-card-title>

		<v-card-text class="px-0 pt-0 pb-2 content text-xs-center">
			<v-layout column class="content-layout">
				<v-flex>
					<v-layout row align-center>
						<v-flex tag="strong" class="category-header">
							<a href="#" @click.prevent="displayToolPosition = !displayToolPosition">
								{{ $t(displayToolPosition ? 'panel.status.toolPosition' : 'panel.status.machinePosition') }}
							</a>
						</v-flex>

						<v-flex>
							<v-layout row wrap>
								<v-flex v-for="(axis, index) in move.axes" :key="index" grow class="equal-width">
									<v-layout column>
										<v-flex v-if="axis.visible" tag="strong">
											{{ axis.letter }}
										</v-flex>
										<v-flex v-if="axis.visible" tag="span">
											{{ displayAxisPosition(axis, index) }}
										</v-flex>
									</v-layout>
								</v-flex>
							</v-layout>
						</v-flex>
					</v-layout>
				</v-flex>

				<v-divider class="my-2"></v-divider>

				<v-flex>
					<v-layout row align-center>
						<v-flex tag="strong" class="category-header">
							{{ $t('panel.status.extruders') }}
						</v-flex>

						<v-flex>
							<v-layout row wrap>
								<v-flex v-for="(extruder, index) in move.extruders" :key="index" class="equal-width">
									<v-layout column>
										<v-flex tag="strong">
											{{ $t('panel.status.extruderDrive', [index]) }}
										</v-flex>
										<v-flex tag="span">
											{{ $display(move.drives[index + move.axes.length].position, 1) }}
										</v-flex>
									</v-layout>
								</v-flex>
							</v-layout>
						</v-flex>
					</v-layout>
				</v-flex>

				<v-divider class="my-2"></v-divider>

				<v-flex>
					<v-layout row align-center>
						<v-flex tag="strong" class="category-header">
							{{ $t('panel.status.speeds') }}
						</v-flex>

						<v-flex>
							<v-layout row wrap>
								<v-flex class="equal-width">
									<v-layout column>
										<v-flex tag="strong">
											{{ $t('panel.status.requestedSpeed') }}
										</v-flex>
										<v-flex tag="span">
											{{ $display(move.currentMove.requestedSpeed, 0, 'mm/s') }}
										</v-flex>
									</v-layout>
								</v-flex>

								<v-flex class="equal-width">
									<v-layout column>
										<v-flex tag="strong">
											{{ $t('panel.status.topSpeed') }}
										</v-flex>
										<v-flex tag="span">
											{{ $display(move.currentMove.topSpeed, 0, 'mm/s') }}
										</v-flex>
									</v-layout>
								</v-flex>
							</v-layout>
						</v-flex>
					</v-layout>
				</v-flex>

				<v-divider class="my-2"></v-divider>

				<v-flex>
					<v-layout row align-center>
						<v-flex tag="strong" class="category-header">
							{{ $t('panel.status.sensors') }}
						</v-flex>

						<v-flex>
							<v-layout row wrap>
								<v-flex v-if="electronics.vIn.current !== undefined">
									<v-layout column>
										<v-flex tag="strong">
											{{ $t('panel.status.vIn') }}
										</v-flex>

										<v-tooltip bottom>
											<template slot="activator">
												<v-flex tag="span">
													{{ $display(electronics.vIn.current, 1, 'V') }}
												</v-flex>
											</template>

											<span>
												{{ $t('panel.status.vInTitle', [$display(electronics.vIn.min, 1, 'V'), $display(electronics.vIn.max, 1, 'V')]) }}
											</span>
										</v-tooltip>
									</v-layout>
								</v-flex>

								<v-flex v-if="electronics.mcuTemp.current !== undefined">
									<v-layout column>
										<v-flex tag="strong">
											{{ $t('panel.status.mcuTemp') }}
										</v-flex>

										<v-tooltip bottom>
											<template slot="activator">
												<v-flex tag="span">
													{{ $display(electronics.mcuTemp.current, 1, 'C') }}
												</v-flex>
											</template>

											<span>
												{{ $t('panel.status.mcuTempTitle', [$display(electronics.mcuTemp.min, 1, 'C'), $display(electronics.mcuTemp.max, 1, 'C')]) }}
											</span>
										</v-tooltip>
									</v-layout>
								</v-flex>

								<v-flex v-if="sensors.probes.length">
									<v-layout column>
										<v-flex tag="strong">
											{{ $tc('panel.status.probe', sensors.probes.length) }}
										</v-flex>
										<v-flex tag="span">
											<span v-for="(probe, index) in sensors.probes" :key="index" class="pa-1 probe-span" :class="probeSpanClasses(probe, index)">
												{{ $display(probe.value, 0) }}
												<template v-if="probe.secondaryValues.length"> ({{ $display(probe.secondaryValues, 0) }})</template>
											</span>
										</v-flex>
									</v-layout>
								</v-flex>
							</v-layout>
						</v-flex>
					</v-layout>
				</v-flex>
			</v-layout>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

import { mapState, mapGetters } from 'vuex'

export default {
	computed: {
		...mapGetters(['isConnected']),
		...mapState('machine/model', ['electronics', 'move', 'sensors', 'state'])
	},
	data() {
		return {
			displayToolPosition: true
		}
	},
	methods: {
		displayAxisPosition(axis, index) {
			const position = this.displayToolPosition ? this.move.drives[index].position : axis.machinePosition;
			return (axis.letter === 'Z') ? this.$displayZ(position, false) : this.$display(position, 1);
		},
		probeSpanClasses(probe, index) {
			let result = [];
			if (index && this.sensors.probes.length > 1){
				result.push('ml-2');
			}
			if (!this.state.isPrinting) {
				if (probe.value >= probe.threshold) {
					result.push('error');
				} else if (probe.value > probe.threshold * 0.9) {
					result.push('warning');
				}
			}
			return result;
		}
	}
}
</script>
