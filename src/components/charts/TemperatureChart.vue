<style scoped>
.card, .content {
	width: 100%;
	height: 100% !important;
}

.content {
	flex: 1;
}
</style>

<template>
	<v-card no-body class="card">
		<v-layout column class="content">
			<v-card-title class="base-panel-title pb-0">
				<v-icon>show_chart</v-icon> {{ $t('panel.tempChart.caption') }}
			</v-card-title>

			<v-card-text class="content pt-0 pl-2 pr-2 pb-0">
				<canvas ref="chart"></canvas>
			</v-card-text>
		</v-layout>
	</v-card>
</template>

<script>
'use strict'

import Chart from 'chart.js'
import { mapGetters, mapState } from 'vuex'

const sampleInterval = 1000			// ms
const maxSamples = 600				// 10min
const defaultMaxTemperature = 300	// degC

function defaultSeries() {
	return {
		times: [],
		series: [
			{
				label: "Bed",
				fill: false,
				backgroundColor: '#1976d2',
				borderColor: '#1976d2',
				borderWidth: 2,
				data: [],
				pointRadius: 0,
				pointHitRadius: 3,
				showLine: true
			},
			{
				label: "T0",
				fill: false,
				backgroundColor: '#f44336',
				borderColor: '#f44336',
				borderWidth: 2,
				data: [],
				pointRadius: 0,
				pointHitRadius: 3,
				showLine: true
			},
			{
				label: "T1",
				fill: false,
				backgroundColor: '#4caf50',
				borderColor: '#4caf50',
				borderWidth: 2,
				data: [],
				pointRadius: 0,
				pointHitRadius: 3,
				showLine: true
			}
		]
	}
}

const datasets = {
	default: defaultSeries()
}

let storeSubscribed = false, instances = []

export default {
	computed: {
		...mapState(['selectedMachine']),
		...mapGetters('machine', ['maxHeaterTemperature']),
		...mapState('machine', ['heat', 'tools'])
	},
	data() {
		return {
			chart: null,
			options: {
				animation: {
					duration: 0,				// general animation time
				},
				elements: {
					line: {
						tension: 0				// Disables bezier curves
					}
				},
				hover: {
					animationDuration: 0,		// duration of animations when hovering an item
				},
				maintainAspectRatio: false,
				responsiveAnimationDuration: 0, // animation duration after a resize
				scales: {
					xAxes: [
						{
							gridLines: {
								display: true
							},
							ticks: {
								max: new Date()
							},
							time: {
								unit: 'minute'
							},
							type: 'time'
						}
					],
					yAxes: [
						{
							stacked: true,
							gridLines: {
								display: true
							},
							ticks: {
								min: 0,
								max: defaultMaxTemperature,
								stepSize: 50
							}
						}
					]
				},
				tooltips: {
					mode: 'index'
				}
			}
		}
	},
	methods: {
		update() {
			this.options.scales.yAxes[0].ticks.max = this.maxHeaterTemperature || defaultMaxTemperature;
			this.options.scales.xAxes[0].ticks.max = new Date();
			this.chart.update();
		}
	},
	mounted() {
		// Create new chart instance
		this.chart = Chart.Line(this.$refs.chart, {
			options: this.options,
			data: {
				labels: datasets.default.times,
				datasets: datasets.default.series
			}
		});

		// Keep track of updates
		instances.push(this);
		if (!storeSubscribed) {
			this.$store.subscribe((mutation, state) => {
				const result = /machines\/(.+)\/update/.exec(mutation.type);
				if (result) {
					// See if we can record more temperature samples
					const machine = result[1], dataset = datasets[machine], now = new Date();
					if (dataset && now - dataset.times[dataset.times.length - 1] > sampleInterval) {
						dataset.times.push(now);
						state.machines[machine].heat.heaters.forEach(function(heater, heaterIndex) {
							if (heater && heaterIndex < dataset.series.length) {
								dataset.series[heaterIndex].data.push(heater.current);
							}
						});

						// Cut off last points if necessary
						dataset.times.shift();
						dataset.series.forEach(function(series) {
							if (series.data.length > maxSamples) {
								series.data.shift();
							}
						});

						// Tell instances to update
						instances.forEach(instance => instance.update());
					}
				} else {
					const result = /machines\/(.+)\/unregister/.exec(mutation.type);
					if (result) {
						const machine = result[1];
						if (datasets[machine] !== undefined) {
							delete datasets[machine];
						}
					}
				}
			});
			storeSubscribed = true;
		}

		window.datasets = datasets;
	},
	beforeDestroy() {
		const that = this;
		instances = instances.filter(instance => instance !== that);
	},
	watch: {
		selectedMachine(machine) {
			// Get valid dataset and fill it with some dummy data
			if (datasets[machine] === undefined) {
				datasets[machine] = defaultSeries();

				let t = new Date() - sampleInterval * maxSamples;
				for (let i = 0; i < maxSamples; i++) {
					datasets[machine].times.push(t);
					datasets[machine].series.forEach(series => series.data.push(NaN));
					t += sampleInterval;
				}
			}

			// Enable new dataset, works only by recreating the chart
			this.chart.config.data = {
				labels: datasets[machine].times,
				datasets: datasets[machine].series
			};
			this.chart.update();
		}
	}
}
</script>
