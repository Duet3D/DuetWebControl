<style scoped>
.content {
	position: relative;
	min-height: 180px;
}

.content > canvas {
	position: absolute;
}
</style>

<template>
	<v-card class="d-flex flex-column flex-grow-1">
		<v-card-title>
			<span>
				<v-icon small class="mr-1">mdi-vector-polyline</v-icon>
				{{ $t("chart.layer.caption") }}
			</span>
			<v-spacer />
			<a v-show="layers.length > 2" href="javascript:void(0)" @click.prevent="showAllLayers = !showAllLayers">
				{{ showAllLayers ? $t("chart.layer.showLastLayers", [Math.min(layers.length, 30)]) : $t("chart.layer.showAllLayers") }}
			</a>
		</v-card-title>

		<v-card-text class="content flex-grow-1 px-2 py-0">
			<canvas ref="chart"></canvas>
		</v-card-text>
	</v-card>
</template>

<script lang="ts">
import { Chart } from "chart.js";
import { Layer, ModelCollection } from "@duet3d/objectmodel";
import Vue from "vue";

import store from "@/store";
import { display, displayZ, displayTime } from "@/utils/display";

export default Vue.extend({
	computed: {
		darkTheme(): boolean { return store.state.settings.darkTheme; },
		language(): string { return store.state.settings.language; },
		layers(): ModelCollection<Layer> { return store.state.machine.model.job.layers; }
	},
	data() {
		return {
			chart: {} as Chart<'line'>,
			showAllLayers: false
		}
	},
	methods: {
		updateChart() {
			this.chart.data.labels = this.layers.map((_, index) => index + 1);
			this.chart.data.datasets![0].data = this.layers.map(layer => layer.duration);

			if (this.showAllLayers) {
				this.chart.options!.scales!.x!.min = 1;
				this.chart.options!.scales!.x!.max = this.layers.length;
			} else {
				this.chart.options!.scales!.x!.min = Math.max((this.layers.length > 2) ? 2 : 1, this.layers.length - 30);
				this.chart.options!.scales!.x!.max = Math.max(30, this.layers.length);
			}
			this.chart.update();
		},
		applyDarkTheme(active: boolean) {
			const ticksColor = active ? "#FFF" : "#666";
			this.chart.options!.scales!.x!.ticks!.color = ticksColor;
			this.chart.options!.scales!.y!.ticks!.color = ticksColor;

			const gridLineColor = active ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
			this.chart.options!.scales!.x!.grid!.color = gridLineColor;
			this.chart.options!.scales!.y!.grid!.color = gridLineColor;

			this.chart.update();
		}
	},
	mounted() {
		const that = this;
		this.chart = new Chart(this.$refs.chart as HTMLCanvasElement, {
			type: "line",
			options: {
				elements: {
					line: {
						tension: 0
					}
				},
				plugins: {
					legend: {
						display: false
					},
					tooltip: {
						displayColors: false,
						callbacks: {
							title: tooltipItems => that.$t("chart.layer.layer", [tooltipItems[0].dataIndex + 1]),
							label(tooltipItem) {
								const layer = that.layers[tooltipItem.dataIndex];
								let result = [that.$t("chart.layer.layerDuration", [displayTime(layer.duration, false)])];
								if (layer.height) { result.push(that.$t("chart.layer.layerHeight", [displayZ(layer.height)])); }
								if (layer.filamentUsage) { result.push(that.$t("chart.layer.filamentUsage", [display(layer.filamentUsage, 1, "mm")])); }
								if (layer.fractionPrinted) { result.push(that.$t("chart.layer.fractionPrinted", [display(layer.fractionPrinted * 100, 1, "%")])); }
								if (layer.temperatures) { result.push(that.$t("chart.layer.temperatures", [layer.temperatures.map(temp => display(temp, 1, "C")).join(", ")])); }
								return result;
							}
						}
					}
				},
				maintainAspectRatio: false,
				scales: {
					x: {
						grid: {
							color: "rgba(0,0,0,0.2)",
							display: true
						},
						ticks: {
							color: "rgba(0,0,0,0.87)",
							font: {
								family: "Roboto,sans-serif"
							},
							maxRotation: 0,
							stepSize: 5
						},
						beginAtZero: true
					},
					y: {
						grid: {
							color: "rgba(0,0,0,0.87)",
							display: true
						},
						ticks: {
							color: "rgba(0,0,0,0.87)",
							font: {
								family: "Roboto,sans-serif"
							},
							callback: (value: string | number) => {
								return displayTime(value as number, false);
							}
						},
						beginAtZero: true,
						suggestedMax: 30
					}
				}
				// panning and zooming is not supported until the panning feature of chartjs-plugin-zoom is fixed
			},
			data: {
				datasets: [{
					borderColor: "rgba(0, 129, 214, 0.8)",
					backgroundColor: "rgba(0, 129, 214, 0.8)",
					fill: false,
					label: this.$t("chart.layer.layerTime"),
					data: []
				}]
			}
		});
		this.applyDarkTheme(this.darkTheme);
		this.updateChart();
	},
	watch: {
		darkTheme(to: boolean) {
			this.applyDarkTheme(to);
		},
		language() {
			this.chart!.data.datasets![0].label = this.$t("chart.layer.layerTime");
		},
		layers() {
			this.updateChart();
		},
		showAllLayers() {
			this.updateChart();
		}
	}
});
</script>