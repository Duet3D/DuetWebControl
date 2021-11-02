<style scoped>
</style>

<template>
	<div>
		<v-row class="pa-2">
			Recommendation Component
		</v-row>
		<v-row>
			<v-card-text class="pa-0" v-show="alert.message !== null">
				<v-alert :value="true" :type="alert.type" class="mb-0">
					{{ alert.message  }}
				</v-alert>
			</v-card-text>
		</v-row>

		<v-row>
			<v-data-table
				v-model="selectedRecords"
				class="py-0"
				:headers="recordTable"
				:items="records"
				:items-per-page="20"
				:single-select="true"
				show-select
				>
			</v-data-table>
		</v-row>

		<v-row>
			Result frequency, damping
		</v-row>

		<v-row>
				<v-col class="ma-2" id="runAndRecommend">
					<v-btn @click="runRecommendation(record)"
						:disabled="state != states.IDLE || isRunButtonDisabled"
						><v-icon>mdi-play</v-icon>
					</v-btn>
					<v-btn @click="$emit('input', algorithm)"
						:disabled="false"
						><v-icon>mdi-plus-outline</v-icon>
					</v-btn>
				</v-col>
		</v-row>

		<chart v-bind:records="null"></chart>

	</div>
</template>

<script>
/* eslint no-unused-vars: "warn" */
'use strict';

import { mapState, mapActions } from 'vuex';

import recommend from './recommend.js';
import { Algorithm } from './InputShapingSession.js'
import { makeNotification } from '../../utils/toast.js';
import { InputShapingType } from '../../store/machine/modelEnums.js';

const states = {
	IDLE: 0,
	RUNNING: 1,
}

export default {
	props: [ 'algorithm', 'records' ],
	data() {
		return {
			verbose: false,

			InputShapingType: InputShapingType,
			states: states,
			state: states.IDLE,

			alert: {
				message: "please choose a record",
				type: "info",
			},

			recordTable: [
				{
					text: 'name',
					align: 'start',
					sortable: true,
					value: 'name',
				},
				{ text: 'type', value: 'config.type' },
				{ text: 'config', value: 'config.id' },
				{ text: 'date', value: 'date' },
				{ text: 'samples', value: 'samples' },
				{ text: 'samplingRate', value: 'samplingRate' },
			],

			selectedRecords: null,
		}

	},
	computed: {
		...mapState('machine/model', ['move']),
		isRunButtonDisabled() {
			if (!this.record ||
					!this.record.config ||
					!this.record.config.type
					!== !this.InputShapingType.none)
				return true;

			return false;
		},
		record() {
			if (this.selectedRecords && this.selectedRecords.length)
				return this.selectedRecords[0];

			return null;
		}
	},
	methods: {
		...mapActions('machine', [ 'sendCode' ]),

		async runRecommendation(record) {
			console.log("run recommendation");

			let types = [
				//this.InputShapingType.MZV,
				this.InputShapingType.ZVD,
				//this.InputShapingType.ZVDD,
				//this.InputShapingType.ZVDDD,
				//this.InputShapingType.EI2,
				this.InputShapingType.EI3,
			];

			let scores = [];

			try {
				// test all available algorithms
				for (let iType = 0; iType < types.length; iType++) {
					// test all max amplitudes at there specific frequency
					for (let iAxis = 0; iAxis < record.axis.length; iAxis++) {

						let type = types[iType];
						let axis = record.axis[iAxis];
						let freq = record.axis[iAxis].maxAmplitudes[0].freq;
						let samplingRate = record.samplingRate;

						let algo = new Algorithm(type, freq, 0.1, 0);

						//   configure algorihtm is part of recorder
						this.configureAlgorithm(algo);

						// TODO improve waiting for object model
						await new Promise((resolve) => {
							setTimeout(function() {
								console.log("waiting finished");
								resolve("finished");
							}, 500);
						});

						//   store shaping parameters
						let params = {
							amplitudes: this.move.shaping.amplitudes.slice(),
							durations: this.move.shaping.amplitudes.slice(),
						}


						let recordShaped = recommend.analyze(
							record.axis[0].acceleration,
							record.axis[1].acceleration,
							record.axis[2].acceleration,
							samplingRate,
							params.amplitudes,
							params.durations
						);

						//   calculate score of path, i.e. max peak, integral of psd or fft
						let score = recommend.calculateScore(recordShaped);

						scores.push({ algo, score })
					}
				}
			} catch (error) {
				console.error(error);
				throw error;
			}

			console.log("scores", scores);
			console.log("reference",
				recommend.sumAndMax(record.axis[0].acceleration),
				recommend.sumAndMax(record.axis[1].acceleration),
				recommend.sumAndMax(record.axis[2].acceleration));
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

	},
	mounted() {
	},
	watch: {
	}
}
</script>
