<style scoped>
</style>

<template>
	<div>
		<v-row>
			<v-col>Recorder Component</v-col>
		</v-row>

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
			current: 0,

			alertType: null,
			alertMessage: null,

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
			for (let i = 0; i < this.session.algorithms.length; i++) {
				let algo = this.session.algorithms[i];

				this.current = i;

				console.log("configuring algo", algo);

				try {
					this.state = this.RecorderStates.CONFIGURING;
					let resp = await this.configureAlgorithm(algo);
					console.log(resp);

					console.log("home all axis - start");
					resp = await this.homeAllAxis();

					console.log("run test command", this.session.test);

					this.state = this.RecorderStates.RECORDING;
					resp = await this.runTestCommand(this.session.test);
					console.log(resp);

					console.log("home all axis - end");
					resp = await this.homeAllAxis();

					resp = await this.waitForMachineIdle();
					console.log(resp);

					this.state = this.RecorderStates.DOWNLOADING;
					let file = await this.loadFile(Path.combine(Path.accelerometer, this.session.test.filename));
					this.state = this.RecorderStates.PARSING;
					let rec = new Record(this.session.id + '-' + algo.id + '-' + algo.type + '-' + JSON.stringify(i), algo);

					rec.parse(file);
					rec.analyze();

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
					this.session.addRecord(rec);
					this.state = this.RecorderStates.IDLE;

				} catch (error) {

					console.error("Error:", error);

					this.alertType = 'error';
					this.alertMessage = this.$t('plugins.inputShaping.Error') + error;

					this.state = this.RecorderStates.IDLE;

					return;
				}

			}

			this.current += 1;
		},

		async waitForMachineIdle() {
			let period = 15000;

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
						reject("printer not idle");
						return;
					}

					// disable timer
					that.debounceTimer = null;

					resolve("idle");
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
					throw new Error('Failed to configure inputshaping.');
				}
			} catch(e) {
				console.error("Failed to send code: ", e);
				throw new Error('Failed to send code.');
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
					throw new Error('Failed to home all axis.');
				}
			} catch(e) {
				console.error("Recording Profile failed: ", e);
				throw new Error('Failed to home all axis.');
			}

			return;
		},

		async runTestCommand(test) {

			console.log("executing test command.");

			let result = null;

			try {
				result = await this.sendCode({ code: test.getGCode(), fromInput: true, log: true });
				if (result) {
					console.error(result);
					throw new Error('Failed to run test command.');
				}
			} catch(e) {
				makeNotification("error", this.$t('plugins.inputShaping.name'),
					this.$t('plugins.inputShaping.recordingFailed'));
				console.error("Recording Profile failed: ", e);
				throw new Error('Failed to run test command.');
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
				console.warn(e);
				throw new Error("Failed to download file.");
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
