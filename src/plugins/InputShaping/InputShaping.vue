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
	<div>
		<v-tabs v-model="selectedTab">
			<v-tab href="#recordProfile">
				<v-icon class="mr-1">mdi-motion-play-outline</v-icon> {{ $t('plugins.inputShaping.recordProfile') }}
			</v-tab>
			<v-tab href="#analysis">
				<v-icon class="mr-1">mdi-chart-timeline-variant</v-icon> {{ $t('plugins.inputShaping.analysis') }}
			</v-tab>
			<v-tab href="#inputShaping">
				<v-icon class="mr-1">mdi-tune</v-icon> {{ $t('plugins.inputShaping.inputShapingConfiguration') }}
			</v-tab>
		</v-tabs>

		<v-tabs-items v-model="selectedTab">
			<!-- Record Profile -->
			<v-tab-item value="recordProfile" class="pa-3">
				<v-form ref="formRecordProfile" @submit.prevent="submit">
					<v-row>
						<v-col>
							<v-text-field
									:label="$t('plugins.inputShaping.accelerometerId')"
									v-model="recorder.accel"
									:rules="rules.recorder.accel"
									required
									></v-text-field>
						</v-col>
					</v-row>
					<v-row>
						<v-col>
							<v-select
									:items="recorderMenuAxis"
									v-model="recorder.axis"
									:label="$t('plugins.inputShaping.axis')"
									:rules="rules.recorder.axis"
									></v-select>
						</v-col>
						<v-col>
							<v-text-field
									v-model.number="recorder.param.numSamples"
									type="number" :min="1" :max="65535"
									:label="$t('plugins.inputShaping.numSamples')"
									:rules="rules.recorder.numSamples"
									></v-text-field>
						</v-col>
					</v-row>
					<v-row>
						<v-col>
							<v-text-field
									v-model.number="recorder.param.startPosition"
									type="number" :min="recorder.param.minPosition" :max="recorder.param.maxPosition"
									:label="$t('plugins.inputShaping.startPosition')"
									:rules="rules.recorder.startPosition"
									></v-text-field>
						</v-col>
						<v-col>
							<v-text-field
									v-model.number="recorder.param.stopPosition"
									type="number" :min="recorder.param.minPosition" :max="recorder.param.maxPosition"
									:label="$t('plugins.inputShaping.stopPosition')"
									:rules="rules.recorder.stopPosition"
									></v-text-field>
						</v-col>
					</v-row>
				</v-form>
				<v-row>
					<v-col>
						{{ $t('plugins.inputShaping.maxAcceleration', [recorder.param.maxAccel]) }}<br>
						{{ $t('plugins.inputShaping.maxSpeed', [recorder.param.maxSpeed]) }}<br>
						{{ $t('plugins.inputShaping.minPosition', [recorder.param.minPosition]) }}<br>
						{{ $t('plugins.inputShaping.maxPosition', [recorder.param.maxPosition]) }}
					</v-col>
					<v-col>
						{{ $t('plugins.inputShaping.filename') }}:<br>
						<span class="font-weight-bold"> {{ this.recorderFilename }}</span><br><br>
						Movement command: {{ this.recorder.testCommand }}
					</v-col>
					<v-col>
						<v-btn :disabled="recorder.state === AccelStates.RUNNING" color="primary" @click="recordProfile">
							<v-icon class="mr-2">mdi-arrow-right</v-icon> {{ $t('plugins.inputShaping.recordProfile') }}
						</v-btn>
					</v-col>
				</v-row>
			</v-tab-item>

			<!-- Profile Analysis -->
			<v-tab-item value="analysis" eager class="py-3">
				<v-row>
					<!-- CSV File List -->
					<v-col cols="auto">
						<v-card tile class="mt-2">
							<v-card-title class="pt-2 pb-1">
								<v-icon class="mr-2">mdi-format-list-bulleted</v-icon> {{ $t('plugins.inputShaping.listTitle') }}
								<v-spacer></v-spacer>
								<v-icon class="ml-2" @click="refresh">mdi-refresh</v-icon>
							</v-card-title>
							<v-card-text class="pa-0" v-show="files.length === 0">
								<v-alert :value="true" type="info" class="mb-0">
									{{ $t('plugins.inputShaping.none') }}
								</v-alert>
							</v-card-text>

							<v-list class="py-0" :disabled="uiFrozen || loading">
								<v-list-item-group :value="selectedFile" color="primary" mandatory>
									<v-list-item v-for="file in files" :key="file" :value="file" @click="loadFile(file)">
										{{ file }}
									</v-list-item>
								</v-list-item-group>
							</v-list>
						</v-card>
					</v-col>

					<!-- Analysis Panel -->
					<v-col>
						<v-card class="d-flex flex-column flex-grow-1 mt-2">
							<v-card-title class="pt-2 pb-0">
								<v-icon class="mr-1">mdi-chart-timeline-variant</v-icon> {{ $t('plugins.inputShaping.chartCaption') }}:

								<v-list class="py-0" :disabled="uiFrozen || loading">
									<v-list-item-group :value="recordList" color="primary" mandatory>
										<v-list-item v-for="name in recordList" :key="name" :value="name" @click="sessionRemove(name)">
											{{ name }}
										</v-list-item>
									</v-list-item-group>
								</v-list>
							</v-card-title>

							<v-spacer></v-spacer>

							<v-card-text class="pa-0" v-show="alertMessage !== null">
								<v-alert :value="true" :type="alertType" class="mb-0">
									{{ alertMessage  }}
								</v-alert>
							</v-card-text>

							<v-spacer></v-spacer>

							<v-card-text class="content flex-grow-1 px-2 py-0" @mousedown.passive="mouseDown" @mouseup.passive="mouseUp">
								<canvas ref="chart"></canvas>
							</v-card-text>

						</v-card>

						<v-card class="mt-5" v-show="true">
							<v-card-title>
								<v-icon class="mr-2">mdi-calculator</v-icon> {{ $t('plugins.inputShaping.analysis') }}
							</v-card-title>

							<v-card-text>
								<v-row>
									<v-col>
										<v-text-field v-model="samplingRate" :label="$t('plugins.inputShaping.samplingRate')" type="number" hide-details :disabled="!displaySamples"></v-text-field>
									</v-col>
									<v-col cols="auto">
										<v-checkbox v-model="wideBand" :label="$t('plugins.inputShaping.wideBand')" hide-details :disabled="!displaySamples" class="mt-2"></v-checkbox>
									</v-col>
									<v-col cols="auto">
										<v-btn v-show="true" color="primary" @click="updateChartFft">
											<v-icon class="mr-2">mdi-arrow-right</v-icon> {{ $t('plugins.inputShaping.analyze') }}
										</v-btn>
										<v-btn v-show="true" color="success" @click="updateChart">
											<v-icon class="mr-2">mdi-arrow-left</v-icon> {{ $t('plugins.inputShaping.back') }}
										</v-btn>
									</v-col>
								</v-row>
							</v-card-text>
						</v-card>
					</v-col>
				</v-row>
			</v-tab-item>

			<!-- Input Shaping Configuration -->
			<v-tab-item value="inputShaping" class="pa-3">
				<v-form ref="formInputShaping" @submit.prevent="submit">
					<v-row>
						<v-col>
							<v-select
								:items="Object.values(InputShapingType)"
								v-model="inputShaping.algorithm"
								:label="$t('plugins.inputShaping.algorithm')"
								:rules="rules.inputShaping.algorithm"
								></v-select>
						</v-col>
						<v-col>
							<v-text-field
								v-model.number="inputShaping.frequency"
								type="number"
								:label="$t('plugins.inputShaping.frequency')"
								:rules="rules.inputShaping.frequency"
								></v-text-field>
						</v-col>
						<v-col>
							<v-text-field
								v-model.number="inputShaping.damping"
								type="number"
								:label="$t('plugins.inputShaping.damping')"
								:rules="rules.inputShaping.damping"
								></v-text-field>
						</v-col>
						<v-col>
							<v-text-field
								v-model.number="inputShaping.minAcceleration"
								type="number"
								:label="$t('plugins.inputShaping.minAcceleration')"
								:rules="rules.inputShaping.minAcceleration"
								></v-text-field>
						</v-col>
					</v-row>
				</v-form>

				<v-row>
					<v-col>
						{{ inputShapingCommand }}
					</v-col>
					<v-col>
						<v-btn :disabled="recorder.state === AccelStates.RUNNING" color="primary" @click="configureInputShaping">
							<v-icon class="mr-2">mdi-arrow-right</v-icon> {{ $t('plugins.inputShaping.configure') }}
						</v-btn>
					</v-col>
				</v-row>
				<v-row v-if="inputShapingConfig !== null">
					Current Configuration:
					Algorithm: "{{ inputShapingConfig.type }}",
					Frequency (in Hz): {{ inputShapingConfig.frequency }},
					Damping: {{ inputShapingConfig.damping }},
					minAcceleration: {{ inputShapingConfig.minAcceleration }}
				</v-row>
			</v-tab-item>
		</v-tabs-items>

		<confirm-dialog :title="$t('plugins.inputShaping.overflowPrompt.title')" :prompt="$t('plugins.inputShaping.overflowPrompt.prompt')" :shown.sync="showOverflowConfirmation" @cancel="resolveOverflowPromise(false)" @confirmed="resolveOverflowPromise(true)"></confirm-dialog>
	</div>
</template>

<script>
'use strict'

import Chart from 'chart.js'

import { mapState, mapGetters, mapActions } from 'vuex'

import Events from '../../utils/events.js'
import Path from '../../utils/path.js'
import { InputShapingType } from '../../store/machine/modelEnums.js'

import { AccelStates } from './InputShapingEnums.js'
import { Record, Session } from './InputShapingSession.js'
import { makeNotification } from '../../utils/toast.js'

export default {
	computed: {
		...mapState(['selectedMachine']),
		...mapState('machine', ['model']),
		...mapGetters(['isConnected', 'uiFrozen']),
		recorderMenuAxis() {
			return this.model.move.axes.map(axis => axis.letter);
		},
		recorderFilename() {
			return `input-shaping-${this.recorder.iteration}-${this.recorder.axis}-${this.inputShaping.algorithm}.csv`;
		},
		inputShapingCommand() {
			if (this.inputShaping.algorithm === this.InputShapingType.none)
				return `M593 P"${this.inputShaping.algorithm}"`;

			return `M593 P"${this.inputShaping.algorithm}" F${this.inputShaping.frequency} S${this.inputShaping.damping} L${this.inputShaping.minAcceleration}`;
		},
		inputShapingConfig() {
			return this.model.move.shaping;
		},
		machineStatus() {
			console.log("machine status", this.model.state.status, "recorder status", this.recorder.state);

			return this.model.state.status;
		}
	},
	data() {
		return {
			selectedTab: 'recordProfile',

			rules: {
				recorder: {
					accel: [
						v => /^\d+(?:\.\d+)?$/.test(v) || this.$t('plugins.inputShaping.validAccelerationId'),
					],
					axis: [
						v => (this.model.move.axes.find(axis => axis.letter === v) && true) || this.$t('plugins.inputShaping.validAxis'),
					],
					numSamples: [
						v => /\d+/.test(v) || this.$t('plugins.inputShaping.validInteger'),
						v => v > 0 || this.$t('plugins.inputShaping.greaterThan', [ 0 ]),
						v => v <= 65535 || this.$t('plugins.inputShaping.smallerThanOrEqualTo', [ 655535 ]),
					],
					startPosition: [
						v => /\d+/.test(v) || this.$t('plugins.inputShaping.validInteger'),
						v => (typeof v === "number" && this.recorder.axis ? true : false) || this.$t('plugins.inputShaping.axisFirst'),
						v => (v >= this.recorder.param.minPosition) || this.$t('plugins.inputShaping.greaterThan', [ this.recorder.param.minPosition ]),
						v => (v < this.recorder.param.stopPosition) || this.$t('plugins.inputShaping.smallerThan', [ this.recorder.param.stopPosition ]),
						v => (v <= this.recorder.param.maxPosition) || this.$t('plugins.inputShaping.smallerThan', [ this.recorder.param.maxPosition ]),
					],
					stopPosition: [
						v => /\d+/.test(v) || this.$t('plugins.inputShaping.validInteger'),
						v => (typeof v === "number" && this.recorder.axis ? true : false) || this.$t('plugins.inputShaping.axisFirst'),
						v => (v >= this.recorder.param.minPosition) || this.$t('plugins.inputShaping.greaterThan', [ this.recorder.param.minPosition ]),
						v => (v > this.recorder.param.startPosition) || this.$t('plugins.inputShaping.greaterThan', [ this.recorder.param.startPosition ]),
						v => (v <= this.recorder.param.maxPosition) || this.$t('plugins.inputShaping.smallerThanOrEqualTo', [ this.recorder.param.maxPosition ]),
					],
				},
				inputShaping: {
					algorithm: [
						v => Object.values(this.InputShapingType).find(val => val === v) && true || this.$t('plugins.inputShaping.validAlgorithm'),
					],
					frequency: [
						v => v > 5 || this.$t('plugins.inputShaping.greaterThan', [ 5 ]),
						v => v <= 1000 || this.$t('plugins.inputShaping.smallerThanOrEqualTo', [ 1000 ]),
					],
					damping: [
						v => v > 0 || this.$t('plugins.inputShaping.greaterThan', [ 0 ]),
						v => v < 1 || this.$t('plugins.inputShaping.smallerThan', [ 1 ]),
					],
					minAcceleration: [
						v => typeof v === "number" || this.$t('plugins.inputShaping.validAcceleration'),
					]
				}
			},

			// Record Profile
			AccelStates: AccelStates,
			recorder: {
				state: AccelStates.IDLE,
				debounceTimer: null,

				testCommand: null,

				iteration: 0,

				axis: null,
				accel: null,
				param: {
					numSamples: 1000,			// number of samples to collect by M956

					// axis specific parameters (watch if calibration axis changed if so, update these fields)
					maxAccel: 0,				// prefill machine->move->axis->AXIS->acceleration
					maxSpeed: 0,				// prefill machine->move->axis->AXIS->speed (in mm/s)
					minPosition: 0,				// prefill machine->move->axis->AXIS->min
					maxPosition: 0,				// prefill machine->move->axis->AXIS->max
					startPosition: 0,			// prefill maxPosition * 4 / 10
					stopPosition: 0				// prefill maxPosition * 6 / 10
				}
			},

			// Frequency Analysis
			files: [],
			selectedFile: null,
			session: null,
			recordList: [],

			loading: false,
			alertType: 'error',
			alertMessage: null,
			showOverflowConfirmation: false,
			resolveOverflowPromise: null,
			displaySamples: true,

			start: 0,
			dragStart: null,
			end: 0,
			samples: [],
			samplingRate: 1000,
			samplingRateRules: [
				function(value) {
					value = parseFloat(value);
					return value >= 300 && value <= 6000;
				}
			],
			wideBand: false,

			// Input Shaping
			InputShapingType: InputShapingType,
			inputShaping: {
				algorithm: InputShapingType.none,
				frequency: 0, // in Hz
				damping: 0.1,
				minAcceleration: 10, // in mm/s^2
				command: null
			}
		}
	},
	methods: {
		...mapActions('machine', ['download', 'getFileList', 'sendCode']),

		// Record Profile
		async recordProfile() {
			let valid = this.$refs.formRecordProfile.validate();
			if (!valid) {
				makeNotification("error", this.$t('plugins.inputShaping.name'),
					this.$t('plugins.inputShaping.parametersNotValid'));
				console.error("invalid values in record profile form.");
				return;
			}

			let axis = this.model.move.axes.find(axis => axis.letter === this.recorder.axis);
			if (axis.homed === false) {
				makeNotification("error", this.$t('plugins.inputShaping.name'),
					this.$t('plugins.inputShaping.axisNotHomed'));
				console.error("axis not homed.");
				return;
			}

			if (this.model.state.status !== "idle") {
				makeNotification("error", this.$t('plugins.inputShaping.name'),
					this.$t('plugins.inputShaping.printerBusy'));
				console.error("printer is busy.");
				return;
			}

			if (this.recorder.state != this.AccelStates.IDLE) {
				console.log("recorder is not idle.", this.recorder.state);
				return;
			}

			this.recorder.state = this.AccelStates.RUNNING;
			console.log("starting to record profile.");

			let result = null;

			try {
				result = await this.sendCode({ code: this.recorder.testCommand, fromInput: true, log: true });
				if (result) {
					console.error(typeof result, result);
					throw new Error('Failed to run acceleration profile.');
				}
			} catch(e) {
				console.error("Recording Profile failed: ", e);
				this.recorder.state = this.AccelStates.IDLE;
				return;
			}
			console.log("record profile: ", this.recorder.testCommand, "result: ", result);
		},

		// Frequency Analysis
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
			} catch (e) {
				console.error("Loading files failed.", e);
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
		sessionAdd(record) {
			if (!this.session.addRecord(record)) {
				return;	// already in list
			}

			this.recordList.push(record.name);
		},
		sessionRemove(recordName) {
			let index = this.session.removeRecord(recordName);

			if (index < 0) {
				return; // not found in list
			}

			this.recordList.splice(index, 1);
		},
		async loadFile(file) {
			let csvFile;

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
				this.alertMessage = this.$t('plugins.inputShaping.loadError');
				console.warn(e);
				return;
			}

			// Clean up
			this.alertType = 'info';
			this.alertMessage = this.$t('plugins.inputShaping.noData');
			this.chart.data.datasets = [];
			this.selectedFile = null;

			let rec = new Record(file);

			try {
				rec.parse(csvFile);
				rec.analyze();

				// Show confirmation prompt if there are overflows
				if (rec.overflows > 0) {
					this.showOverflowConfirmation = true;
					const that = this;
					if (!await new Promise(resolve => that.resolveOverflowPromise = resolve)) {
						// User doesn't want to display sample file with overflows
						return;
					}
				}
				this.alertMessage = null;
			} catch (e) {
				this.alertType = 'error';
				this.alertMessage = this.$t('plugins.inputShaping.parseError');
				console.warn(e);
				return;
			}

			try {
				this.sessionAdd(rec);
			} catch (e) {
				this.alertType = 'error';
				this.alertMessage = 'sessionAddRecordError ' + e.message;
				console.warn(e);
				return;
			}

			try {
				this.updateChart();
			} catch (e) {
				this.alertType = 'error';
				this.alertMessage = 'updateChartError ' + e.message;
				console.warn(e);
				return;
			}

		},
		updateChart() {

			// chart update code works on record
			let labels = new Array(this.session.samples);
			for (let i = 0; i < labels.length; i++) {
				labels[i] = i;
			}
			this.chart.data.labels = labels;
			console.log("Acc labels", this.chart.data.labels);

			this.chart.options.tooltips.callbacks.title = items => this.$t('plugins.inputShaping.sampleTooltip', [items[0].index]);

			// Render the chart and apply sample rate
			this.start = this.chart.config.options.scales.xAxes[0].ticks.min = 0;
			this.end = this.chart.config.options.scales.xAxes[0].ticks.max = this.session.samples;
			this.samplingRate = this.session.samplingRate;

			let old = this.chart.data.datasets;

			let hidden = new Array(old.length);
			for (let i; i < hidden.length; i++)
				hidden[i] = (typeof old[i].hidden === "boolean") ? old[i].hidden : false;

			let datasets = [];

			this.session.getAllRecords().forEach((rec, recIndex) => {

				rec.axis.forEach((axis, index, arr) => {
					const dataset = {
						hidden: (index < hidden.length) ? hidden[index] : false,
						borderColor: this.getLineColor(index + recIndex * arr.length),
						backgroundColor: this.getLineColor(index + recIndex * arr.length),
						pointBorderWidth: 0.25,
						pointRadius: 2,
						borderWidth: 1.25,
						data: axis.acceleration,
						fill: false,
						label: rec.name + ' ' + axis.name
					};

					datasets.push(dataset);
				});
				this.chart.data.datasets = datasets;
			});

			this.chart.update();

			console.log("start", this.start, "end", this.end, "sampling rate", this.samplingRate);
		},
		updateChartFft() {

			console.log("updateChartFft");

			this.chart.data.labels = this.session.frequencies;
			console.log("FFT labels", this.chart.data.labels);

			this.chart.options.tooltips.callbacks.title = items => this.$t('plugins.inputShaping.frequencyTooltip', [this.session.frequencies[items[0].index].toFixed(2)]);

			let datasets = [];

			this.session.getAllRecords().forEach((rec, recIndex) => {

				rec.axis.forEach((axis, index, arr) => {
					const dataset = {
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

					datasets.push(dataset);
				});

				this.chart.data.datasets = datasets;
			});

			console.log("number of datasets complete", this.chart.data.datasets.length);
			console.log("number of labels complete", this.chart.data.labels.length);

			// Render the chart and apply sample rate
			this.start = this.chart.config.options.scales.xAxes[0].ticks.min = 0;
			this.end = this.chart.config.options.scales.xAxes[0].ticks.max = this.session.frequencies.length;

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
		// Input Shaping Configuration
		async configureInputShaping() {
			let valid = this.$refs.formInputShaping.validate();
			if (!valid) {
				console.error("invalid values in input shaping form.");
				return;
			}
			let result = null;

			this.recorder.iteration = this.recorder.iteration + 1;

			try {
				result = await this.sendCode({ code: this.inputShapingCommand, fromInput: true, log: true });
			} catch(e) {
				console.error("Input Shaping configuration failed: ", e, this.inputShapingCommand);
				return;
			}
			console.log("configure input shaping: ", this.inputShapingCommand, "result: ", result);

			return;
		}
	},
	mounted() {
		// Set up initial message
		this.alertType = 'info';
		this.alertMessage = this.$t('plugins.inputShaping.noData');

		this.session = new Session("initial session");

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
			this.chart.options.scales.xAxes[0].scaleLabel.labelString = this.$t(this.displaySamples ? 'plugins.inputShaping.samples' : 'plugins.inputShaping.frequency');
			this.chart.options.scales.yAxes[0].scaleLabel.labelString = this.$t(this.displaySamples ? 'plugins.inputShaping.accelerations' : 'plugins.inputShaping.amplitudes');
			this.chart.update();
		},
		recorder: {
			handler () {
				// build configure and test command
				this.recorder.testCommand = `M204 P10000 T10000 G1 ${this.recorder.axis}${this.recorder.param.startPosition} F${this.recorder.param.maxSpeed} G4 S2 G1 ${this.recorder.axis}${this.recorder.param.stopPosition} M400 M956 P${this.recorder.accel} S${this.recorder.param.numSamples} A2 F"${this.recorderFilename}"`;
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

				this.recorder.param.maxSpeed = this.model.move.axes[index].speed;
				this.recorder.param.maxAccel = this.model.move.axes[index].acceleration;
				this.recorder.param.minPosition = this.model.move.axes[index].min;
				this.recorder.param.maxPosition = this.model.move.axes[index].max;

				this.recorder.param.startPosition = Math.floor(this.recorder.param.minPosition + 10);
				this.recorder.param.stopPosition =
					Math.floor(this.recorder.param.minPosition + (this.recorder.param.maxPosition - this.recorder.param.minPosition) * 2 / 3);
			}
		},
		recorderMenuAxis() {
			if (this.recorderMenuAxis.length <= 0)
				return;

			console.log("set default axis");
			this.recorder.axis = this.recorderMenuAxis[0];
		},
		machineStatus: {
			handler() {
				if (this.recorder.debounceTimer)
					clearTimeout(this.recorder.debounceTimer);

				if (this.model.state.status !== "idle") {
						return;
				}

				this.recorder.debounceTimer = setTimeout(function (that) {
					console.log("handle machine status", that.model.state.status, "recorder status", that.recorder.state);

					that.recorder.debounceTimer = null;

					if (that.recorder.state === that.AccelStates.IDLE) {
						console.log("recorder is already idle.");
						return;
					}

					if (that.model.state.status !== "idle") {
						return;
					}

					that.recorder.state = that.AccelStates.IDLE;

					// update analysis tab with newly generated file
					that.loadFile(that.recorderFilename).then(function() { that.selectedTab = 'analysis'; }).then(that.refresh).then(that.updateChartFft);
				}, 5000, this);
			}
		},
	}
}
</script>
