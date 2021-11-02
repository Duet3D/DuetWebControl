<style scoped>
.content {
	position: relative;
	min-height: 480px;
	width: 80%;
}

.content > canvas {
	position: absolute;
	height: auto;
	width: auto;
}
</style>

<template>
	<div>
		<v-row class="pa-2">
			Accelerometer ID: {{ session.test.accel }} Samples: {{ session.test.param.numSamples }}<br>
			Axes: {{ session.test.axis }} Start: {{ session.test.param.startPosition }} Stop: {{ session.test.param.stopPosition }}
		</v-row>

		<v-row>
			<v-data-table
				v-model="recordList"
				class="py-0"
				:headers="recordTable"
				:items="session.records"
				:items-per-page="20"
				show-select
			>
				<template v-slot:item.axis[0].integral="{ item }">
						{{ item.axis[0].integral.toFixed(4) }}
				</template>
				<template v-slot:item.axis[1].integral="{ item }">
						{{ item.axis[1].integral.toFixed(4) }}
				</template>
				<template v-slot:item.axis[2].integral="{ item }">
						{{ item.axis[2].integral.toFixed(4) }}
				</template>
				<template v-slot:item.date="{ item }">
						{{ timestampToString(item.date) }}
				</template>
			</v-data-table>
		</v-row>

		<v-row>
			<v-col>
				<v-btn :disabled="recordList.length == 0"  color="warning" @click="deleteRecordList">
					<v-icon class="mr-2">mdi-trash-can-outline</v-icon> {{ $t('plugins.inputShaping.delete') }}
				</v-btn>
			</v-col>
		</v-row>

		<chart v-bind:records="recordList"></chart>

	</div>
</template>

<script>
'use strict';

import { mapState, mapGetters } from 'vuex';

export default {
	props: [ 'session' ],
	data() {
		return {
			recordList: [],
			recordTable: [
				{
					text: 'name',
					align: 'start',
					sortable: true,
					value: 'name',
				},
				{ text: 'type', value: 'config.type' },
				{ text: 'frequency', value: 'config.frequency' },
				{ text: 'damping', value: 'config.damping' },
				{ text: 'minAcceleration', value: 'config.minAcceleration' },
				{ text: 'x.integral', value: 'axis[0].integral' },
				{ text: 'y.integral', value: 'axis[1].integral' },
				{ text: 'z.integral', value: 'axis[2].integral' },
				{ text: 'config', value: 'config.id' },
				{ text: 'date', value: 'date' },
				{ text: 'samples', value: 'samples' },
				{ text: 'samplingRate', value: 'samplingRate' },
			],

			wideBand: false,

			// obsolete?
			loading: false,
			alertType: 'error',
			alertMessage: null,
			displaySamples: false,
			samplingRate: null,
		}
	},
	computed: {
		...mapState('settings', ['darkTheme']),
		...mapState('machine', ['model']),
		...mapGetters(['uiFrozen']),
	},
	watch: {
		language() {
			// TODO update chart
			this.chart.options.scales.xAxes[0].scaleLabel.labelString = this.$t(this.displaySamples ? 'plugins.inputShaping.samples' : 'plugins.inputShaping.frequency');
			this.chart.options.scales.yAxes[0].scaleLabel.labelString = this.$t(this.displaySamples ? 'plugins.inputShaping.accelerations' : 'plugins.inputShaping.amplitudes');
			this.chart.update();
		},
		'session.records': {
			handler(value) {
				this.recordList = value;
			}
		},
		session() {
			this.updateChart();
		}
	},
	methods: {
		timestampToString(value) {
			let date = new Date(value);

			return date.toLocaleString();
		},
		deleteRecord(name) {
			console.log("deleting", name);
			this.session.removeRecord(name);
			this.updateChart();
		},
		deleteRecordList() {
			this.recordList.forEach(rec => this.deleteRecord(rec.name));
		},
	},
	mounted() {
	}
}
</script>
