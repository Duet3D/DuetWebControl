<style scoped>
</style>

<template>
	<div>
		Recorder Component

		<ul style="display: none;">
			<li>recording</li>
			<ul>
				<li>id</li>
				<li>name</li>
				<li>date</li>
				<li>algorithm config</li>
				<li>data</li>
			</ul>
		</ul>

		<ul>
			<li>iterate over algorithm entries</li>
			<ul>
				<li>start test</li>
				<li>wait for test to finish</li>
				<li>download test results</li>
				<li>create a new record</li>
				<li>add algorithm data</li>
				<li>add recorded data</li>
				<li>create fft of recorded data</li>
			</ul>
		</ul>

		State: {{ currentState }}
		<form v-on:submit.prevent="runTests">
			<!--<v-btn :disabled="state !== RecorderStates.IDLE" color="primary" @click="runTests">-->
			<v-btn color="primary" @click="runTests">
					<v-icon class="mr-2">mdi-play</v-icon> {{ $t('plugins.inputShaping.run') }}
			</v-btn>
		</form>

	</div>
</template>

<script>
'use strict';

//import { mapState, mapGetters, mapActions } from 'vuex';
import { mapState, mapActions } from 'vuex';

import { Record } from './InputShapingSession.js';
import { makeNotification } from '../../utils/toast.js';
import Path from '../../utils/path.js';

export const RecorderStates = {
  ERROR: -1,
	UNKNOWN: 0,
  IDLE: 1,
	CONFIGURING: 2,
	RECORDING: 3,
	DOWNLOADING: 4,
	PARSING: 5,
	DELETING: 6,
	STORING: 7
};

export default {
	props: [ 'value' ],
	data() {
		return {
			session: this.value,

			RecorderStates: RecorderStates,
			state: RecorderStates.IDLE,
			lastRun: 0,

			debounceTimer: null,
			filename: null,
			record: null,
		}

	},
	computed: {
		...mapState('machine', ['model']),
		accelerometerRuns() {
				return this.model.boards[0].accelerometer.runs;
		},
		accelerometerPoints() {
				return this.model.boards[0].accelerometer.points;
		},
		currentState() {
			return JSON.stringify(this.state);
		},
		machineStatus() {
			console.log("machine status", this.model.state.status, "recorder status", this.state);
			return this.model.state.status;
		}
	},
	methods: {
		...mapActions('machine', [ 'download', 'sendCode' ]),

		async runTests() {
			console.log("TODO run tests");
			// open session
			// get algorithms to iterate
			//   get test command
			//   run test
			//   get file
			//   create record
			//   parse file and analyze
			//   delete file
			//   add record to session

			console.log("run tests", this.session);

			if (this.session.algorithms.length < 1) {
				console.log("missing algorithm configurations")
				return;
			}

			console.log("starting tests");
			for (let i = 0; i < this.session.algorithms.length; i++) {
				let algo = this.session.algorithms[i];

				console.log("configuring algo", algo);

				this.state = this.RecorderStates.CONFIGURING;
				let resp = await this.configureAlgorithm(algo);

				console.log(resp);
				if (resp) {
					console.error("Error:", resp);
					this.state = this.RecorderStates.IDLE;
					return;
				}

				resp = await this.homeAllAxis();

				console.log(resp);
				if (resp) {
					console.error("Error:", resp);
					this.state = this.RecorderStates.IDLE;
					return;
				}

				console.log("run test command", this.session.test);

				this.state = this.RecorderStates.RECORDING;
				resp = await this.runTestCommand(this.session.test);
				console.log(resp);

				if (resp) {
					console.error("Error:", resp);
					this.state = this.RecorderStates.IDLE;
					return;
				}

				resp = await this.waitForMachineIdle();
				console.log(resp);

				if (!resp) {
					console.error("Error: machine not idle", resp);
					this.state = this.RecorderStates.IDLE;
					return;
				}

				console.log("Path", Path);
				this.state = this.RecorderStates.DOWNLOADING;

				let file = await this.loadFile(Path.combine(Path.accelerometer, this.session.test.filename));
				console.log(file);

				if (!file) {
					console.error("Error:", file);
					this.state = this.RecorderStates.IDLE;
					return;
				}

				this.state = this.RecorderStates.PARSING;
				let rec = new Record(this.session.id + '-' + algo.type + '-' + JSON.stringify(i), algo);

				try {
					rec.parse(file);
					rec.analyze();
				} catch (error) {
					this.alertType = 'error';
					this.alertMessage = this.$t('plugins.inputShaping.parseError');
					console.error("Error:", error);
					this.state = this.RecorderStates.IDLE;
					return;
				}

			/* TODO
				this.state = this.RecorderStates.DELETING;
				resp = this.deleteFile(this.session.test.filename);

				if (resp) {
					console.error("Error:", resp);
					this.state = this.RecorderStates.IDLE;
					return;
				}
			*/

				this.state = this.RecorderStates.STORING;
				this.session.records.push(rec);
				this.state = this.RecorderStates.IDLE;
			}
		},

		async waitForMachineIdle() {
			let period = 10000;

			let promise = new Promise((resolve, reject) => {
				if (this.debounceTimer)
					clearTimeout(this.debounceTimer);

				this.debounceTimer = setTimeout(function (that) {
				console.log(
					"handle machine status", that.model.state.status,
					"recorder status", that.state);

					if (that.machineStatus !== "idle") {
						// re-launch when not idle
						//that.debounceTimer.refresh();
						reject(false);
						return;
					}

					// disable timer
					that.debounceTimer = null;

					resolve(true);
				}, period, this);
			});

			// wait until machine is idle again
			return await promise;
		},

		async configureAlgorithm(algorithm) {
			let code = algorithm.getMCode();

			console.log("configuring Alogorithm", code);

			try {
				let result = await this.sendCode({ code: code, fromInput: true, log: true });
				console.log(result);
				if (result) {
					console.error(typeof result, result);
					throw new Error('Failed to run acceleration profile.');
				}
			} catch(e) {
				console.error("Recording Profile failed: ", e);
			}

			return;
		},

		async homeAllAxis() {
			let code = "G28 M400";

			console.log("configuring Alogorithm", code);

			try {
				let result = await this.sendCode({ code: code, fromInput: true, log: true });
				console.log(result);
				if (result) {
					console.error(typeof result, result);
					throw new Error('Failed to run acceleration profile.');
				}
			} catch(e) {
				console.error("Recording Profile failed: ", e);
			}

			return;
		},

		async runTestCommand(test) {

			/*
			if (this.model.state.status !== "idle") {
				makeNotification("error", this.$t('plugins.inputShaping.name'),
					this.$t('plugins.inputShaping.printerBusy'));
				console.error("printer is busy.");
				return;
			}

			if (this.state != this.RecorderStates.IDLE) {
				makeNotification("error", this.$t('plugins.inputShaping.name'),
					this.$t('plugins.inputShaping.recorderNotIdle'));
				console.log("recorder is not idle.", this.state);
				return;
			}
			*/

			console.log("starting to record profile.");

			let result = null;

			try {
				result = await this.sendCode({ code: test.getGCode(), fromInput: true, log: true });
				if (result) {
					console.error(typeof result, result);
					throw new Error('Failed to run acceleration profile.');
				}
			} catch(e) {
				makeNotification("error", this.$t('plugins.inputShaping.name'),
					this.$t('plugins.inputShaping.recordingFailed'));
				console.error("Recording Profile failed: ", e);
				return;
			}
			console.log("test command run: ", test.getGCode(), "result: ", result);
		},

		async loadFile(filename) {
			let csvFile;

			// Download the selected filename
			try {
					csvFile = await this.download({
						filename: filename,
						type: 'text',
						showProgress: false,
						showSuccess: false,
						showError: false
					});
			} catch (e) {
				console.warn(e);
				return false;
			}

			return csvFile;
		},
	},
	mounted() {
		console.log(Path);
	},
	watch: {
		machineStatus: {
			handler() {
				console.log(this.debounceTimer);

				/*
				if (this.debounceTimer)
					this.debounceTimer.refresh();
				*/
			}
		}
	},
}
</script>
