<style scoped>
.content {
	position: relative;
	min-height: 480px;
}

.content > canvas {
	position: absolute;
	height: auto;
}
</style>

<template>
	<v-col>
		<v-row class="ma-2">
			<v-row class="pa-2">
				Accelerometer ID: {{ session.test.accel }} Axes: {{ session.test.axis }}
				Samples: {{ session.test.param.numSamples }}
				Start: {{ session.test.param.startPosition }} Stop: {{ session.test.param.stopPosition }}
			</v-row>

			<v-row>
				<v-data-table
					v-model="recordList"
					class="py-0"
					:headers="recordTable"
					:items="session.records"
					:items-per-page="20"
					show-select
				></v-data-table>
			</v-row>

			<v-row>
				<v-btn v-show="true" :disabled="recordList.length == 0"  color="warning" @click="deleteRecordList">
					{{ $t('plugins.inputShaping.delete') }}
				</v-btn>
			</v-row>
		</v-row>

		<v-row class="ma-2">
			<v-row class="content ma-2" @mousedown.passive="mouseDown" @mouseup.passive="mouseUp">
				<canvas ref="chart"></canvas>
			</v-row>

			<v-row>
				<v-col>
					<v-btn-toggle>
						<v-btn v-show="true" color="primary" @click="updateChartFft">
							<v-icon class="mr-2">mdi-arrow-right</v-icon> {{ $t('plugins.inputShaping.fft') }}
						</v-btn>
						<v-btn v-show="true" color="success" @click="updateChart">
							<v-icon class="mr-2">mdi-arrow-left</v-icon> {{ $t('plugins.inputShaping.time') }}
						</v-btn>
					</v-btn-toggle>
				</v-col>
				<v-col>
					<v-icon class="">mdi-filter-outline</v-icon>
						{{ $t('plugins.inputShaping.filter') }}:
				</v-col>
				<v-col>
					<v-row>
						<v-checkbox
							v-for="axis in this.model.move.axes"
							:key="axis.letter" :value=axis.letter :label="axis.letter"
							v-model="checkedAxis"
							hide-details
						></v-checkbox>
					</v-row>
				</v-col>
			</v-row>
		</v-row>

	</v-col>
</template>

<script>
'use strict';

import Chart from 'chart.js';

import { mapState, mapGetters } from 'vuex';

export default {
	props: [ 'value' ],
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
				{ text: 'id', value: 'id' },
				{ text: 'date', value: 'date' },
				{ text: 'samples', value: 'samples' },
				{ text: 'samplingRate', value: 'samplingRate' },
				{ text: 'overflows', value: 'overflows' },
				{ text: 'config.type', value: 'config.type' },
				{ text: 'config.frequency', value: 'config.frequency' },
				{ text: 'config.damping', value: 'config.damping' },
				{ text: 'config.minAcceleration', value: 'config.minAcceleration' },
			],

			wideBand: false,
			checkedAxis: [],

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
		session() {
			return this.value;
		}
	},
	watch: {
		language() {
			// TODO update chart
			this.chart.options.scales.xAxes[0].scaleLabel.labelString = this.$t(this.displaySamples ? 'plugins.inputShaping.samples' : 'plugins.inputShaping.frequency');
			this.chart.options.scales.yAxes[0].scaleLabel.labelString = this.$t(this.displaySamples ? 'plugins.inputShaping.accelerations' : 'plugins.inputShaping.amplitudes');
			this.chart.update();
		},
		checkedAxis() {
			this.updateVisibility();
		},
		'recordList': {
			handler() {
				this.updateChartFft();
			}
		},
		'session.records': {
			handler(value) {
				this.recordList = value;
			}
		}
	},
	methods: {
		getLineColor(index) {
			const colors = [
				'#4dc9f6',
				'#f67019',
				'#f53794',
				'#537bc4',
				'#acc236',
				'#166a8f',
				'#00a950',
				'#58595b',
				'#8549ba'
			];
			return colors[index % colors.length];
		},
		deleteRecord(name) {
			console.log("deleting", name);
			this.session.removeRecord(name);
			this.updateChart();
		},
		deleteRecordList() {
			this.recordList.forEach(rec => this.deleteRecord(rec.name));
		},
		updateVisibility() {
			this.chart.data.datasets.forEach(dataset => {
				let res = false;
				console.log(dataset.label, res = this.checkedAxis.find(elem => elem == dataset.label.slice(-1)));
				dataset.hidden = res ? false : true;
				console.log(dataset.label, res, dataset.hidden);
			});
			this.chart.update();
		},
		testChart() {

			// chart update code works on record
			let data = new Array(100);
			for (let i = 0; i < data.length; i++) {
				if (i == 0)
					data[i] = 1;
				else
					data[i] = i + data[i - 1];
			}

			console.log("Test data", data);

			// TODO is there a better source as sampling rate than a record
			this.chart.data.datasets = [];

			const dataset = {
				hidden: false,
				borderColor: this.getLineColor(0),
				backgroundColor: this.getLineColor(0),
				pointBorderWidth: 0.25,
				pointRadius: 2,
				borderWidth: 1.25,
				data: data,
				fill: false,
				label: 'test data'
			};

			this.chart.data.datasets.push(dataset);

			let labels = new Array(data.length);
			for (let i = 0; i < labels.length; i++) {
				labels[i] = i;
			}

			this.chart.data.labels = labels;
			console.log("Test labels", this.chart.data.labels);

			this.chart.options.tooltips.callbacks.title = items => this.$t('plugins.inputShaping.sampleTooltip', [items[0].index]);

			this.chart.update();
		},

		updateChart() {

			// chart update code works on record
			let labels = new Array(this.session.test.param.numSamples);
			for (let i = 0; i < labels.length; i++) {
				labels[i] = i;
			}
			this.chart.data.labels = labels;
			console.log("Acc labels", this.chart.data.labels);

			this.chart.data.datasets = [];

			this.recordList.forEach((rec, recIndex) => {

				console.log("updating chart for", recIndex, rec);

				// TODO is there a better source as sampling rate than a record
				if (recIndex === 0)
					this.samplingRate = rec.samplingRate;

				rec.axis.forEach((axis, index, arr) => {
					const dataset = {
						hidden: this.checkedAxis.find(elem => elem === axis.name) < 0 ? true : false,
						borderColor: this.getLineColor(index + recIndex * arr.length),
						backgroundColor: this.getLineColor(index + recIndex * arr.length),
						pointBorderWidth: 0.25,
						pointRadius: 2,
						borderWidth: 1.25,
						data: axis.acceleration,
						fill: false,
						label: rec.name + ' ' + axis.name
					};

					this.chart.data.datasets.push(dataset);

				});
			});

			this.chart.options.tooltips.callbacks.title = items => this.$t('plugins.inputShaping.sampleTooltip', [items[0].index]);

			// Render the chart and apply sample rate
			this.start = this.chart.config.options.scales.xAxes[0].ticks.min = 0;
			this.end = this.chart.config.options.scales.xAxes[0].ticks.max = this.session.test.param.numSamples;

			this.chart.update();

			this.updateVisibility();

			console.log("start", this.start, "end", this.end, "sampling rate", this.samplingRate);
		},
		updateChartFft() {

			console.log("updateChartFft");

			this.chart.data.labels = this.session.frequencies;
			console.log("FFT labels", this.chart.data.labels);

			this.chart.options.tooltips.callbacks.title = items => this.$t('plugins.inputShaping.frequencyTooltip', [this.session.frequencies[items[0].index].toFixed(2)]);

			this.chart.data.datasets = [];

			this.recordList.forEach((rec, recIndex) => {

				console.log("updating chartfft for", recIndex, rec);

				if (recIndex === 0)
					this.samplingRate = rec.samplingRate;

				rec.axis.forEach((axis, index, arr) => {
					const dataset = {
						hidden: this.checkedAxis.find(elem => elem === axis.name) < 0 ? true : false,
						borderColor: this.getLineColor(index + recIndex * arr.length),
						backgroundColor: this.getLineColor(index + recIndex * arr.length),
						pointBorderWidth: 0.25,
						pointRadius: 2,
						borderWidth: 1.25,
						data: axis.amplitudes,
						fill: false,
						label: rec.name + ' ' + axis.name
					};

					if (recIndex == 0)
						console.log("name", rec.name, "acc", axis.acceleration, "amp", axis.amplitudes);

					this.chart.data.datasets.push(dataset);
				});
			});

			console.log("number of datasets complete", this.chart.data.datasets.length);
			console.log("number of labels complete", this.chart.data.labels.length);

			// Render the chart and apply sample rate
			this.start = this.chart.config.options.scales.xAxes[0].ticks.min = 0;
			this.end = this.chart.config.options.scales.xAxes[0].ticks.max = this.session.frequencies.length;

			this.chart.update();
			this.updateVisibility();
		},
		redraw() {
			this.chart.update();
		},
		applyDarkTheme(active) {
			const ticksColor = active ? '#FFF' : '#666';
			this.chart.config.options.scales.xAxes[0].ticks.minor.fontColor = ticksColor;
			this.chart.config.options.scales.xAxes[0].ticks.major.fontColor = ticksColor;
			this.chart.config.options.scales.yAxes[0].ticks.major.fontColor = ticksColor;
			this.chart.config.options.scales.yAxes[0].ticks.minor.fontColor = ticksColor;

			const gridLineColor = active ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';
			this.chart.config.options.scales.xAxes[0].gridLines.color = gridLineColor;
			this.chart.config.options.scales.yAxes[0].gridLines.color = gridLineColor;
			this.chart.config.options.scales.yAxes[0].gridLines.zeroLineColor = gridLineColor;

			this.chart.update();
		},
		mouseDown(e) {
			if (this.displaySamples) {
				const activePoints = this.chart.getElementsAtEventForMode(e, 'nearest', { intersect: false });
				this.dragStart = (activePoints && activePoints.length > 0) ? activePoints[0]._index : null;
			}
		},
		mouseUp(e) {
			const activePoints = this.chart.getElementsAtEventForMode(e, 'nearest', { intersect: false });
			if (this.dragStart !== null && activePoints) {
				const dragEnd = activePoints[0]._index;
				if (this.dragStart != dragEnd) {
					this.start = this.chart.config.options.scales.xAxes[0].ticks.min = Math.min(this.dragStart, dragEnd);
					this.end = this.chart.config.options.scales.xAxes[0].ticks.max = Math.max(this.dragStart, dragEnd);
					this.chart.update();
				}
				this.dragStart = null;
			}

			// $nextTick is too quick for chart.js
			setTimeout((function() {
				let datasetVisible = false;
				for (let i = 0; i < this.chart.data.datasets.length; i++) {
					if (this.chart.isDatasetVisible(i)) {
						datasetVisible = true;
						break;
					}
				}
				this.datasetVisible = datasetVisible;
			}).bind(this), 100);
		},
	},
	mounted() {

		// initially select all axis
		this.checkedAxis = this.model.move.axes.map(e => e.letter);

		// Prepare chart
		const that = this;
		this.options = {
			maintainAspectRatio: false,
			tooltips: {
				mode: 'index',
				intersect: false,
				callbacks: {
					title: items => that.$t('plugins.inputShaping.sampleTooltip', [items[0].index])
				}
			},
			hover: {
				mode: 'nearest',
				intersect: true
			},
			scales: {
				xAxes: [
					{
						display: true,
						scaleLabel: {
							display: true,
							labelString: this.$t('plugins.inputShaping.samples')
						},

						gridLines: {
							color: 'rgba(0,0,0,0.2)',
							display: true
						},
						ticks: {
							minor: {
								fontColor: 'rgba(0,0,0,0.87)',
								fontFamily: 'Roboto,sans-serif'
							},
							major: {
								fontColor: 'rgba(0,0,0,0.87)',
								fontFamily: 'Roboto,sans-serif'
							},
							beginAtZero: true
						}
					}
				],
				yAxes: [
					{
						display: true,
						scaleLabel: {
							display: true,
							labelString: this.$t('plugins.inputShaping.accelerations')
						},

						gridLines: {
							color: 'rgba(0,0,0,0.87)',
							zeroLineColor: 'rgba(0,0,0,0.2)',
							display: true
						},
						ticks: {
							minor: {
								fontColor: 'rgba(0,0,0,0.87)',
								fontFamily: 'Roboto,sans-serif'
							},
							major: {
								fontColor: 'rgba(0,0,0,0.87)',
								fontFamily: 'Roboto,sans-serif'
							}
						}
					}
				]
			}
		};

		// Create the chart
		this.chart = Chart.Line(this.$refs.chart, {
			options: this.options,
			data: {
				datasets: []
			}
		});
		this.applyDarkTheme(this.darkTheme);

	}
}
</script>
