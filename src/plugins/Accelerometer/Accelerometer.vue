<style scoped>
.content {
	position: relative;
	min-height: 480px;
}

.content > canvas {
	position: absolute;
}
</style>

<template>
	<v-row class="pa-3">
		<v-col cols="auto">
			<v-card tile>
				<v-card-title class="pt-2 pb-1">
					<v-icon class="mr-2">mdi-format-list-bulleted</v-icon> {{ $t('plugins.accelerometer.listTitle') }}
					<v-spacer></v-spacer>
					<v-icon class="ml-2" @click="refresh">mdi-refresh</v-icon>
				</v-card-title>
				<v-card-text class="pa-0" v-show="files.length === 0">
					<v-alert :value="true" type="info" class="mb-0">
						{{ $t('plugins.accelerometer.none') }}
					</v-alert>
				</v-card-text>

				<v-list class="py-0" :disabled="uiFrozen || loading">
					<v-list-item-group :value="selectedFile" color="primary">
						<v-list-item v-for="file in files" :key="file" :value="file" @click="loadFile(file)">
							{{ file }}
						</v-list-item>
					</v-list-item-group>
				</v-list>
			</v-card>
		</v-col>

		<v-col>
			<v-card tile>
				<v-card-text class="pt-2 pb-0">
					<v-icon class="mr-1">mdi-motion-play-outline</v-icon> {{ $t('plugins.accelerometer.recordProfile') }}
				</v-card-text>
				<v-card-text>
					<v-row>
						<v-col>
							<v-select
								:items="recorderMenus.spiFreq"
								:label="$t('plugins.accelerometer.spiFrequency')"
								v-model="recorder.param.spiFreq"
							></v-select>
						</v-col>
						<v-col>
							<v-select
								:items="recorderMenus.csPin"
								:label="$t('plugins.accelerometer.csPin')"
								v-model="recorder.param.csPin"
							></v-select>
						</v-col>
						<v-col>
							<v-select
								:items="recorderMenus.intPin"
								:label="$t('plugins.accelerometer.intPin')"
								v-model="recorder.param.intPin"
							></v-select>
						</v-col>
					</v-row>
					<v-row>
						<v-col>
							<v-select
								:items="recorderMenus.accel"
								:label="$t('plugins.accelerometer.accelerometerId')"
								v-model="recorder.accel"
							></v-select>
						</v-col>
						<v-col>
							<v-select
								:items="recorderMenus.orientationAccel"
								v-model="recorder.param.orientationAccelZ"
								:label="$t('plugins.accelerometer.orientationZ')"
								type="number"
							></v-select>
						</v-col>
						<v-col>
							<v-select
								:items="recorderMenus.orientationAccel"
								v-model.number="recorder.param.orientationAccelX"
								:label="$t('plugins.accelerometer.orientationX')"
								type="number"
							></v-select>
						</v-col>
						<v-col>
							<v-select
								:items="recorderMenusTools"
								v-model="recorder.tool"
								:label="$t('plugins.accelerometer.tool')"
							></v-select>
						</v-col>
					</v-row>
					<v-row>
						<v-col>
							<v-select
								:items="recorderMenusAxis"
								v-model="recorder.axis"
								:label="$t('plugins.accelerometer.axis')"
							></v-select>
						</v-col>
						<v-col>
							<v-text-field
								v-model.number="recorder.param.maxAccel"
								type="number"
								:label="$t('plugins.accelerometer.maxAcceleration')"
							></v-text-field>
						</v-col>
						<v-col>
							<v-text-field
								v-model.number="recorder.param.maxSpeed"
								type="number"
								:label="$t('plugins.accelerometer.maxSpeed')"
							></v-text-field>
						</v-col>
					</v-row>
					<v-row>
						<v-col>
							<v-text-field
								v-model.number="recorder.param.maxPosition"
								type="number"
								:label="$t('plugins.accelerometer.maxPosition')"
							></v-text-field>
						</v-col>
						<v-col>
							<v-text-field
								v-model.number="recorder.param.startPosition"
								type="number" :min="recorder.param.minPosition" :max="recorder.param.maxPosition"
								:label="$t('plugins.accelerometer.startPosition')"
							></v-text-field>
						</v-col>
						<v-col>
							<v-text-field
								v-model.number="recorder.param.stopPosition"
								type="number" :min="recorder.param.minPosition" :max="recorder.param.maxPosition"
								:label="$t('plugins.accelerometer.stopPosition')"
							></v-text-field>
						</v-col>
					</v-row>
					<v-row>
						<v-col>
							<v-card-text class="">
							{{ $t('plugins.accelerometer.filename') }}:<br>
							<span class="font-weight-bold"> {{ this.recorderFilename }}</span>
							</v-card-text>
							<v-card-text label="Movement Command">
								{{ this.recorder.initCommand }}<br>
								{{ this.recorder.moveCommand }}<br>
								{{ this.recorder.testCommand }}<br>
								movement...
							</v-card-text>
						</v-col>
						<v-col>
							<v-btn :disabled="recorder.state === AccelStates.RUNNING" color="primary" @click="configureAccelerometer">
								<v-icon class="mr-2">mdi-arrow-right</v-icon> {{ $t('plugins.accelerometer.configureAccelerometer') }}
							</v-btn>
							<v-btn :disabled="recorder.state === AccelStates.RUNNING" color="primary" @click="recordProfile">
								<v-icon class="mr-2">mdi-arrow-right</v-icon> {{ $t('plugins.accelerometer.recordProfile') }}
							</v-btn>
						</v-col>
					</v-row>
				</v-card-text>
			</v-card>
			<v-card class="d-flex flex-column flex-grow-1">
				<v-card-title class="pt-2 pb-0">
					<v-icon class="mr-1">mdi-chart-timeline-variant</v-icon> {{ $t('plugins.accelerometer.chartCaption') }}
				</v-card-title>

				<v-card-text v-show="selectedFile !== null" class="content flex-grow-1 px-2 py-0" @mousedown.passive="mouseDown" @mouseup.passive="mouseUp">
					<canvas ref="chart"></canvas>
				</v-card-text>

				<v-spacer v-show="selectedFile !== null && alertMessage !== null"></v-spacer>

				<v-card-text class="pa-0" v-show="alertMessage !== null">
					<v-alert :value="true" :type="alertType" class="mb-0">
						{{ alertMessage  }}
					</v-alert>
				</v-card-text>
			</v-card>

			<v-card class="mt-5" v-show="selectedFile !== null">
				<v-card-title>
					<v-icon class="mr-2">mdi-calculator</v-icon> {{ $t('plugins.accelerometer.analysis') }}
				</v-card-title>

				<v-card-text>
					<v-row>
						<v-col>
							<v-text-field v-model="samplingRate" :label="$t('plugins.accelerometer.samplingRate')" type="number" :rules="samplingRateRules" :min="400" :max="6000" hide-details :disabled="!displaySamples" @update:error="samplingRateValidated = !$event"></v-text-field>
						</v-col>
						<v-col>
							<v-slider v-model="start" :max="end - 1" :label="$t('plugins.accelerometer.start')" thumb-label="always" class="pt-7" hide-details :disabled="!displaySamples" @input="applyStartEnd"></v-slider>
						</v-col>
						<v-col>
							<v-slider v-model="end" :min="start + 1" :max="samples.length - 1" :label="$t('plugins.accelerometer.end')" thumb-label="always" class="pt-7" hide-details :disabled="!displaySamples" @input="applyStartEnd"></v-slider>
						</v-col>
						<v-col cols="auto">
							<v-checkbox v-model="wideBand" :label="$t('plugins.accelerometer.wideBand')" hide-details :disabled="!displaySamples" class="mt-2"></v-checkbox>
						</v-col>
						<v-col cols="auto">
							<v-btn v-show="displaySamples" color="primary" :disabled="!samplingRateValidated || !datasetVisible || !displaySamples" @click="analyze">
								<v-icon class="mr-2">mdi-arrow-right</v-icon> {{ $t('plugins.accelerometer.analyze') }}
							</v-btn>
							<v-btn v-show="!displaySamples" color="success" @click="showSamples">
								<v-icon class="mr-2">mdi-arrow-left</v-icon> {{ $t('plugins.accelerometer.back') }}
							</v-btn>
						</v-col>
					</v-row>
				</v-card-text>
			</v-card>

			<v-card tile>
				<v-card-text class="mt-5">
					<v-icon class="mr-1">mdi-motion-play-outline</v-icon> {{ $t('plugins.accelerometer.inputShapingConfiguration') }}
				</v-card-text>

				<v-card-text>
					<v-row>
						<v-col>
							<v-select
								:items="Object.values(MoveShapingType)"
								v-model="inputshaping.algorithm"
								:label="$t('plugins.accelerometer.algorithm')"
							></v-select>
						</v-col>
						<v-col>
							<v-text-field
								v-model.number="inputshaping.frequency"
								type="number"
								:label="$t('plugins.accelerometer.frequency')"
							></v-text-field>
						</v-col>
						<v-col>
							<v-text-field
								v-model.number="inputshaping.damping"
								type="number"
								:label="$t('plugins.accelerometer.damping')"
							></v-text-field>
						</v-col>
						<v-col>
							<v-text-field
								v-model.number="inputshaping.minAcceleration"
								type="number"
								:label="$t('plugins.accelerometer.minAcceleration')"
							></v-text-field>
						</v-col>
					</v-row>
				</v-card-text>

				<v-card-text>
					<v-row>
						<v-col>
							{{ inputshapingCommand }}
						</v-col>
						<v-col>
							<v-btn :disabled="recorder.state === AccelStates.RUNNING" color="primary" @click="configureInputShaping">
								<v-icon class="mr-2">mdi-arrow-right</v-icon> {{ $t('plugins.accelerometer.configure') }}
							</v-btn>
						</v-col>
					</v-row>
				</v-card-text>
			</v-card>
		</v-col>

		<confirm-dialog :title="$t('plugins.accelerometer.overflowPrompt.title')" :prompt="$t('plugins.accelerometer.overflowPrompt.prompt')" :shown.sync="showOverflowConfirmation" @cancel="resolveOverflowPromise(false)" @confirmed="resolveOverflowPromise(true)"></confirm-dialog>
	</v-row>
</template>

<script>
'use strict'

import Chart from 'chart.js'

import { mapState, mapGetters, mapActions } from 'vuex'

import CSV from '../../utils/csv.js'
import Events from '../../utils/events.js'
import Path from '../../utils/path.js'
import { MoveShapingType } from '../../store/machine/modelEnums.js'

import { transform } from './fft.js'
import { AccelStates } from './AccelerometerEnums.js'


export default {
	computed: {
		...mapState(['selectedMachine']),
		...mapState('machine', ['model']),
		...mapGetters(['isConnected', 'uiFrozen']),
		'recorderMenusAxis': function () {
			if (this.model.move.axes.length == 0) {
				return [];
			}

			let axis = [];
			this.model.move.axes.forEach(item => axis.push(item.letter));

			return axis;
		},
		'recorderMenusTools': function() {
			if (this.model.tools.length == 0) {
				return [];
			}

			let tools = [];
			this.model.tools.forEach(item => tools.push(item.name));

			return tools;
		},
		'recorderFilename': function() {
				return `input-shaping-${this.recorder.iteration}-${this.recorder.axis}-${this.inputshaping.algorithm}.csv`;
		},
		'inputshapingCommand': function() {

			if (this.inputshaping.algorithm === this.MoveShapingType.none)
				return `M593 P"${this.inputshaping.algorithm}"`;

			return `M593 P"${this.inputshaping.algorithm}" F${this.inputshaping.frequency} S${this.inputshaping.damping} L${this.inputshaping.minAcceleration}`;
		}
	},
	data() {
		return {
			files: [],
			selectedFile: null,

			loading: false,
			alertType: 'error',
			alertMessage: null,
			showOverflowConfirmation: false,
			resolveOverflowPromise: null,
			displaySamples: true,

			recorderMenus: {
				spiFreq:[ 500000, 1000000, 2000000 ],
				orientationAccel: [ 0, 1, 2, 3, 4, 5, 6 ],
				csPin: [ "io1.out", "io2.out", "io3.out", "spi.cs1", "spi.cs2", "spi.cs3" ],
				intPin: ["io1.in", "io2.in", "io3.in" ],
				accel: [ 0, 1, 2, 3, 4 ],
			},
			AccelStates: AccelStates,
			MoveShapingType: MoveShapingType,
			recorder: {
				state: AccelStates.INIT,

				initCommand: null,
				moveCommand: null,
				testCommand: null,

				iteration: 0,

				tool: null,
				axis: null,
				accel: null,
				param: {
					// spi specific paramters
					spiFreq: 2000000,
					csPin: null,
					intPin: null,
					orientationAccelZ: 2,
					orientationAccelX: 0,

					timeout: 5000, // measurement timeout in milliseconds

					// axis specific parameters (watch if calibration axis changed if so, update these fields)
					maxAccel: 0, // prefill machine->move->axis->AXIS->acceleration
					maxSpeed: 0, // prefill machine->move->axis->AXIS->speed
					minPosition: 0, // prefill machine->move->axis->AXIS->min
					maxPosition: 0, // prefill machine->move->axis->AXIS->max
					startPosition: 0, // prefill maxPosition * 4 / 10
					stopPosition: 0, // prefill maxPosition * 6 / 10
				}
			},
			inputshaping: {
				algorithm: MoveShapingType.none,
				frequency: 0, // in Hz
				damping: 0.1,
				minAcceleration: 10, // in mm/s^2
				command: null
			},

			start: 0,
			dragStart: null,
			end: 0,
			datasetVisible: true,
			samples: [],
			samplingRate: 1000,
			samplingRateRules: [
				function(value) {
					value = parseFloat(value);
					return value >= 400 && value <= 6000;
				}
			],
			samplingRateValidated: true,
			wideBand: false
		}
	},
	methods: {
		...mapActions('machine', ['download', 'getFileList', 'sendCode']),
		async refresh() {
			if (!this.isConnected) {
				this.ready = false;
				this.errorMessage = null;
				this.selectedFile = null;
				this.files = [];
				return;
			}

			if (this.loading) {
				// Don't do multiple actions at once
				return;
			}

			this.loading = true;
			try {
				const files = (await this.getFileList(Path.accelerometer))
					.filter(file => !file.isDirectory && file.name !== Path.filamentsFile && file.name.endsWith('.csv'));
				files.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
				this.files = files.map(file => file.name);
			} finally {
				this.loading = false;
			}

			if (this.files.indexOf(this.selectedFile) === -1) {
				this.selectedFile = null;
			}
		},
		filesOrDirectoriesChanged({ machine, files }) {
			if (machine === this.selectedMachine) {
				if (this.selectedFile && files.indexOf(Path.combine(Path.accelerometer, this.selectedFile)) >= 0) {
					// Current heightmap has been changed, reload it and then refresh the list
					this.loadFile(this.selectedFile).then(this.refresh);
				}
				else if (files.some(file => file.endsWith('.csv')) && Path.filesAffectDirectory(files, Path.accelerometer)) {
					// CSV file or directory has been changed
					this.refresh();
				}
			}
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
		async configureAccelerometer() {
			this.recorder.state = AccelStates.RUNNING;
			let result = await this.sendCode(this.recorder.initCommand);
			this.recorder.state = AccelStates.HALTED;
			console.log("configure accelerometer: ", this.recorder.initCommand, "result: ", result);
		},
		async recordProfile() {
			this.recorder.state = AccelStates.RUNNING;
			await this.configureAccelerometer();
			let result = await this.sendCode(this.recorder.moveCommand + this.recorder.testCommand);
			this.loadFile(this.filename).then(this.refresh);
			this.recorder.state = AccelStates.HALTED;
			console.log("record profile: ", this.recorder.testCommand, "result: ", result);
		},
		async configureInputShaping() {
			this.recorder.iteration = this.recorder.iteration + 1;

			this.recorder.state = AccelStates.RUNNING;
			let result = await this.sendCode(this.inputshapingCommand);
			this.recorder.state = AccelStates.HALTED;
			console.log("configure input shaping: ", this.inputshapingCommand, "result: ", result);

			return;
		},
		async loadFile(file) {
			let csvFile;

			// Restore previous view if needed
			if (!this.displaySamples) {
				this.showSamples();
			}

			// Download the selected file
			this.loading = true;
			try {
				try {
					csvFile = await this.download({
						filename: Path.combine(Path.accelerometer, file),
						type: 'text',
						showProgress: false,
						showSuccess: false,
						showError: false
					});
				} finally {
					this.loading = false;
				}
			} catch (e) {
				this.alertType = 'error';
				this.alertMessage = this.$t('plugins.accelerometer.loadError');
				console.warn(e);
				return;
			}

			// Clean up
			this.axes = [];
			this.accelerations = [];
			this.alertType = 'info';
			this.alertMessage = this.$t('plugins.accelerometer.noData');
			this.chart.data.datasets = [];
			this.selectedFile = null;

			try {
				// Load the CSV
				const csv = new CSV(csvFile);
				if (csv.headers.length < 2 || csv.headers[0] !== 'Sample' || csv.content.length < 2) {
					throw new Error('Invalid CSV format');
				}

				// Extract details
				const details = /Rate (\d+) overflows (\d)/.exec(csv.content[csv.content.length - 1].reduce((a, b) => a + b));
				if (!details) {
					throw new Error('Failed to read rate and overflows');
				}
				const samplingRate = parseFloat(details[1]), overflows = parseFloat(details[2]);

				// Show confirmation prompt if there are overflows
				if (overflows > 0) {
					this.showOverflowConfirmation = true;
					const that = this;
					if (!await new Promise(resolve => that.resolveOverflowPromise = resolve)) {
						// User doesn't want to display sample file with overflows
						return;
					}
				}
				this.alertMessage = null;

				// Add the samples
				let minValue = 0, maxValue = 0, numSamples = 0;
				this.chart.data.labels = [];
				this.chart.data.datasets = [];
				for (let axis = 1; axis < csv.headers.length; axis++) {
					const dataset = {
						borderColor: this.getLineColor(axis - 1),
						backgroundColor: this.getLineColor(axis - 1),
						pointBorderWidth: 0.25,
						pointRadius: 2,
						borderWidth: 1.25,
						data: [],
						fill: false,
						label: csv.headers[axis]
					};
					for (let sample = 0; sample < csv.content.length - 1; sample++) {
						if (csv.content[sample].length === csv.headers.length) {
							const value = parseFloat(csv.content[sample][axis]);
							if (value < minValue) {
								minValue = value;
							}
							if (value > maxValue) {
								maxValue = value;
							}
							dataset.data.push(value);
							if (dataset.data.length > numSamples) { 
								numSamples = dataset.data.length;
								this.chart.data.labels.push(dataset.data.length);
							}
						}
					}
					this.chart.data.datasets.push(dataset);
				}
				this.samples = csv.content
					.filter((value, index) => index > 0)
					.map(axisSamples => axisSamples
						.filter((value, index) => index > 0)
						.map(value => parseFloat(value)));

				// Render the chart and apply sample rate
				this.start = this.chart.config.options.scales.xAxes[0].ticks.min = 0;
				this.end = this.chart.config.options.scales.xAxes[0].ticks.max = numSamples;
				this.chart.update();
				this.samplingRate = samplingRate;

				// Check if any dataset is visible
				let datasetVisible = false;
				for (let i = 0; i < this.chart.data.datasets.length; i++) {
					if (this.chart.isDatasetVisible(i)) {
						datasetVisible = true;
						break;
					}
				}
				this.datasetVisible = datasetVisible;
			} catch (e) {
				this.alertType = 'error';
				this.alertMessage = this.$t('plugins.accelerometer.parseError');
				console.warn(e);
				return;
			}

			// File now selected
			this.selectedFile = file;
			this.displaySamples = true;
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
		applyStartEnd() {
			if (this.chart) {
				this.chart.config.options.scales.xAxes[0].ticks.min = this.start;
				this.chart.config.options.scales.xAxes[0].ticks.max = this.end;
				this.chart.update();
			}
		},
		analyze() {
			// Compute how many frequencies may be displayed
			const numPoints = this.end - this.start, resolution = this.samplingRate / numPoints;
			const numFreqs = Math.floor(Math.min(numPoints / 2, (this.wideBand ? (this.samplingRate / 2) : 200) / resolution));

			// Perform frequency analysis for visible datasets
			const newDatasets = [];
			for (let i = 0; i < this.chart.data.datasets.length; i++) {
				if (this.chart.isDatasetVisible(i) && this.chart.data.datasets[i].label.length === 1) {
					// Perform FFT of the selected area
					const real = this.samples.map(axisSamples => axisSamples[i]).slice(this.start, this.end)
					const imag = new Array(numPoints);
					imag.fill(0);
					transform(real, imag);

					// Compute the amplitudes
					const amplitudes = new Array(numFreqs);
					for (let k = 1; k <= numFreqs; k++) {
						amplitudes[k - 1] = (Math.sqrt(real[k] * real[k] + imag[k] * imag[k]) / numPoints).toFixed(5);
					}

					// Add new dataset
					const dataset = {
						borderColor: this.getLineColor(i),
						backgroundColor: this.getLineColor(i),
						pointBorderWidth: 0.25,
						pointRadius: 2,
						borderWidth: 1.25,
						data: amplitudes,
						fill: false,
						label: this.chart.data.datasets[i].label
					};
					newDatasets.push(dataset);
				}
			}

			// Generate frequencies
			const frequencies = new Array(numFreqs);
			for (let i = 0; i < numFreqs; i++) {
				frequencies[i] = Math.round(i * resolution + resolution / 2);
			}

			// Remove obsolete datasets, rewrite the legends, and update the chart
			this.sampleLabels = this.chart.data.labels;
			this.sampleDatasets = this.chart.data.datasets;
			this.chart.data.labels = frequencies;
			this.chart.data.datasets = newDatasets;
			this.chart.options.scales.xAxes[0].scaleLabel.labelString = this.$t('plugins.accelerometer.frequency');
			this.chart.options.scales.yAxes[0].scaleLabel.labelString = this.$t('plugins.accelerometer.amplitudes');
			const that = this;
			this.chart.options.tooltips.callbacks.title = items => that.$t('plugins.accelerometer.frequencyTooltip', [(items[0].index * resolution + resolution / 2).toFixed(1), (resolution / 2).toFixed(1)]);
			this.chart.config.options.scales.xAxes[0].ticks.min = 0;
			this.chart.config.options.scales.xAxes[0].ticks.max = numFreqs * resolution;
			this.chart.update();
			this.displaySamples = false;
		},
		showSamples() {
			this.chart.data.labels = this.sampleLabels;
			this.chart.data.datasets = this.sampleDatasets;
			this.chart.options.scales.xAxes[0].scaleLabel.labelString = this.$t('plugins.accelerometer.samples');
			this.chart.options.scales.yAxes[0].scaleLabel.labelString = this.$t('plugins.accelerometer.accelerations');
			const that = this;
			this.chart.options.tooltips.callbacks.title = items => that.$t('plugins.accelerometer.sampleTooltip', [items[0].index]);
			this.applyStartEnd();
			this.displaySamples = true;
		}
	},
	mounted() {
		// Set up initial message
		this.alertType = 'info';
		this.alertMessage = this.$t('plugins.accelerometer.noData');

		// Reload the file list
		this.refresh();

		// Prepare chart
		const that = this;
		this.options = {
			maintainAspectRatio: false,
			tooltips: {
				mode: 'index',
				intersect: false,
				callbacks: {
					title: items => that.$t('plugins.accelerometer.sampleTooltip', [items[0].index])
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
							labelString: this.$t('plugins.accelerometer.samples')
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
							labelString: this.$t('plugins.accelerometer.accelerations')
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

		// Keep track of file changes
		this.$root.$on(Events.filesOrDirectoriesChanged, this.filesOrDirectoriesChanged);
	},
	beforeDestroy() {
		// No longer keep track of file changes
		this.$root.$off(Events.filesOrDirectoriesChanged, this.filesOrDirectoriesChanged);
	},
	watch: {
		language() {
			// TODO update chart
			this.chart.options.scales.xAxes[0].scaleLabel.labelString = this.$t(this.displaySamples ? 'plugins.accelerometer.samples' : 'plugins.accelerometer.frequency');
			this.chart.options.scales.yAxes[0].scaleLabel.labelString = this.$t(this.displaySamples ? 'plugins.accelerometer.accelerations' : 'plugins.accelerometer.amplitudes');
			this.chart.update();
		},
		recorder: {
			handler () {
				// build configure and test command
				this.recorder.initCommand = `M955 P${this.recorder.accel} I${this.recorder.param.orientationAccelZ}${this.recorder.param.orientationAccelX} S100 R10 C"${this.recorder.param.csPin}+${this.recorder.param.intPin}" Q${this.recorder.param.spiFreq}`;
				this.recorder.moveCommand = `G1 ${this.recorder.axis}${this.recorder.param.startPosition} G4 S2 G1 ${this.recorder.axis}${this.recorder.param.stopPosition}`;
				this.recorder.testCommand = `M956 P${this.recorder.accel} S${this.recorder.param.timeout} A1 F"${this.recorderFilename}"`;
			},
			deep: true,
		},
		'recorder.axis': {
			handler() {
				if (this.model.move.axes.length <= 0)
					return;

				let index = this.model.move.axes.findIndex(item => item.letter === this.recorder.axis);
				if (index < 0)
					return;

				this.recorder.param.maxAccel = this.model.move.axes[index].acceleration;
				this.recorder.param.minPosition = this.model.move.axes[index].min;
				this.recorder.param.maxPosition = this.model.move.axes[index].max;

				this.recorder.param.startPosition = this.recorder.param.maxPosition * 4 / 10;
				this.recorder.param.stopPosition = this.recorder.param.maxPosition * 6 / 10;
			}
		},
		'recorderMenusAxis': function() {
			console.log("set default axis");
			if (this.recorderMenusAxis.length <= 0)
				return;

			this.recorder.axis = this.recorderMenusAxis[0];
		},
		'recorderMenusTools': function() {
			console.log("set default tools");
			if (this.recorderMenusTools.length <= 0)
				return;

			this.recorder.tool = this.recorderMenusTools[0];
		},
	}
}
</script>
