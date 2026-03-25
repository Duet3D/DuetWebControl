<template>
	<canvas ref="chart" @mousedown="mouseDown" @mousemove="mouseMove" @dblclick="doubleClick"></canvas>
</template>

<script lang="ts">
import type { ChartConfiguration, ChartDataset, ChartEvent, LegendElement, LegendItem, TooltipItem } from 'chart.js'
import { Chart } from 'chart.js'
import { getInputShaperDamping, getInputShaperFactors, InputShaperType } from '@duet3d/motionanalysis'
import { InputShapingType } from "@duet3d/objectmodel";
import Vue, { PropType } from 'vue'

interface InputShapingDataset extends ChartDataset<'line'> {
	isShaperFrequency?: boolean;
	isCustom?: boolean;
}
import store from "@/store"

import './RangePlugin.ts'
import './VLinePlugin.ts'

export default Vue.extend({
	props: {
		frequencies: Array as PropType<number[]>,
		ringingFrequency: Number,
		value: Object as PropType<Record<string, number[]>>,
		showValues: {
			default: true,
			type: Boolean
		},
		sampleStartIndex: Number,
		sampleEndIndex: Number,

		inputShapers: Array as PropType<string[]>,
		inputShaperFrequency: Number,
		inputShaperDamping: Number,

		customAmplitudes: Array as PropType<number[]>,
		customDelays: Array as PropType<number[]>,

		estimateShaperEffect: Boolean,
		wideBand: Boolean
	},
	computed: {
		darkTheme(): boolean { return store.state.settings.darkTheme; },
		language(): string { return store.state.settings.language; },
		showReduction(): boolean { return ((this.customAmplitudes && this.customDelays) || (!!this.inputShapers && this.inputShapers.length > 0)) && !this.estimateShaperEffect; },
		resolution(): number { return (this.frequencies && this.frequencies.length > 2) ? (this.frequencies[1] - this.frequencies[0]) : 0; },
		lineAtPoint(): number {
			let point = -1;
			if (this.frequencies && this.frequencies.length > 1 && this.ringingFrequency) {
				let delta: number = Infinity;
				for (let i = 0; i < this.frequencies.length; i++) {
					const nextDelta = Math.abs(this.frequencies[i] - this.ringingFrequency);
					if (point === -1 || nextDelta < delta) {
						point = i;
						delta = nextDelta;
					}
				}

				if (delta > this.resolution) {
					// Don't attempt to display the target frequency if it is too far off
					point = -1;
				}
			}
			return point;
		}
	},
	data() {
		return {
			chart: {} as Chart<'line'>,
			options: {} as any,
			dragStart: null as number | null,
			isUpdating: false
		}
	},
	mounted() {
		const that = this;
		this.options = {
			animation: false,
			hover: {
				mode: 'nearest',
				intersect: true
			},
			maintainAspectRatio: false,
			plugins: {
				legend: {
					labels: {},
					onClick(e: ChartEvent, legendItem: LegendItem, legend: LegendElement<'line'>) {
						const index = legendItem.datasetIndex!;
						const ci = legend.chart;
						const meta = ci.getDatasetMeta(index);

						// See controller.isDatasetVisible comment
						(meta as any).hidden = meta.hidden === null ? !ci.data.datasets[index].hidden : null;

						// Toggle visibility of the highlighted frequency
						if ((ci.data.datasets[index] as InputShapingDataset).isShaperFrequency) {
							(ci.config as ChartConfiguration).lineAtIndex = meta.hidden ? [] : [that.lineAtPoint];
						}

						// We hid a dataset ... rerender the chart
						ci.update();
					}
				},
				range: {},
				vline: {
					lineColor: '#1010FF',
					lineWidth: 2
				},
				tooltip: {
					enabled: true,
					callbacks: {
						label(tooltipItem: TooltipItem<'line'>) {
							let label = tooltipItem.dataset.label || '';
							if (label) {
								label += ': ';
							}
							label += that.estimateShaperEffect ? Math.round((tooltipItem.parsed.y ?? 0) * 10000) / 10000 : Math.round((tooltipItem.parsed.y ?? 0) * 1000) / 1000;
							return label;
						},
						title: (items: TooltipItem<'line'>[]) => that.frequencies
							? that.$t('plugins.accelerometer.frequencyTooltip', [that.frequencies[items[0].dataIndex].toFixed(1), (that.resolution / 2).toFixed(1)])
							: that.$t('plugins.accelerometer.sampleTooltip', [items[0].dataIndex + 1])
					}
				}
			},
			scales: {
				x: {
					display: true,
					grid: {
						display: true
					},
					title: {
						display: true,
						text: (this.frequencies && this.frequencies.length > 0) ? this.$t('plugins.accelerometer.xAxisFrequency') : this.$t('plugins.accelerometer.xAxisSample')
					},
					ticks: {
						font: {
							family: 'Roboto,sans-serif'
						},
						maxTicksLimit: 20
					},
					beginAtZero: true
				},
				y: {
					display: !!this.value,
					grid: {
						display: true
					},
					title: {
						display: true,
						text: (this.frequencies && this.frequencies.length > 0) ? this.$t('plugins.accelerometer.yAxisAmplitude') : this.$t('plugins.accelerometer.yAxisAcceleration')
					},
					ticks: {
						font: {
							family: 'Roboto,sans-serif'
						}
					}
				},
				damping: {
					display: this.showReduction,
					grid: {
						display: true
					},
					position: this.value ? 'right' : 'left',
					title: {
						display: true,
						text: this.$t('plugins.accelerometer.reductionFactor')
					},
					min: 0,
					max: 1
				}
			}
		};

		// Create the chart
		this.chart = new Chart(this.$refs.chart as HTMLCanvasElement, {
			type: 'line',
			options: this.options,
			data: {
				datasets: [],
				labels: []
			}
		});
		this.updateDatasets();
		this.applyDarkTheme(this.darkTheme);
	},
	methods: {
		applyDarkTheme(active: boolean) {
			const ticksColor = active ? '#FFF' : '#666';
			const opt = this.chart.options as any;
			opt.plugins.legend.labels.color = ticksColor;
			opt.scales.x.ticks.color = ticksColor;
			opt.scales.x.title.color = ticksColor;
			opt.scales.y.ticks.color = ticksColor;
			opt.scales.y.title.color = ticksColor;
			opt.scales.damping.ticks.color = ticksColor;
			opt.scales.damping.title.color = ticksColor;

			const gridLineColor = active ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';
			opt.scales.x.grid.color = gridLineColor;
			opt.scales.y.grid.color = gridLineColor;
			opt.scales.damping.grid.color = gridLineColor;

			this.chart.update();
		},
		getLineColor(index: number) {
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
		updateDatasets() {
			const hiddenDatasets = this.chart!.data.datasets.filter((_: ChartDataset, index: number) => !this.chart!.isDatasetVisible(index)).map((dataset: ChartDataset) => dataset.label);
			this.chart.data.labels = [];
			this.chart.data.datasets = [];

			// Add values
			let numSamples = 0;
			for (let key in this.value) {
				if (this.showValues) {
					const dataset = {
						borderColor: this.getLineColor(this.chart.data.datasets.length),
						backgroundColor: this.getLineColor(this.chart.data.datasets.length),
						pointBorderWidth: 0.25,
						pointRadius: 2,
						borderWidth: 1.25,
						data: this.value[key],
						fill: false,
						label: key
					};
					this.chart.data.datasets.push(dataset);
				}

				if (this.value[key].length > numSamples) {
					numSamples = this.value[key].length;
				}
			}

			// Set frequencies or samples
			this.chart.options!.scales!.x!.min = 0;
			this.chart.options!.scales!.x!.max = numSamples;
			this.chart.data.labels = (this.frequencies && this.frequencies.length > 0) ? this.frequencies.map(freq => Math.round(freq).toString()) : Array.from({ length: numSamples }, (_, i) => i);

			// Check if a frequency is supposed to be highlighted
			if (this.lineAtPoint !== -1 && this.chart.data.datasets.length > 0) {
					(this.chart.config as ChartConfiguration).lineAtIndex = [this.lineAtPoint];

				const dataset = {
					borderColor: '#1010FF',
					backgroundColor: '#1010FF',
					data: [],
					label: this.$t('plugins.accelerometer.shaperFrequency'),
					isShaperFrequency: true
				};
				this.chart.data.datasets.push(dataset);
			} else {
				(this.chart.config as ChartConfiguration).lineAtIndex = [];
			}

			// Compute the damping curves for the given shapers
			if (this.inputShaperFrequency && this.frequencies && this.frequencies.length > 0) {
				for (let shaperType of this.inputShapers) {
					if (shaperType === 'none' || shaperType === 'custom') {
						continue;
					} else if (!(shaperType in InputShapingType)) {
						console.warn(`Unsupported shaper type ${shaperType}`);
						continue;
					}

					const factors = getInputShaperFactors(shaperType as InputShaperType, this.inputShaperFrequency, this.inputShaperDamping);
					const damping = getInputShaperDamping(this.frequencies, factors.amplitudes, factors.durations);

					if (this.estimateShaperEffect) {
						for (let key in this.value) {
							const dataset = {
								borderColor: this.getLineColor(this.chart.data.datasets.length),
								backgroundColor: this.getLineColor(this.chart.data.datasets.length),
								pointBorderWidth: 0.25,
								pointRadius: 0,
								borderDash: this.showValues ? [5, 5] : undefined,
								borderWidth: 1.25,
								data: this.value[key].map((value, index) => value * damping[index]),
								fill: false,
								label: `${key} + ${shaperType.toUpperCase()}`
							};
							this.chart.data.datasets.push(dataset);
						}
					} else {
						const dataset = {
							borderColor: this.getLineColor(this.chart.data.datasets.length),
							backgroundColor: this.getLineColor(this.chart.data.datasets.length),
							pointBorderWidth: 0,
							pointRadius: 0,
							borderDash: [5, 5],
							borderWidth: 1.25,
							data: damping,
							fill: false,
							label: shaperType.toUpperCase(),
							yAxisID: 'damping'
						};
						this.chart.data.datasets.push(dataset);
					}
				}
			}

			// Compute the damping curve for custom parameters
			if (this.inputShapers.includes('custom') && this.frequencies && this.frequencies.length > 0 && this.customAmplitudes && this.customDelays && this.customAmplitudes.length > 0 && this.customDelays.length > 0) {
				const damping = getInputShaperDamping(this.frequencies, this.customAmplitudes, this.customDelays);
				if (this.estimateShaperEffect) {
					for (let key in this.value) {
						const dataset = {
							borderColor: this.getLineColor(this.chart.data.datasets.length),
							backgroundColor: this.getLineColor(this.chart.data.datasets.length),
							pointBorderWidth: 0,
							pointRadius: 0,
							borderDash: this.showValues ? [5, 5] : undefined,
							borderWidth: 1.25,
							data: this.value[key].map((value, index) => value * damping[index]),
							fill: false,
							label: `${key} + ${this.$t('plugins.accelerometer.custom')}`
						};
						this.chart.data.datasets.push(dataset);
					}
				} else {
					const dataset = {
						borderColor: this.getLineColor(this.chart.data.datasets.length),
						backgroundColor: this.getLineColor(this.chart.data.datasets.length),
						pointBorderWidth: 0,
						pointRadius: 0,
						borderDash: [10, 5],
						borderWidth: 1.25,
						data: damping,
						fill: false,
						label: this.$t('plugins.accelerometer.custom'),
						yAxisID: 'damping',
						isCustom: true
					};
					this.chart.data.datasets.push(dataset);
				}
			}

			// Check if a frequency is supposed to be highlighted. Attempt to add this here again in case it wasn't added before
			if (!(this.chart!.data.datasets as InputShapingDataset[]).find(dataset => dataset.isShaperFrequency) && this.lineAtPoint !== -1 && this.chart!.data.datasets.length > 0) {
				(this.chart.config as ChartConfiguration).lineAtIndex = [this.lineAtPoint];

				const dataset = {
					borderColor: '#1010FF',
					backgroundColor: '#1010FF',
					data: [],
					label: this.$t('plugins.accelerometer.shaperFrequency'),
					isShaperFrequency: true
				};
				this.chart.data.datasets.push(dataset);
			}

			// Limit number of frequencies
			if (this.frequencies && this.frequencies.length > 0) {
				let maxFrequencyIndex = -1;
				const maxFrequency = this.wideBand ? 500 : 100;
				for (let freq of this.frequencies) {
					if (Math.round(freq) > maxFrequency) {
						break;
					}
					maxFrequencyIndex++;
				}

				if (maxFrequencyIndex > 0) {
					for (let dataset of this.chart.data.datasets) {
						if (!(dataset as InputShapingDataset).isShaperFrequency) {
							dataset.data.splice(maxFrequencyIndex + 1);
						}
					}
					this.chart.data.labels!.splice(maxFrequencyIndex + 1);
					(this.chart.options as any).scales.x.max = maxFrequencyIndex;
				}
			}

			// Finish setup
			const opt = this.chart.options as any;
			opt.scales.x.title.text = (this.frequencies && this.frequencies.length > 0) ? this.$t('plugins.accelerometer.xAxisFrequency') : this.$t('plugins.accelerometer.xAxisSample');
			opt.scales.y.title.text = (this.frequencies && this.frequencies.length > 0) ? this.$t('plugins.accelerometer.yAxisAmplitude') : this.$t('plugins.accelerometer.yAxisAcceleration');
			opt.scales.y.display = !!this.value;
			opt.scales.damping.display = this.showReduction;
			opt.scales.damping.position = this.value ? 'right' : 'left';
			for (let dataset of this.chart.data.datasets) {
				if (hiddenDatasets.includes(dataset.label)) {
					dataset.hidden = true;
				}
			}
		},
		update() {
			if (!this.isUpdating) {
				this.isUpdating = true;
				this.$nextTick(() => {
					this.updateDatasets();
					this.chart.update();
					this.isUpdating = false;
				});
			}
		},
		mouseDown(e: MouseEvent) {
			if (this.frequencies && this.frequencies.length > 0) {
				// selection is only possible when viewing samples
				return;
			}

			const activePoints = this.chart.getElementsAtEventForMode(e, 'nearest', { intersect: false }, false);
			if (activePoints && activePoints.length > 0) {
				this.dragStart = activePoints[0].index;
				(this.chart.config as ChartConfiguration).range = { start: e.layerX };
				this.chart.update();

				document.addEventListener('mouseup', this.mouseUp);
			}
		},
		mouseMove(e: MouseEvent) {
			const cfg7 = this.chart.config as ChartConfiguration;
			if (cfg7.range) {
				cfg7.range.end = e.layerX;
				this.chart.update();
			}
		},
		mouseUp(e: MouseEvent) {
			document.removeEventListener('mouseup', this.mouseUp);

			const cfg8 = this.chart.config as ChartConfiguration;
			if (cfg8.range && cfg8.range.end) {
				const activePoints = this.chart.getElementsAtEventForMode(e, 'nearest', {intersect: false}, false);
				if (activePoints && activePoints.length > 0) {
					const dragEnd = activePoints[0].index;
					if (Math.abs(dragEnd - this.dragStart!) > 4) {
						const trueStart = Math.min(this.dragStart!, dragEnd), trueEnd = Math.max(this.dragStart!, dragEnd);
						this.$emit('update:sampleStartIndex', trueStart);
						this.$emit('update:sampleEndIndex', trueEnd);
					}
					this.dragStart = null;
				}
			}

			(this.chart.config as ChartConfiguration).range = undefined;
			this.chart.update();
		},
		mouseLeave() {
			const cfg9 = this.chart.config as ChartConfiguration;
			if (cfg9.range) {
				cfg9.range = undefined;
				this.chart.update();
			}
		},
		doubleClick() {
			this.$emit('update:sampleStartIndex', null);
			this.$emit('update:sampleEndIndex', null);
		},
		arraysDiffer(a: unknown, b: unknown) {
			if (a instanceof Array && b instanceof Array) {
				if (a.length !== b.length) {
					return true;
				}
				for (let i = 0; i < a.length; i++) {
					const aItem = a[i], bItem = b[i];
					if (aItem instanceof Array && bItem instanceof Array) {
						if (aItem.length !== bItem.length) {
							return true;
						}
						for (let k = 0; k < aItem.length; k++) {
							if (aItem[k] !== bItem[k]) {
								return true;
							}
						}
					} else if (a[i] !== b[i]) {
						return true;
					}
				}
			}
			return false;
		}
	},
	watch: {
		frequencies(to, from) { if (this.arraysDiffer(to, from)) { this.update(); } },
		ringingFrequency() { this.update(); },
		value() { this.update(); },
		showValues() { this.update(); },

		inputShapers: {
			deep: true,
			handler(to, from) { if (this.arraysDiffer(to, from)) { this.update(); } }
		},
		inputShaperFrequency() { this.update(); },
		inputShaperDamping() { this.update(); },

		customAmplitudes: {
			deep: true,
			handler() {
				if (this.customAmplitudes && this.customDelays) {
					for (let dataset of this.chart.data.datasets) {
						if ((dataset as InputShapingDataset).isCustom) {
							(dataset as InputShapingDataset).data = this.frequencies ? getInputShaperDamping(this.frequencies, this.customAmplitudes, this.customDelays) : [];
							this.update();
							return;
						}
					}
					this.update();
				}
			}
		},
		customDelays: {
			deep: true,
			handler() {
				if (this.customAmplitudes && this.customDelays) {
					for (let dataset of this.chart.data.datasets) {
						if ((dataset as InputShapingDataset).isCustom) {
							(dataset as InputShapingDataset).data = this.frequencies ? getInputShaperDamping(this.frequencies, this.customAmplitudes, this.customDelays) : [];
							this.update();
							return;
						}
					}
					this.update();
				}
			}
		},

		darkTheme(to) {
			this.applyDarkTheme(to);
		},
		language() {
			this.update();
		},
		sampleStartIndex(to) {
			if (!this.frequencies || this.frequencies.length === 0) {
				(this.chart.options as any).scales.x.min = isNaN(to) ? 0 : to;
				this.chart.update();
			}
		},
		sampleEndIndex(to) {
			if (!this.frequencies || this.frequencies.length === 0) {
				(this.chart.options as any).scales.x.max = isNaN(to) ? this.chart.data.labels!.length : to;
				this.chart.update();
			}
		},
		estimateShaperEffect() { this.update(); }
	}
});
</script>
