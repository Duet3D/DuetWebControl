<style scoped>
.card {
	display: flex;
	flex-direction: column;
	width: 100%;
}

.content {
	flex-grow: 1;
}
</style>

<template>
	<v-card class="card">
		<v-card-title class="pt-2 pb-0">
			<v-icon class="mr-1">show_chart</v-icon> {{ $t('chart.temperature.caption') }}
		</v-card-title>

		<v-card-text class="content px-2 py-0">
			<canvas ref="chart"></canvas>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

import Chart from 'chart.js'
import { mapState, mapGetters } from 'vuex'

import i18n from '../../i18n'
import { defaultMachine } from '../../store/machine'
import { getRealHeaterColor } from '../../utils/colors.js'

const sampleInterval = 1000			// ms
const defaultMaxTemperature = 300	// degC
const maxSamples = 600				// 10min

function makeDataset(heaterIndex, extra, label) {
	const color = getRealHeaterColor(heaterIndex, extra), dataset = {
		heaterIndex,
		extra,
		label,
		fill: false,
		backgroundColor: color,
		borderColor: color,
		borderDash: extra ? [10, 5] : undefined,
		borderWidth: 2,
		data: [],
		pointRadius: 0,
		pointHitRadius: 0,
		showLine: true
	};
	dataset.data = (new Array(maxSamples)).fill(NaN);
	return dataset;
}

const tempSamples = {
	[defaultMachine]: {
		times: [],
		temps: []
	}
}

function pushSeriesData(machine, heaterIndex, heater, extra) {
	// Get series from dataset
	const machineData = tempSamples[machine];
	let dataset;
	machineData.temps.forEach(function(item) {
		if (item.heaterIndex === heaterIndex && item.extra === extra) {
			dataset = item;
		}
	});

	if (!dataset) {
		const label = heater.name ? heater.name : i18n.t('chart.temperature.heater', [heaterIndex]);
		dataset = makeDataset(heaterIndex, extra, label);
		machineData.temps.push(dataset);
	}

	// Add new sample
	dataset.data.push(heater.current);
}

function isHeaterConfigured(state, machine, heaterIndex) {
	if (state.machines[machine].model.tools.some(tool => tool.heaters.indexOf(heaterIndex) !== -1)) { return true; }
	if (state.machines[machine].model.heat.beds.some(bed => bed && bed.heaters.indexOf(heaterIndex) !== -1)) { return true; }
	if (state.machines[machine].model.heat.chambers.some(chamber => chamber && chamber.heaters.indexOf(heaterIndex) !== -1)) { return true; }
	return false;
}

let storeSubscribed = false, instances = []

export default {
	computed: {
		...mapState(['selectedMachine']),
		...mapGetters(['isConnected']),
		...mapGetters('machine/model', ['maxHeaterTemperature']),
		...mapState('machine/model', ['heat', 'tools']),
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
			this.options.scales.yAxes[0].ticks.max = this.maxHeaterTemperature || defaultMaxTemperature;
			this.options.scales.xAxes[0].ticks.max = new Date();
			this.chart.update();
		},
		applyDarkTheme(active) {
			const legendColor = active ? '#FFF' : 'rgba(0,0,0,0.87)';
			this.chart.config.options.legend.labels.fontColor = legendColor;

			const ticksColor = active ? '#FFF' : '#666';
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
			responsiveAnimationDuration: 0, // animation duration after a resize
			scales: {
				xAxes: [
					{
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
							max: new Date()
						},
						time: {
							unit: 'minute',
							displayFormats: {
								minute: 'LT'
							}
						},
						type: 'time'
					}
				],
				yAxes: [
					{
						gridLines: {
							color: 'rgba(0,0,0,0.2)',
							zeroLineColor: 'rgba(0,0,0,0.2)',
							display: true
						},
						ticks: {
							minor: {
								fontColor: '#666',
								fontFamily: 'Roboto,sans-serif'
							},
							major: {
								fontColor: '#666',
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

		// Create the chart
		this.chart = Chart.Line(this.$refs.chart, {
			options: this.options,
			data: {
				labels: tempSamples[defaultMachine].times,
				datasets: tempSamples[defaultMachine].temps
			}
		});
		this.applyDarkTheme(this.darkTheme);

		// Keep track of updates
		instances.push(this);
		if (!storeSubscribed) {
			this.$store.subscribe((mutation, state) => {
				const result = /machines\/(.+)\/model\/update/.exec(mutation.type);
				if (result) {
					// Keep track of temperature updates
					const machine = result[1], dataset = tempSamples[machine], now = new Date();
					if (dataset && now - dataset.times[dataset.times.length - 1] > sampleInterval) {
						// Record time
						dataset.times.push(now);

						// Record heater temperatures
						const usedHeaters = []
						state.machines[machine].model.heat.heaters.forEach(function(heater, heaterIndex) {
							if (heater) {
								pushSeriesData(machine, heaterIndex, heater, false);
								if (isHeaterConfigured(state, machine, heaterIndex)) {
									// Display it only if is mapped to at least one tool, bed or chamber
									usedHeaters.push({ heaterIndex, extra: false });
								}
							}
						});

						state.machines[machine].model.heat.extra.forEach(function(heater, heaterIndex) {
							pushSeriesData(machine, heaterIndex, heater, true);
							if (state.machines[state.selectedMachine].settings.displayedExtraTemperatures.indexOf(heaterIndex) !== -1) {
								// Visibility of extra temps can be configured
								usedHeaters.push({ heaterIndex, extra: true });
							}
						});

						// Cut off oldest samples and deal with visibility
						dataset.times.shift();
						dataset.temps.forEach(function(dataset) {
							dataset.showLine = usedHeaters.some(item => item.heaterIndex === dataset.heaterIndex && item.extra === dataset.extra);
							dataset.data.shift();
						});

						// Tell chart instances to update
						instances.forEach(instance => instance.update());
					}
				} else if (mutation.type === 'addMachine') {
					// Add new dataset for added machines
					const dataset = {
						times: [],
						temps: []
					}
					tempSamples[mutation.payload.hostname] = dataset;

					// Fill times with some dummy data
					let t = new Date() - sampleInterval * maxSamples;
					for (let i = 0; i < maxSamples; i++) {
						dataset.times.push(t);
						t += sampleInterval;
					}
				} else {
					// Delete datasets of disconnected machines
					const result = /machines\/(.+)\/unregister/.exec(mutation.type);
					if (result) {
						const machine = result[1];
						if (tempSamples[machine] !== undefined) {
							delete tempSamples[machine];
						}
					}
				}
			});

			storeSubscribed = true;
		}
	},
	beforeDestroy() {
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
			this.chart.update();
		}
	}
}
</script>
