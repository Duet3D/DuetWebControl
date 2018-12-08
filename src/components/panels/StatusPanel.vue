<style scoped>
table > tr > th:first-child {
	width: 1%;
}
table > tr > td {
	text-align: center;
}

a:not(:hover) {
	color: inherit;
	text-decoration: none;
}

hr {
	margin-top: 5px;
	margin-bottom: 5px;
}
.content {
	padding-bottom: 3px !important;
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

		<v-card-text class="pa-0 content">
			<table class="ml-2 mr-2">
				<tr>
					<!-- TODO allow easy switching to machine position by clicking on the caption or so -->
					<th rowspan="2">
						<a href="#" @click.prevent="displayToolPosition = !displayToolPosition">
							{{ $t(displayToolPosition ? 'panel.status.toolPosition' : 'panel.status.machinePosition') }}
						</a>
					</th>
					<template v-for="(axis, index) in move.axes">
						<th v-if="axis.visible" :key="index">
							{{ axis.letter }}
						</th>
					</template>
				</tr>
				<tr>
					<template v-for="(axis, index) in move.axes">
						<td v-if="axis.visible" :key="index">
							{{ $display(displayToolPosition ? move.drives[index].position : axis.machinePosition, index === 2 ? 3 : 2) }}
						</td>
					</template>
				</tr>
			</table>

			<v-divider></v-divider>

			<table class="ml-2 mr-2">
				<tr>
					<th rowspan="2">{{ $t('panel.status.extruders') }}</th>
					<th v-for="(extruder, index) in move.extruders" :key="index">
						{{ $t('panel.status.extruderDrive', [index]) }}
					</th>
				</tr>
				<tr>
					<td v-for="(extruder, index) in move.extruders" :key="index">
						{{ $display(move.drives[index + move.axes.length].position, 1) }}
					</td>
				</tr>
			</table>

			<v-divider></v-divider>

			<table class="ml-2 mr-2">
				<tr>
					<th rowspan="2">{{ $t('panel.status.speeds') }}</th>
					<th>{{ $t('panel.status.requestedSpeed') }}</th>
					<th>{{ $t('panel.status.topSpeed') }}</th>
				</tr>
				<tr>
					<td>{{ $display(move.currentMove.requestedSpeed, 0, 'mm/s') }}</td>
					<td>{{ $display(move.currentMove.topSpeed, 0, 'mm/s') }}</td>
				</tr>
			</table>

			<v-divider></v-divider>

			<table class="ml-2 mr-2">
				<tr>
					<th rowspan="2">{{ $t('panel.status.sensors') }}</th>
					<th v-if="sensors.probes.length">{{ $tc('panel.status.probe', sensors.probes.length) }}</th>
				</tr>
				<tr>
					<td v-if="sensors.probes.length">
						<span v-for="(probe, index) in sensors.probes" class="pa-1 probe-span" :class="{ 'ml-2' : (index && sensors.probes.length > 1), 'warning' : probeIsClose(probe), 'error' : probeIsTriggered(probe) }">
							{{ $display(probe.value, 0) }}
							<template v-if="probe.secondaryValues.length"> ({{ $display(probe.secondaryValues, 0) }})</template>
						</span>
					</td>
				</tr>
			</table>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

import { mapState, mapGetters } from 'vuex'

export default {
	computed: {
		...mapState('machine', ['move', 'sensors', 'state']),
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
