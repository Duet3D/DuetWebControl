<style scoped>
table {
	width: 100%;
}
table > tr > th:first-child {
	width: 1%;
}
table > tr > td {
	text-align: center;
}

hr {
	margin-top: 5px;
	margin-bottom: 5px;
}
.status-container {
	padding-bottom: 3px;
}
</style>

<template>
	<base-panel icon="info">
		<template slot="title">
			<span>{{ $t('panel.status.caption') }}</span>
			<v-spacer></v-spacer>
			<span v-if="operation.mode">{{ $t('panel.status.mode', [operation.mode]) }}</span>
		</template>

		<div class="status-container">
			<table>
				<tr>
					<!-- TODO allow easy switching to machine position by clicking on the caption or so -->
					<th rowspan="2">{{ $t('panel.status.toolPosition') }}</th>
					<th v-for="(axis, index) in move.axes" :key="index">
						{{ axis.letter }}
					</th>
				</tr>
				<tr>
					<td v-for="(axis, index) in move.axes" :key="index">
						{{ $display(move.drives[index].position) }}
					</td>
				</tr>
			</table>
			<v-divider></v-divider>
			<table>
				<tr>
					<th rowspan="2">{{ $t('panel.status.extruders') }}</th>
					<th v-for="(extruder, index) in move.extruders" :key="index">
						{{ $t('panel.status.extruderDrive', [index]) }}
					</th>
				</tr>
				<tr>
					<td v-for="(extruder, index) in move.extruders" :key="index">
						{{ $display(move.drives[index + move.axes.length].position) }}
					</td>
				</tr>
			</table>
			<v-divider></v-divider>
			<table>
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
			<table>
				<tr>
					<th rowspan="2">{{ $t('panel.status.sensors') }}</th>
					<th>Z-Probe</th>
				</tr>
				<tr>
					<td>
						{{ $display(probeValues) }}
						<template v-if="probeSecondaryValues.some(value => value !== undefined)">{{ $display(probeSecondaryValues) }}</template>
					</td>
				</tr>
			</table>
		</div>
	</base-panel>
</template>

<script>
'use strict'

import { mapGetters, mapState } from 'vuex'

export default {
	computed: {
		...mapGetters('machine', ['probeValues', 'probeSecondaryValues']),
		...mapState('machine', ['move', 'operation']),
		mode() {
			// TODO: Return undefined or localized string for machine mode (FFF/CNC/Laser)
		}
	}
	// TODO: Add watcher for number of axes+extruder drives
}
</script>
