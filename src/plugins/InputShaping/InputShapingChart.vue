<template>
	<canvas ref="chart" @mousedown="mouseDown" @mousemove="mouseMove" @dblclick="doubleClick"></canvas>
</template>

<script>
'use strict'

import Chart from 'chart.js'
import { getInputShaperDamping, getInputShaperFactors } from '@duet3d/motionanalysis'
import { InputShapingType } from "@duet3d/objectmodel";
import { mapState } from 'vuex'

import './RangePlugin'
import './VLinePlugin'

export default {
	props: {
		frequencies: Array,                 // array of the frequencies used (omit this if samples shall be displayed)
		ringingFrequency: Number,           // frequency to highlight (requires frequencies)
		value: Object,                      // object map of the Y axis label vs. displayed value (e.g. { X: [ ... ] })
		showValues: {                       // whether the values are supposed to be shown as datasets
			default: true,
			type: Boolean
		},
		sampleStartIndex: Number,           // start sample index to show
		sampleEndIndex: Number,             // end sample index to show

		inputShapers: Array,                // compute damping curves for these input shapers (requires frequencies)
		inputShaperFrequency: Number,       // frequency to use when computing input shaper damping curves
		inputShaperDamping: Number,         // damping factor to use when computing input shaper damping curves

		customAmplitudes: Array,            // amplitudes for the computation of the custom input shaper
		customDelays: Array,             	// delays for the computation of the custom input shaper

		estimateShaperEffect: Boolean,      // show estimated shaper effect
		wideBand: Boolean					// show more frequencies
	},
	computed: {
		...mapState('settings', ['darkTheme']),
		showReduction() { return ((this.amplitudes && this.delays) || (!!this.inputShapers && this.inputShapers.length > 0)) && !this.estimateShaperEffect; },
		resolution() { return (this.frequencies && this.frequencies.length > 2) ? (this.frequencies[1] - this.frequencies[0]) : 0; },
		lineAtPoint() {
			let point = -1;
			if (this.frequencies && this.frequencies.length > 1 && this.ringingFrequency) {
				let delta;
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
			chart: null,
			options: {},
			dragStart: null,
			isUpdating: false
		}
	},
	mounted() {
		// TODO: Update translations here -----v
		const that = this;
		this.options = {
			animation: false,
			hover: {
				mode: 'nearest',
				intersect: true
			},
			legend: {
				labels: {},
				onClick(e, legendItem) {
					const index = legendItem.datasetIndex;
					const ci = this.chart;
					const meta = ci.getDatasetMeta(index);

					// See controller.isDatasetVisible comment
					meta.hidden = meta.hidden === null ? !ci.data.datasets[index].hidden : null;

					// Toggle visibility of the highlighted frequency
					if (ci.data.datasets[index].isShaperFrequency) {
						ci.config.lineAtIndex = meta.hidden ? [] : [that.lineAtPoint];
					}

					// We hid a dataset ... rerender the chart
					ci.update();
				}
			},
			maintainAspectRatio: false,
			plugins: {
				range: {},
				vline: {
					lineColor: '#1010FF',
					lineWidth: 2
				}
			},
			scales: {
				xAxes: [
					{
						display: true,
						gridLines: {
							display: true
						},
						scaleLabel: {
							display: true,
							labelString: (this.frequencies && this.frequencies.length > 0) ? 'Frequency (in Hz)' : 'Sample'
						},
						ticks: {
							minor: {
								fontFamily: 'Roboto,sans-serif'
							},
							major: {
								fontFamily: 'Roboto,sans-serif'
							},
							beginAtZero: true,
							maxTicksLimit: 20
						}
					}
				],
				yAxes: [
					{
						display: !!this.value,
						gridLines: {
							display: true
						},
						scaleLabel: {
							display: true,
							labelString: (this.frequencies && this.frequencies.length > 0) ? 'Amplitude' : 'Acceleration (in g)'
						},
						ticks: {
							minor: {
								fontFamily: 'Roboto,sans-serif'
							},
							major: {
								fontFamily: 'Roboto,sans-serif'
							}
						}
					},
					{
						display: this.showReduction,
						gridLines: {
							display: true
						},
						id: 'damping',
						position: this.value ? 'right' : 'left',
						scaleLabel: {
							display: true,
							labelString: 'Reduction Factor'
						},
						ticks: {
							min: 0,
							max: 1
						}
					}
				]
			},
			tooltips: {
				enabled: true,
				callbacks: {
					label(tooltipItem, data) {
						let label = data.datasets[tooltipItem.datasetIndex].label || '';
						if (label) {
							label += ': ';
						}
						label += that.estimateShaperEffect ? Math.round(tooltipItem.yLabel * 10000) / 10000 : Math.round(tooltipItem.yLabel * 1000) / 1000;
						return label;
					},
					title: items => that.frequencies
						? that.$t('plugins.accelerometer.frequencyTooltip', [that.frequencies[items[0].index].toFixed(1), (that.resolution / 2).toFixed(1)])
						: that.$t('plugins.accelerometer.sampleTooltip', [items[0].index + 1])
				}
			}
		};

		// Create the chart
		this.chart = Chart.Line(this.$refs.chart, {
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
		applyDarkTheme(active) {
			const ticksColor = active ? '#FFF' : '#666';
			this.chart.config.options.legend.labels.fontColor = ticksColor;
			this.chart.config.options.scales.xAxes[0].ticks.minor.fontColor = ticksColor;
			this.chart.config.options.scales.xAxes[0].ticks.major.fontColor = ticksColor;
			this.chart.config.options.scales.xAxes[0].scaleLabel.fontColor = ticksColor;
			this.chart.config.options.scales.yAxes[0].ticks.major.fontColor = ticksColor;
			this.chart.config.options.scales.yAxes[0].ticks.minor.fontColor = ticksColor;
			this.chart.config.options.scales.yAxes[0].scaleLabel.fontColor = ticksColor;
			this.chart.config.options.scales.yAxes[1].ticks.major.fontColor = ticksColor;
			this.chart.config.options.scales.yAxes[1].ticks.minor.fontColor = ticksColor;
			this.chart.config.options.scales.yAxes[1].scaleLabel.fontColor = ticksColor;

			const gridLineColor = active ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';
			this.chart.config.options.scales.xAxes[0].gridLines.color = gridLineColor;
			this.chart.config.options.scales.yAxes[0].gridLines.color = gridLineColor;
			this.chart.config.options.scales.yAxes[0].gridLines.zeroLineColor = gridLineColor;
			this.chart.config.options.scales.yAxes[1].gridLines.color = gridLineColor;
			this.chart.config.options.scales.yAxes[1].gridLines.zeroLineColor = gridLineColor;

			this.chart.update();
		},
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
		updateDatasets() {
			const hiddenDatasets = this.chart.data.datasets.filter((_, index) => !this.chart.isDatasetVisible(index)).map(dataset => dataset.label);
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
			this.chart.config.options.scales.xAxes[0].ticks.min = 0;
			this.chart.config.options.scales.xAxes[0].ticks.max = numSamples;
			this.chart.data.labels = (this.frequencies && this.frequencies.length > 0) ? this.frequencies.map(freq => Math.round(freq).toString()) : Array.from({ length: numSamples }, (_, i) => i);

			// Check if a frequency is supposed to be highlighted
			if (this.lineAtPoint !== -1 && this.chart.data.datasets.length > 0) {
				this.chart.config.lineAtIndex = [this.lineAtPoint];

				const dataset = {
					borderColor: '#1010FF',
					backgroundColor: '#1010FF',
					data: [],
					label: 'Shaper Frequency',
					isShaperFrequency: true
				};
				this.chart.data.datasets.push(dataset);
			} else {
				this.chart.config.lineAtIndex = [];
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

					const factors = getInputShaperFactors(shaperType, this.inputShaperFrequency, this.inputShaperDamping);
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
							label: `${key} + Custom`
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
						label: 'Custom',
						yAxisID: 'damping',
						isCustom: true
					};
					this.chart.data.datasets.push(dataset);
				}
			}

			// Check if a frequency is supposed to be highlighted. Attempt to add this here again in case it wasn't added before
			if (!this.chart.data.datasets.find(dataset => dataset.isShaperFrequency) && this.lineAtPoint !== -1 && this.chart.data.datasets.length > 0) {
				this.chart.config.lineAtIndex = [this.lineAtPoint];

				const dataset = {
					borderColor: '#1010FF',
					backgroundColor: '#1010FF',
					data: [],
					label: 'Shaper Frequency',
					isShaperFrequency: true
				};
				this.chart.data.datasets.push(dataset);
			}

			// Limit number of frequencies
			if (this.frequencies && this.frequencies.length > 0) {
				let maxFrequencyIndex = -1;
				for (let freq of this.frequencies) {
					if (Math.round(freq) > this.wideBand ? 500 : 100) {
						break;
					}
					maxFrequencyIndex++;
				}

				if (maxFrequencyIndex > 0) {
					for (let dataset of this.chart.data.datasets) {
						if (!this.isShaperFrequency) {
							dataset.data.splice(maxFrequencyIndex + 1);
						}
					}
					this.chart.data.labels.splice(maxFrequencyIndex + 1);
					this.chart.config.options.scales.xAxes[0].ticks.max = maxFrequencyIndex;
				}
			}

			// Finish setup
			this.chart.options.scales.xAxes[0].scaleLabel.labelString = (this.frequencies && this.frequencies.length > 0) ? 'Frequency (in Hz)' : 'Sample';
			this.chart.options.scales.yAxes[0].scaleLabel.labelString = (this.frequencies && this.frequencies.length > 0) ? 'Amplitude' : 'Acceleration (in g)';
			this.chart.options.scales.yAxes[0].display = !!this.value;
			this.chart.options.scales.yAxes[1].display = this.showReduction;
			this.chart.options.scales.yAxes[1].position = this.value ? 'right' : 'left';
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
		mouseDown(e) {
			if (this.frequencies && this.frequencies.length > 0) {
				// selection is only possible when viewing samples
				return;
			}

			const activePoints = this.chart.getElementsAtEventForMode(e, 'nearest', { intersect: false });
			if (activePoints && activePoints.length > 0) {
				this.dragStart = activePoints[0]._index;
				this.chart.config.range = { start: e.layerX };
				this.chart.update();

				document.addEventListener('mouseup', this.mouseUp);
			}
		},
		mouseMove(e) {
			if (this.chart.config.range) {
				this.chart.config.range.end = e.layerX;
				this.chart.update();
			}
		},
		mouseUp(e) {
			document.removeEventListener('mouseup', this.mouseUp);

			if (this.chart.config.range && this.chart.config.range.end) {
				const activePoints = this.chart.getElementsAtEventForMode(e, 'nearest', {intersect: false});
				if (activePoints && activePoints.length > 0) {
					const dragEnd = activePoints[0]._index;
					if (Math.abs(dragEnd - this.dragStart) > 4) {
						const trueStart = Math.min(this.dragStart, dragEnd), trueEnd = Math.max(this.dragStart, dragEnd);
						this.$emit('update:sampleStartIndex', trueStart);
						this.$emit('update:sampleEndIndex', trueEnd);
					}
					this.dragStart = null;
				}
			}

			this.chart.config.range = null;
			this.chart.update();
		},
		mouseLeave() {
			if (this.chart.config.range) {
				this.chart.config.range = null;
				this.chart.update();
			}
		},
		doubleClick() {
			this.$emit('update:sampleStartIndex', null);
			this.$emit('update:sampleEndIndex', null);
		},
		arraysDiffer(a, b) {
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
					for (let dataset in this.chart.data.datasets) {
						if (dataset.isCustom) {
							dataset.data = getInputShaperDamping(this.frequencies, this.customAmplitudes, this.customDelays);
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
					for (let dataset in this.chart.data.datasets) {
						if (dataset.isCustom) {
							dataset.data = getInputShaperDamping(this.frequencies, this.customAmplitudes, this.customDelays);
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
			// TODO!
			/*
			this.chart.options.scales.xAxes[0].scaleLabel.labelString = this.$t(this.displaySamples ? 'plugins.accelerometer.samples' : 'plugins.accelerometer.frequency');
			this.chart.options.scales.yAxes[0].scaleLabel.labelString = this.$t(this.displaySamples ? 'plugins.accelerometer.accelerations' : 'plugins.accelerometer.amplitudes');
			this.update();
			 */
		},
		sampleStartIndex(to) {
			if (!this.frequencies || this.frequencies.length === 0) {
				this.chart.config.options.scales.xAxes[0].ticks.min = isNaN(to) ? 0 : to;
				this.chart.update();
			}
		},
		sampleEndIndex(to) {
			if (!this.frequencies || this.frequencies.length === 0) {
				this.chart.config.options.scales.xAxes[0].ticks.max = isNaN(to) ? this.chart.data.datasets.labels.length : to;
				this.chart.update();
			}
		},
		estimateShaperEffect() { this.update(); }
	}
}
</script>
