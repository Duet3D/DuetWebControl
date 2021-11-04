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
				:items="recordList"
				:items-per-page="20"
				:single-select="true"
				show-select
				>
				<template v-slot:item.axis="{ item }">
						{{ (item.axis[0].integral + item.axis[1].integral + item.axis[2].integral).toFixed(4) }}
				</template>
				<template v-slot:item.axis[0].integral="{ item }">
						{{ item.axis[0].integral.toFixed(4) }}
				</template>
				<template v-slot:item.axis[1].integral="{ item }">
						{{ item.axis[1].integral.toFixed(4) }}
				</template>
				<template v-slot:item.axis[2].integral="{ item }">
						{{ item.axis[2].integral.toFixed(4) }}
				</template>
				<template v-slot:item.date="{ item }">
						{{ timestampToString(item.date) }}
				</template>
			</v-data-table>
		</v-row>

		<v-row>
				<v-col class="ma-2" id="runAndRecommend">
					<v-btn
						@click="runRecommendation(record)"
						:disabled="state != states.IDLE || isRunButtonDisabled"
						><v-icon>mdi-hand-extended</v-icon>  {{ $t('plugins.inputShaping.runRecommendation') }}
					</v-btn>
					<v-btn
						@click="emitAlgorithm"
						:disabled="!record || records.find(elem => record === elem)"
						><v-icon>mdi-plus-outline</v-icon>  {{ $t('plugins.inputShaping.addToTest') }}
					</v-btn>
					<v-btn
						@click="deleteRecommendation(record)"
						:disabled="!record || records.find(elem => record === elem)"
						><v-icon>mdi-trash-can-outline</v-icon>  {{ $t('plugins.inputShaping.delete') }}
					</v-btn>
				</v-col>
		</v-row>

		<chart v-bind:records="recordList"></chart>

		<v-row>
			<algorithm v-for="(score, index) in scores"
					v-bind:key="index"
					:algorithm="score.algo"
					v-on:update="updateAlgorithm(index, change)"
					v-on:remove="deleteScore(index)"
			></algorithm>

			<div v-for="(score) in scores" v-bind:key="score.id">
				{{ score.algo }} {{ score.score }}
			</div>
		</v-row>


	</div>
</template>

<script>
/* eslint no-unused-vars: "warn" */
'use strict';

import { mapState, mapActions } from 'vuex';

import recommend from './recommend.js';
import { Algorithm, Record } from './InputShapingSession.js'
import { makeNotification } from '../../utils/toast.js';
import { InputShapingType } from '../../store/machine/modelEnums.js';

const states = {
	IDLE: 0,
	RUNNING: 1,
}

export default {
	props: [ 'records' ],
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
				{ text: 'id', value: 'config.id' },
				{ text: 'frequency', value: 'config.frequency' },
				{ text: 'damping', value: 'config.damping' },
				{ text: 'date', value: 'date' },
				{ text: 'integral', value: 'axis' },
				{ text: 'x.integral', value: 'axis[0].integral' },
				{ text: 'y.integral', value: 'axis[1].integral' },
				{ text: 'z.integral', value: 'axis[2].integral' },
				{ text: 'samples', value: 'samples' },
				{ text: 'samplingRate', value: 'samplingRate' },
			],

			selectedRecords: [],
			recommendations: [],
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
		},
		recordList() {
			try {
				return this.records.concat(this.recommendations);
			} catch (e) {
				console.warn("no valid records found");
			}

			return this.records;
		},
	},
	methods: {
		...mapActions('machine', [ 'sendCode' ]),

		timestampToString(value) {
			let date = new Date(value);

			return date.toLocaleString();
		},
		emitAlgorithm() {
			if (!this.record || !this.record.config)
				return;
			this.$emit('input', this.record.config);
		},
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
			let recommendations = [];

			try {
				// test all available algorithms
				for (let iType = 0; iType < types.length; iType++) {
					let type = types[iType];
					let samplingRate = record.samplingRate;

					// test all max amplitudes at there specific frequency
					for (let iAxis = 0; iAxis < record.axis.length ? 1 : 0; iAxis++) {

						let freq = record.axis[iAxis].maxAmplitudes[0].freq;

						let algo = new Algorithm(type, "recommended", freq, 0.1, 0);

						// configure algorihtm is part of recorder
						this.configureAlgorithm(algo);

						// improve waiting for object model
						await new Promise((resolve) => {
							setTimeout(function() {
								console.log("waiting finished");
								resolve("finished");
							}, 500);
						});

						// store shaping parameters
						let params = {
							amplitudes: this.move.shaping.amplitudes.slice(),
							durations: this.move.shaping.amplitudes.slice(),
						}

						console.log("do recommendation for",
							record.axis[iAxis].name,
							record.axis[iAxis].maxAmplitudes[0],
							params
						);


						let recordShaped = recommend.analyze(
							record.axis[0].acceleration,
							record.axis[1].acceleration,
							record.axis[2].acceleration,
							samplingRate,
							params.amplitudes,
							params.durations
						);

						console.log("creating new records");
						let rec = new Record(record.name + "+" + algo.type, algo);

						//   calculate score of path, i.e. max peak, integral of psd or fft
						let score = recommend.calculateScore(recordShaped);

						scores.push({ algo, score });

						let samples = 0;
						try {
							samples = record.axis[0].acceleration.length;
						} catch (e) {
							samples = 0;
						}
						rec.addParameters(samples, samplingRate, 0, []);
						rec.addAxis('X', recordShaped.x);
						rec.addAxis('Y', recordShaped.y);
						rec.addAxis('Z', recordShaped.z);

						rec.analyze();

						recommendations.push(rec);
						console.log("added", rec);
					}
				}
			} catch (error) {
				console.error(error);
				throw error;
			}

			this.scores = scores;
			this.recommendations = recommendations;

			console.log("scores", this.scores, "recommendations", this.recommendations);
			console.log("reference",
				recommend.sumAndMax(record.axis[0].acceleration),
				recommend.sumAndMax(record.axis[1].acceleration),
				recommend.sumAndMax(record.axis[2].acceleration));
		},

		async deleteRecommendation(record) {
			let index = this.recommendations.findIndex(elem => elem.id === record.id);
			if (index < 0)
				return;

			this.recommendations.splice(index, 1);
		},

		async configureAlgorithm(algorithm) {
			let code = algorithm.getMCode();

			console.log("configuring Alogorithm", code);

			try {
				let result = await this.sendCode({ code: code, fromInput: this.verbose, log: true });
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

		deleteScore(index) {
			this.scores.slice(index, 1);
		},
	},
	mounted() {
	},
	watch: {
	}
}
</script>
