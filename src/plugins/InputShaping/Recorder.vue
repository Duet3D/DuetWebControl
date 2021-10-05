<style scoped>
</style>

<template>
	<div>
		<v-row>
			<v-card-text class="pa-0" v-show="alertMessage !== null">
				<v-alert :value="true" :type="alertType" class="mb-0">
					{{ alertMessage  }}
				</v-alert>
			</v-card-text>
		</v-row>

		<v-row>
			<v-col>
				Recorder State: {{ currentState }}
			</v-col>
		</v-row>
		<v-row>
			<v-col>
				Progress: {{ current }} / {{ session.algorithms.length }}
			</v-col>
		</v-row>

		<v-row>
			<v-col>
				<form v-on:submit.prevent="runTests">
					<v-btn :disabled="state !== RecorderStates.IDLE" color="primary" @click="runTests">
						<v-icon class="mr-2">mdi-play</v-icon> {{ $t('plugins.inputShaping.run') }}
					</v-btn>
				</form>
			</v-col>
		</v-row>
	</div>
</template>

<script>
'use strict';

import { mapState, mapActions } from 'vuex';

import { Record } from './InputShapingSession.js';
import { makeNotification } from '../../utils/toast.js';
import Path from '../../utils/path.js';

export const RecorderStates = {
  ERROR: -1,
	UNKNOWN: 0,
  IDLE: 1,
	HOMING: 2,
	CONFIGURING: 3,
	RECORDING: 4,
	DOWNLOADING: 5,
	PARSING: 6,
	DELETING: 7,
	STORING: 8
};

export default {
	props: [ 'session' ],
	data() {
		return {
			verbose: false,

			RecorderStates: RecorderStates,
			state: RecorderStates.IDLE,

			lastRun: null,
			writingDoneResolve: null,
			writingDoneRejct: null,
			timeout: null,
			current: 0,

			alertType: null,
			alertMessage: null,

			debounceTimer: null,
			record: null,
		}

	},
	computed: {
		...mapState('machine', ['model']),
		allAxisHomed() {
			let axisNotHomed = this.model.move.axes.filter(axes => axes.homed === false);

			console.log("axis not homed: ", axisNotHomed.map(axes => axes.letter));
			return axisNotHomed.length > 0 ? false : true;
		},
		accelerometerBoardIndex() {
			if (!this.session.test.board)
				return 0;
			return this.model.boards.findIndex(elem => elem.canAddress === this.session.test.board);
		},
		accelerometerRuns() {
				return this.model.boards[this.accelerometerBoardIndex].accelerometer.runs;
		},
		accelerometerPoints() {
				return this.model.boards[this.accelerometerBoardIndex].accelerometer.points;
		},
		currentState() {
			return Object.keys(this.RecorderStates).find(key => this.RecorderStates[key] === this.state);
		},
	},
	methods: {
		...mapActions('machine', [ 'delete', 'download', 'sendCode' ]),

		async runTests() {
			console.log("run tests");
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
				console.log("missing algorithm configurations");
				this.alertType = 'error';
				this.alertMessage = this.$t('plugins.inputShaping.missingAlgorithmConfiguration');

				return;
			}

			this.alertMessage = null;

			console.log("starting tests");

			this.current = 0;

			if (!this.allAxisHomed) {
				console.log("home all axis");

				try {
					this.state = this.RecorderStates.HOMING;
					await this.homeAllAxis();
				} catch (error) {

					console.error(error);

					this.alertType = 'error';
					this.alertMessage = this.$t('plugins.inputShaping.error') + ': ' + error;

					this.state = this.RecorderStates.IDLE;

					return;
				}
			}

			for (let i = 0; i < this.session.algorithms.length; i++) {
				let algo = this.session.algorithms[i];

				this.current = i;

				console.log("configuring algo", algo);

				this.lastRun = this.accelerometerRuns;

				try {
					this.state = this.RecorderStates.CONFIGURING;
					let resp = await this.configureAlgorithm(algo);
					console.log(resp);

					console.log("run test command", this.session.test);

					this.state = this.RecorderStates.RECORDING;
					let filename = `is-${algo.id}-${algo.type}-${this.session.test.axis}-${this.current}.csv`;
					console.log(filename);
					resp = await this.runTestCommand(this.session.test, filename);

					resp = await this.waitForMachineIdle();
					console.log(resp);

					this.state = this.RecorderStates.DOWNLOADING;
					let file = await this.loadFile(Path.combine(Path.accelerometer, filename));
					this.state = this.RecorderStates.PARSING;
					let rec = new Record(JSON.stringify(i) + '-' + algo.type + '-' + this.session.id, algo);

					rec.parse(file);
					rec.analyze();

					this.state = this.RecorderStates.DELETING;
					resp = await this.delete(Path.combine(Path.accelerometer, filename));

					this.state = this.RecorderStates.STORING;
					this.session.addRecord(rec);
					this.state = this.RecorderStates.IDLE;

				} catch (error) {

					console.error(error);

					this.alertType = 'error';
					this.alertMessage = this.$t('plugins.inputShaping.error') + ': ' + error;

					this.state = this.RecorderStates.IDLE;

					return;
				}
			}

			this.current += 1;
		},

		async waitForMachineIdle() {
			let timeout = 5 * 60000; // wait up to 5 minutes to finish

			console.log("start accelerometerRuns", this.lastRun);
			console.log(
				"handle machine status", this.model.state.status,
				"last accelerometerRuns", this.lastRun,
				"recorder status", this.state);


			let writing = new Promise((resolve, reject) => {
				this.writingDoneResolve = resolve;
				this.writingDoneReject = reject;

				this.timeout = setTimeout(function (reject) {

					console.log("waitForMachineIdle timeout");
					reject(new Error("timout"));

				}, timeout, reject);
			});

			try {
				// wait until machine is idle again
				await writing;
			} catch (error) {
				console.error(error);
				throw error;
			}
		},

		async configureAlgorithm(algorithm) {
			let code = algorithm.getMCode();

			console.log("configuring Alogorithm", code);

			try {
				let result = await this.sendCode({ code: code, fromInput: this.verbose, log: true });
				console.log(result);
				if (result) {
					console.error(typeof result, result);
					throw new Error('failed to configure inputshaping. ' + result);
				}
			} catch(e) {
				console.error("Failed to send code: ", e);
				throw e;
			}

			return;
		},

		async homeAllAxis() {
			let code = "G28 M400";

			console.log("homing all axis", code);

			try {
				let result = await this.sendCode({ code: code, fromInput: this.verbose, log: true });
				console.log(result);
				if (result) {
					console.error(typeof result, result);
					throw new Error('Failed to home all axis. ' + result);
				}
			} catch(e) {
				console.error("Recording Profile failed: ", e);
				throw e;
			}

			return;
		},

		async runTestCommand(test, filename) {

			console.log("executing test command.", test.getGCode(filename));

			let result = null;

			try {
				result = await this.sendCode({ code: test.getGCode(filename), fromInput: this.verbose, log: true });
				if (result) {
					console.error(result);
					throw new Error('Failed to run test command. ' + result);
				}
			} catch(e) {
				makeNotification("error", this.$t('plugins.inputShaping.pluginName'),
					this.$t('plugins.inputShaping.recordingFailed'));
				console.error("Recording Profile failed: ", e);
				throw e;
			}

			return;
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
				console.error(e);
				throw new Error("Failed to download file.");
			}

			return csvFile;
		},
	},
	mounted() {
	},
	watch: {
		accelerometerRuns() {

			console.log("watch accelerometer", this.accelerometerRuns);

			if (this.state !== this.RecorderStates.RECORDING) {
				console.warn("invalid recorder state");
				return;
			}

			if (this.lastRun >= this.accelerometerRuns) {
				console.warn("new value too small", this.lastRun, this.accelerometerRuns);
				return;
			}

			if (this.accelerometerPoints !== this.session.test.param.numSamples) {
				// wrong number of samples recorded
				console.warn("invalid number of samples", this.accelerometerPoints, this.session.test.param.numSamples);
				this.writingDoneReject(new Error('invalid number of samples recorded'));
				return;
			}

			if (this.timeout)
				clearTimeout(this.timeout);

			console.log("writingDoneResolve", this.writingDoneResolve);
			this.writingDoneResolve('done');
		},
		session() {
			this.current = 0;
		}
	}
}
</script>
