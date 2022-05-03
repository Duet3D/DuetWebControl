<style scoped>
.card {
	display: flex;
	flex-direction: column;
	width: 100%;
}

.content {
	position: relative;
}

.content > canvas {
	position: absolute;
}
</style>

<template>
	<v-card class="d-flex flex-column flex-grow-1">
		<v-card-title class="pt-2 pb-0">
			<v-icon class="mr-1">mdi-chart-timeline-variant</v-icon> {{ $t('chart.temperature.caption') }}
		</v-card-title>

		<v-card-text v-show="hasTemperaturesToDisplay" class="content flex-grow-1 px-2 py-0">
			<canvas ref="chart"></canvas>
		</v-card-text>

		<v-spacer v-show="!hasTemperaturesToDisplay"></v-spacer>
		<v-card-text class="pa-0" v-show="!hasTemperaturesToDisplay">
			<v-alert :value="true" type="info" class="mb-0">
				{{ $t('chart.temperature.noData') }}
			</v-alert>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

import Chart from 'chart.js'
import dateFnsLocale from 'date-fns/locale/en-US'
import { mapState, mapGetters } from 'vuex'

import i18n from '@/i18n'
import { defaultMachine } from '@/store/machine'
import Events from '@/utils/events.js'
import { getRealHeaterColor } from '@/utils/colors.js'

const sampleInterval = 1000			// ms
const defaultMaxTemperature = 300	// degC
const maxSampleTime = 600000		// 10min (in ms)

function makeDataset(index, extra, label, numSamples) {
	const color = getRealHeaterColor(index, extra), dataset = {
		index,
		extra,
		label,
		fill: false,
		backgroundColor: color,
		borderColor: color,
		borderDash: extra ? [10, 5] : undefined,
		borderWidth: 2,
		data: [],
		locale: i18n.locale,
		pointRadius: 0,
		pointHitRadius: 0,
		showLine: true
	};
	dataset.data = (new Array(numSamples)).fill(NaN);
	return dataset;
}

const tempSamples = {
	[defaultMachine]: {
		times: [],
		temps: []
	}
}

function pushSeriesData(machine, index, extra, sensor) {
	// Get series from dataset
	const machineData = tempSamples[machine];
	let dataset = machineData.temps.find(function(item) {
		if (item.index === index && item.extra === extra) {
			return item;
		}
	});

	// Check if the dataset has to be created first
	if (!dataset || dataset.locale !== i18n.locale || dataset.rawLabel !== sensor.name) {
		let name;
		if (sensor.name) {
			const matches = /(.*)\[(.*)\]$/.exec(sensor.name);
			name = matches ? matches[1] : sensor.name;
		} else if (extra) {
			name = i18n.t('chart.temperature.sensor', [index]);
		} else {
			name = i18n.t('chart.temperature.heater', [index]);
		}

		if (dataset) {
			dataset.rawLabel = sensor.name;
			dataset.label = name;
			dataset.locale = i18n.locale;
		} else {
			dataset = makeDataset(index, extra, name, tempSamples[machine].times.length);
			machineData.temps.push(dataset);
		}
	}

	// Add new sample
	dataset.data.push(sensor.lastReading);
}

let storeSubscribed = false, instances = []

export default {
	computed: {
		...mapState(['selectedMachine']),
		...mapGetters(['isConnected']),
		...mapGetters('machine', ['hasTemperaturesToDisplay']),
		...mapGetters('machine/model', ['maxHeaterTemperature']),
		...mapState('machine/model', ['heat']),
		...mapState('settings', ['darkTheme'])
	},
	data() {
		return {
			chart: null,
			pauseUpdate: false
		}
	},
	methods: {
		update() {
			this.chart.config.options.scales.yAxes[0].ticks.max = this.maxHeaterTemperature || defaultMaxTemperature;
			this.chart.config.options.scales.xAxes[0].ticks.min = new Date() - maxSampleTime;
			this.chart.config.options.scales.xAxes[0].ticks.max = new Date();
			this.chart.update();
		},
		applyDarkTheme(active) {
			const ticksColor = active ? '#FFF' : '#666';
			this.chart.config.options.legend.labels.fontColor = ticksColor;
			this.chart.config.options.scales.xAxes[0].ticks.major.fontColor = ticksColor;
			this.chart.config.options.scales.xAxes[0].ticks.minor.fontColor = ticksColor;
			this.chart.config.options.scales.yAxes[0].ticks.major.fontColor = ticksColor;
			this.chart.config.options.scales.yAxes[0].ticks.minor.fontColor = ticksColor;

			const gridLineColor = active ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';
			this.chart.config.options.scales.xAxes[0].gridLines.color = gridLineColor;
			this.chart.config.options.scales.yAxes[0].gridLines.color = gridLineColor;
			this.chart.config.options.scales.yAxes[0].gridLines.zeroLineColor = gridLineColor;

			this.chart.update();
		}
	},
	mounted() {
		// Create new chart options. Don't use data for the following because it should not be reactive
		this.options = {
			animation: {
				duration: 0					// general animation time
			},
			elements: {
				line: {
					tension: 0				// disable bezier curves
				}
			},
			legend: {
				labels: {
					filter: (legendItem, data) => data.datasets[legendItem.datasetIndex].showLine,
					fontFamily: 'Roboto,sans-serif'
				}
			},
			maintainAspectRatio: false,
			responsive: true,
			responsiveAnimationDuration: 0, // animation duration after a resize
			scales: {
				xAxes: [
					{
						adapters: {
							date: {
								locale: dateFnsLocale
							}
						},
						gridLines: {
							display: true
						},
						ticks: {
							min: new Date() - maxSampleTime,
							max: new Date(),
							minor: {
								fontFamily: 'Roboto,sans-serif'
							},
							major: {
								fontFamily: 'Roboto,sans-serif'
							}
						},
						time: {
							unit: 'minute',
							displayFormats: {
								minute: 'HH:mm'
							}
						},
						type: 'time',
					}
				],
				yAxes: [
					{
						gridLines: {
							display: true
						},
						ticks: {
							minor: {
								fontFamily: 'Roboto,sans-serif'
							},
							major: {
								fontFamily: 'Roboto,sans-serif'
							},
							min: 0,
							max: defaultMaxTemperature,
							stepSize: 50
						}
					}
				]
			}
		};

		// Create the dataset if necessary
		if (!tempSamples[this.selectedMachine]) {
			tempSamples[this.selectedMachine] = {
				times: [],
				temps: []
			};
		}

		// Create the chart
		this.chart = Chart.Line(this.$refs.chart, {
			options: this.options,
			data: {
				labels: tempSamples[this.selectedMachine].times,
				datasets: tempSamples[this.selectedMachine].temps
			}
		});
		this.applyDarkTheme(this.darkTheme);

		// Keep track of updates
		instances.push(this);
		if (!storeSubscribed) {
			this.$root.$on(Events.machineAdded, function(hostname) {
				tempSamples[hostname] = {
					times: [],
					temps: []
				};
			});
			this.$root.$on(Events.machineRemoved, function(hostname) {
				delete tempSamples[hostname];
			});

			const machines = this.$store.state.machines;
			this.$root.$on(Events.machineModelUpdated, function(hostname) {
				const dataset = tempSamples[hostname], now = new Date();
				if (dataset.times.length === 0 || now - dataset.times[dataset.times.length - 1] > sampleInterval) {
					// Record sensor temperatures
					machines[hostname].model.sensors.analog.forEach(function(sensor, sensorIndex) {
						if (sensor) {
							const heaterIndex = machines[hostname].model.heat.heaters.findIndex(heater => heater && heater.sensor === sensorIndex);
							if (heaterIndex !== -1) {
								pushSeriesData(hostname, heaterIndex, false, sensor);
							} else {
								pushSeriesData(hostname, sensorIndex, true, sensor);
							}
						}
					});

					// Record time and deal wih expired temperature samples
					while (dataset.times.length && now - dataset.times[0] > maxSampleTime) {
						dataset.times.shift();
						dataset.temps.forEach(data => data.data.shift());
					}
					dataset.times.push(now);

					// Deal with visibility and tell chart instances to update
					dataset.temps.forEach(function(dataset) {
						dataset.showLine = !dataset.extra || (machines[hostname].settings.displayedExtraTemperatures.indexOf(dataset.index) !== -1);
					}, this);
					instances.forEach(instance => instance.update());
				}
			});

			storeSubscribed = true;
		}
	},
	beforeDestroy() {
		// Don't update this instance any more...
		instances = instances.filter(instance => instance !== this, this);
	},
	watch: {
		darkTheme(to) {
			this.applyDarkTheme(to);
		},
		selectedMachine(machine) {
			// Each chart instance is fixed to the currently selected machine
			// Reassign the corresponding dataset whenever the selected machine changes
			this.chart.config.data = {
				labels: tempSamples[machine].times,
				datasets: tempSamples[machine].temps
			};
			this.update();
		}
	}
}
</script>
