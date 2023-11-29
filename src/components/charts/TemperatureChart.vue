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
			<v-icon class="mr-1">mdi-chart-timeline-variant</v-icon>
			{{ $t("chart.temperature.caption") }}
		</v-card-title>

		<v-card-text v-show="hasTemperaturesToDisplay" class="content flex-grow-1 px-2 py-0">
			<canvas ref="chart"></canvas>
		</v-card-text>
		<template v-if="!hasTemperaturesToDisplay">
			<v-spacer />
			<v-card-text class="pa-0">
				<v-alert :value="true" type="info" class="mb-0">
					{{ $t("chart.temperature.noData") }}
				</v-alert>
			</v-card-text>
		</template>
	</v-card>
</template>

<script lang="ts">
import Chart, { ChartDataSets, MajorTickOptions, NestedTickOptions } from "chart.js";
import dateFnsLocale from "date-fns/locale/en-US";
import { AnalogSensor } from "@duet3d/objectmodel";
import Vue from "vue";

import i18n from "@/i18n";
import store from "@/store";
import { defaultMachine } from "@/store/machine";
import { getRealHeaterColor } from "@/utils/colors";
import Events from "@/utils/events";

/**
 * Specifies the interval at which temperature samples are recorded
 */
const sampleInterval = 1000;

/**
 * Default maximum temperature in case it cannot be determined from the object model (in C)
 */
const defaultMaxTemperature = 300;

/**
 * Maximum time to save sample data (in ms, defaults to 10min)
 */
const maxSampleTime = 600000;

/**
 * Extra values for Chart.JS dataset values
 */
interface ExtraDatasetValues {
	/**
	 * Index of the sensor
	 */
	index: number;

	/**
	 * Whether this is an extra sensor
	 */
	extra: boolean;

	/**
	 * Locale used when rendering
	 */
	locale: string;

	/**
	 * Raw label of this dataset (equal to to sensor.name)
	 */
	rawLabel: string | null;
}

/**
 * Type used for chart datasets in this component
 */
type TempChartDataset = ChartDataSets & ExtraDatasetValues;

/**
 * Make a new dataset to render temperature data
 * @param index Sensor index
 * @param extra If this is an extra sensor
 * @param label Label of this sensor
 * @param numSamples Number of current samples to generate for the resulting datset
 */
function makeDataset(index: number, extra: boolean, label: string, numSamples: number): TempChartDataset {
	const color = getRealHeaterColor(index, extra);
	return {
		index,
		extra,
		label,
		fill: false,
		backgroundColor: color,
		borderColor: color,
		borderDash: extra ? [10, 5] : undefined,
		borderWidth: 2,
		data: (new Array<number>(numSamples)).fill(NaN),
		locale: i18n.locale,
		pointRadius: 0,
		pointHitRadius: 0,
		rawLabel: null,
		showLine: true
	};
}

/**
 * Temperature samples to save per connected machine
 */
interface TempSampleData {
	times: Array<number>,
	temps: TempChartDataset[]
}

/**
 * Collection of machines vs. collected temp samples
 */
const tempSamples: Record<string, TempSampleData> = {
	[defaultMachine]: {
		times: [],
		temps: []
	}
};

/**
 * Push sensor data of a given machine to the dataset
 * @param machine Machine to add samples to
 * @param index Index of the sensor
 * @param extra If it is an extra sensor
 * @param sensor Sensor item
 */
function pushSeriesData(machine: string, index: number, extra: boolean, sensor: AnalogSensor) {
	// Get series from dataset
	const machineData = tempSamples[machine];
	let dataset = machineData.temps.find((item) => {
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
			name = i18n.t("chart.temperature.sensor", [index]);
		} else {
			name = i18n.t("chart.temperature.heater", [index]);
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
	dataset.data!.push((sensor.lastReading !== null) ? sensor.lastReading : NaN);
}

let storeSubscribed = false, instances: Array<{ update: () => void }> = []

export default Vue.extend({
	computed: {
		darkTheme(): boolean { return store.state.settings.darkTheme; },
		selectedMachine(): string { return store.state.selectedMachine; },
		hasTemperaturesToDisplay(): boolean { return store.getters["machine/hasTemperaturesToDisplay"] },
		maxHeaterTemperature(): number | null { return store.getters["machine/model/maxHeaterTemperature"] },
	},
	data() {
		return {
			chart: {} as Chart,
			lastUpdate: 0
		}
	},
	methods: {
		update() {
			const now = (new Date()).getTime();
			if (now - this.lastUpdate >= 1000) {
				this.chart.config.options!.scales!.yAxes![0].ticks!.max = (this.maxHeaterTemperature !== null) ? this.maxHeaterTemperature : defaultMaxTemperature;
				this.chart.config.options!.scales!.xAxes![0].ticks!.min = (new Date()).getTime() - maxSampleTime;
				this.chart.config.options!.scales!.xAxes![0].ticks!.max = (new Date()).getTime();

				this.chart.update();
				this.lastUpdate = now;
			}
		},
		applyDarkTheme(active: boolean) {
			const ticksColor = active ? "#FFF" : "#666";
			this.chart.config.options!.legend!.labels!.fontColor = ticksColor;
			(this.chart.config.options!.scales!.xAxes![0].ticks!.minor as NestedTickOptions).fontColor = ticksColor;
			(this.chart.config.options!.scales!.xAxes![0].ticks!.major as MajorTickOptions).fontColor = ticksColor;
			(this.chart.config.options!.scales!.yAxes![0].ticks!.minor as NestedTickOptions).fontColor = ticksColor;
			(this.chart.config.options!.scales!.yAxes![0].ticks!.major as MajorTickOptions).fontColor = ticksColor;

			const gridLineColor = active ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
			this.chart.config.options!.scales!.xAxes![0].gridLines!.color = gridLineColor;
			this.chart.config.options!.scales!.yAxes![0].gridLines!.color = gridLineColor;
			this.chart.config.options!.scales!.yAxes![0].gridLines!.zeroLineColor = gridLineColor;

			this.chart.update();
		}
	},
	mounted() {
		// Create the dataset if necessary
		if (!tempSamples[this.selectedMachine]) {
			tempSamples[this.selectedMachine] = {
				times: [],
				temps: []
			};
		}

		// Create the chart
		this.chart = new Chart(this.$refs.chart as HTMLCanvasElement, {
			type: "line",
			options: {
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
						filter: (legendItem, data) => data.datasets![legendItem.datasetIndex!].showLine,
						fontFamily: "Roboto,sans-serif"
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
								min: (new Date()).getTime() - maxSampleTime,
								max: (new Date()).getTime(),
								minor: {
									fontFamily: "Roboto,sans-serif"
								},
								major: {
									fontFamily: "Roboto,sans-serif"
								}
							},
							time: {
								unit: "minute",
								displayFormats: {
									minute: "HH:mm"
								}
							},
							type: "time",
						}
					],
					yAxes: [
						{
							gridLines: {
								display: true
							},
							ticks: {
								minor: {
									fontFamily: "Roboto,sans-serif"
								},
								major: {
									fontFamily: "Roboto,sans-serif"
								},
								min: 0,
								max: defaultMaxTemperature,
								stepSize: 50
							}
						}
					]
				}
			},
			data: {
				labels: tempSamples[this.selectedMachine].times,
				datasets: tempSamples[this.selectedMachine].temps
			}
		});
		this.applyDarkTheme(this.darkTheme);

		// Keep track of updates
		instances.push(this);
		if (!storeSubscribed) {
			this.$root.$on(Events.machineAdded, (hostname: string) => {
				tempSamples[hostname] = {
					times: [],
					temps: []
				};
			});
			this.$root.$on(Events.machineRemoved, (hostname: string) => {
				delete tempSamples[hostname];
			});

			this.$root.$on(Events.machineModelUpdated, (hostname: string) => {
				const dataset = tempSamples[hostname], now = (new Date()).getTime();
				if (dataset.times.length === 0 || now - dataset.times[dataset.times.length - 1] > sampleInterval) {
					// Record sensor temperatures
					store.state.machines[hostname].model.sensors.analog.forEach((sensor, sensorIndex) => {
						if (sensor !== null) {
							const heaterIndex = store.state.machines[hostname].model.heat.heaters.findIndex(heater => (heater !== null) && (heater.sensor === sensorIndex));
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
						dataset.temps.forEach(data => data.data!.shift());
					}
					dataset.times.push(now);

					// Deal with visibility and tell chart instances to update
					dataset.temps.forEach((dataset) => {
						dataset.showLine = !dataset.extra || (store.state.machines[hostname].settings.displayedExtraTemperatures.includes(dataset.index));
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
		darkTheme(to: boolean) {
			this.applyDarkTheme(to);
		},
		selectedMachine(machine: string) {
			// Each chart instance is fixed to the currently selected machine
			// Reassign the corresponding dataset whenever the selected machine changes
			this.chart.config.data = {
				labels: tempSamples[machine].times,
				datasets: tempSamples[machine].temps
			};
			this.update();
		}
	}
});
</script>
