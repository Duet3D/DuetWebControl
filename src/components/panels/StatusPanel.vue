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
	margin-top: 3px;
	margin-bottom: 3px;
}
</style>

<template>
	<base-panel icon="info-circle">
		<template slot="title">{{ $t('panel.status.caption') }}</template>
		<table>
			<tr>
				<!-- TODO allow easy switching to machine position by clicking on the caption or so -->
				<th rowspan="2">{{ $t('panel.status.toolPosition') }}</th>
				<th v-for="(position, axis) in machine.axes" :key="axis">
					{{ axis.toUpperCase() }}
				</th>
			</tr>
			<tr>
				<td v-for="(position, axis) in machine.axes" :key="axis">
					{{ isNaN(position) ? $t('generic.novalue') : position.toFixed(2) }}
				</td>
			</tr>
		</table>
		<v-divider></v-divider>
		<table>
			<tr>
				<th rowspan="2">{{ $t('panel.status.extruders') }}</th>
				<th v-for="(position, extruder) in machine.extruders" :key="extruder">
					{{ $t('panel.status.extruderDrive', [extruder]) }}
				</th>
			</tr>
			<tr>
				<td v-for="(position, extruder) in machine.extruders" :key="extruder">
					{{ isNaN(position) ? $t('generic.novalue') : position.toFixed(2) }}
				</td>
			</tr>
		</table>
		<v-divider></v-divider>
		<table>
			<tr>
				<th rowspan="2">{{ $t('panel.status.sensors') }}</th>
				<th>Z-Probe</th>
			</tr>
			<tr>
				<td>{{ isNaN(machine.probe.value) ? $t('generic.novalue') : machine.probe.value }}</td>
			</tr>
		</table>
	</base-panel>
</template>

<script>
'use strict'

import { mapGetters } from 'vuex'

export default {
	computed: mapGetters(['machine'])
}
</script>
