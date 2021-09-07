<style scoped>
</style>

<template>
	<div>
		Recorder Component

		<ul style="display: none;">
			<li>session</li>
			<li>n * algorithm settings</li>
			
			<li>n * recordings</li>
			<li>algorithm</li>
			<ul>
				<li>id</li>
				<li>type</li>
				<li>frequency</li>
				<li>damping</li>
				<li>minAcceleration</li>
			</ul>
			<li>recording</li>
			<ul>
				<li>id</li>
				<li>name</li>
				<li>date</li>
				<li>algorithm config</li>
				<li>data</li>
			</ul>
		</ul>

		<algorithm v-for="(algo, index) in algorithms"
				v-bind:key="index">
			</algorithm>

		<form v-on:submit.prevent="addAlgorithm">
			<button>Add algorithm</button>
		</form>

	</div>
</template>

<script>
'use strict';

//import { mapState, mapGetters, mapActions } from 'vuex';
import { mapState, mapActions } from 'vuex';

import { Algorithm, Record } from './InputShapingSession.js';
import { makeNotification } from '../../utils/toast.js';
import Path from '../../utils/path.js';

export const RecorderStates = {
  UNKNOWN: 0,
  IDLE: 1,
  RUNNING: 2,
};

export default {
	props: [ 'session' ],
	data() {
		return {
			algorithms: [],
			record: null,
			AccelStates: RecorderStates,
			debounceTimer: null,
			recorder: {
				name: Math.random().toString(16).substr(2, 8),
				state: RecorderStates.IDLE,

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
			rules: {
				accel: null,
				axis: null,
				numSamples: null,
				startPosition: null,
				stopPosition: null,
			}
		}
	},
	computed: {
		...mapState('machine', ['model']),
	},
	methods: {
		...mapActions('machine', ['sendCode']),

		addAlgorithm() {
			this.algorithms.push(new Algorithm());
		},

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
	},
	mounted() {
		this.refresh();
	},
	watch: {
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
				if (this.debounceTimer)
					clearTimeout(this.debounceTimer);

				if (this.model.state.status !== "idle") {
						return;
				}

				this.debounceTimer = setTimeout(function (that) {
					console.log("handle machine status", that.model.state.status, "recorder status", that.recorder.state);

					that.debounceTimer = null;

					if (that.recorder.state === that.AccelStates.IDLE) {
						console.log("recorder is already idle.");
						return;
					}

					if (that.model.state.status !== "idle") {
						return;
					}

					that.recorder.state = that.AccelStates.IDLE;

					// update analysis tab with newly generated file
					that.loadFile(that.recorderFilename).then(function() {
						that.recorder.iteration += 1;
						that.selectedTab = 'analysis';
					}).then(that.refresh).then(that.updateChartFft);
				}, 5000, this);
			}
		},
	},
}
</script>
