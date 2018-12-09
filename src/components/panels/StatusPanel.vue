<style scoped>
div.equal-width {
	flex-basis: 0;
}

div.category-header {
	flex: 0 0 90px;
}
div.category-header,
div.header {
	font-weight: 700;
	padding-left: 8px;
	padding-right: 8px;
}
div.content-layout {
	text-align: center;
}

a:not(:hover) {
	color: inherit;
	text-decoration: none;
}

.probe-span {
	border-radius: 5px;
}
</style>

<template>
	<v-card v-auto-size>
		<v-card-title class="py-2">
			<v-icon small class="mr-1">info</v-icon> {{ $t('panel.status.caption') }}

			<v-spacer></v-spacer>

			<status-label v-if="this.state.status !== undefined"></status-label>

			<v-spacer></v-spacer>

			<span v-if="state.mode">{{ $t('panel.status.mode', [state.mode]) }}</span>
		</v-card-title>

		<v-card-text class="px-0 pt-0 pb-2 content">
			<v-layout column class="content-layout">
				<v-flex>
					<v-layout row align-center wrap>
						<v-flex class="category-header">
							<a href="#" @click.prevent="displayToolPosition = !displayToolPosition">
								{{ $t(displayToolPosition ? 'panel.status.toolPosition' : 'panel.status.machinePosition') }}
							</a>
						</v-flex>

						<v-flex v-for="(axis, index) in move.axes" :key="index" grow class="equal-width">
							<v-layout column>
								<v-flex v-if="axis.visible" class="header">
									{{ axis.letter }}
								</v-flex>
								<v-flex v-if="axis.visible">
									{{ $display(displayToolPosition ? move.drives[index].position : axis.machinePosition, index === 2 ? 3 : 2) }}
								</v-flex>
							</v-layout>
						</v-flex>
					</v-layout>
				</v-flex>

				<v-divider class="my-2"></v-divider>

				<v-flex>
					<v-layout row align-center wrap>
						<v-flex class="category-header">
							{{ $t('panel.status.extruders') }}
						</v-flex>

						<v-flex v-for="(extruder, index) in move.extruders" :key="index" class="equal-width">
							<v-layout column>
								<v-flex class="header">
									{{ $t('panel.status.extruderDrive', [index]) }}
								</v-flex>
								<v-flex>
									{{ $display(move.drives[index + move.axes.length].position, 1) }}
								</v-flex>
							</v-layout>
						</v-flex>
					</v-layout>
				</v-flex>

				<v-divider class="my-2"></v-divider>

				<v-flex>
					<v-layout row align-center wrap>
						<v-flex class="category-header">
							{{ $t('panel.status.speeds') }}
						</v-flex>

						<v-flex class="equal-width">
							<v-layout column>
								<v-flex class="header">
									{{ $t('panel.status.requestedSpeed') }}
								</v-flex>
								<v-flex>
									{{ $display(move.currentMove.requestedSpeed, 0, 'mm/s') }}
								</v-flex>
							</v-layout>
						</v-flex>

						<v-flex class="equal-width">
							<v-layout column>
								<v-flex class="header">
									{{ $t('panel.status.topSpeed') }}
								</v-flex>
								<v-flex>
									{{ $display(move.currentMove.topSpeed, 0, 'mm/s') }}
								</v-flex>
							</v-layout>
						</v-flex>
					</v-layout>
				</v-flex>

				<v-divider class="my-2"></v-divider>

				<v-flex>
					<v-layout row align-center wrap>
						<v-flex class="category-header">
							{{ $t('panel.status.sensors') }}
						</v-flex>

						<v-flex v-if="electronics.vIn.current !== undefined">
							<v-layout column>
								<v-flex class="header">
									{{ $t('panel.status.vIn') }}
								</v-flex>

								<v-tooltip bottom>
									<template slot="activator">
										<v-flex>
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
								<v-flex class="header">
									{{ $t('panel.status.mcuTemp') }}
								</v-flex>

								<v-tooltip bottom>
									<template slot="activator">
										<v-flex>
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
								<v-flex class="header">
									{{ $tc('panel.status.probe', sensors.probes.length) }}
								</v-flex>
								<v-flex>
									<span v-for="(probe, index) in sensors.probes" class="pa-1 probe-span" :class="{ 'ml-2' : (index && sensors.probes.length > 1), 'warning' : probeIsClose(probe), 'error' : probeIsTriggered(probe) }">
										{{ $display(probe.value, 0) }}
										<template v-if="probe.secondaryValues.length"> ({{ $display(probe.secondaryValues, 0) }})</template>
									</span>
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
		...mapState('machine', ['electronics', 'move', 'sensors', 'state']),
		...mapGetters(['isConnected'])
	},
	data() {
		return {
			displayToolPosition: true
		}
	},
	methods: {
		probeIsClose(probe) { return this.state.status !== 'P' && probe.value > (probe.threshold * 0.9) && probe.value < probe.threshold; },
		probeIsTriggered(probe) { return this.state.status !== 'P' && probe.value >= probe.threshold; }
	}
}
</script>
