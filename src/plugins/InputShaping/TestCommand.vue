<style scoped>
</style>

<template>
	<div>
		Test Command Component:<br>
		test: {{ testCommand }}

		<v-form ref="formTestCommand" @submit.prevent="submit">
			<v-row>
				<v-col>
					<v-text-field
						:label="$t('plugins.inputShaping.accelerometerId')"
						v-model="accel"
						:rules="rules.accel"
						required
					></v-text-field>
				</v-col>
			</v-row>
			<v-row>
				<v-col>
					<v-select
						:items="recorderMenuAxis"
						v-model="axis"
						:label="$t('plugins.inputShaping.axis')"
						:rules="rules.axis"
					></v-select>
				</v-col>
				<v-col>
					<v-text-field
						v-model.number="param.numSamples"
						type="number" :min="1" :max="65535"
						:label="$t('plugins.inputShaping.numSamples')"
						:rules="rules.numSamples"
					></v-text-field>
				</v-col>
			</v-row>
			<v-row>
				<v-col>
					<v-text-field
						v-model.number="param.startPosition"
						type="number" :min="param.minPosition" :max="param.maxPosition"
						:label="$t('plugins.inputShaping.startPosition')"
						:rules="rules.startPosition"
					></v-text-field>
				</v-col>
				<v-col>
					<v-text-field
						v-model.number="param.stopPosition"
						type="number" :min="param.minPosition" :max="param.maxPosition"
						:label="$t('plugins.inputShaping.stopPosition')"
						:rules="rules.stopPosition"
					></v-text-field>
				</v-col>
			</v-row>
		</v-form>
	</div>
</template>

<script>
'use strict';

import { mapState } from 'vuex';

//import { Record } from './InputShapingSession.js';
//import { makeNotification } from '../../utils/toast.js';

export default {
	props: [ 'value', 'id' ],
	data() {
		return {
			rules: {
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
					v => (typeof v === "number" && this.axis ? true : false) || this.$t('plugins.inputShaping.axisFirst'),
					v => (v >= this.param.minPosition) || this.$t('plugins.inputShaping.greaterThan', [ this.param.minPosition ]),
					v => (v < this.param.stopPosition) || this.$t('plugins.inputShaping.smallerThan', [ this.param.stopPosition ]),
					v => (v <= this.param.maxPosition) || this.$t('plugins.inputShaping.smallerThan', [ this.param.maxPosition ]),
				],
				stopPosition: [
					v => /\d+/.test(v) || this.$t('plugins.inputShaping.validInteger'),
					v => (typeof v === "number" && this.axis ? true : false) || this.$t('plugins.inputShaping.axisFirst'),
					v => (v >= this.param.minPosition) || this.$t('plugins.inputShaping.greaterThan', [ this.param.minPosition ]),
					v => (v > this.param.startPosition) || this.$t('plugins.inputShaping.greaterThan', [ this.param.startPosition ]),
					v => (v <= this.param.maxPosition) || this.$t('plugins.inputShaping.smallerThanOrEqualTo', [ this.param.maxPosition ]),
				],
			},
			accel: 0,
			axis: null,
			param: {
				numSamples: 1000,
				startPosition: 0,
				stopPosition: 0,
			},
		};
	},
	methods: {
	},
	computed: {
		...mapState(['selectedMachine']),
		...mapState('machine', ['model']),
		recorderMenuAxis() {
			return this.model.move.axes.map(axis => axis.letter);
		},
		recorderFilename() {
			return `is-${this.id}-${this.iteration}-${this.axis}.csv`;
		},
		testCommand: function() {
			let command = `M204 P10000 T10000 G1 ${this.axis}${this.param.startPosition} F${this.param.maxSpeed} G4 S2 G1 ${this.axis}${this.param.stopPosition} M400 M956 P${this.accel} S${this.param.numSamples} A2 F"${this.recorderFilename}"`;
			this.$emit('input', command);
			console.log("emitted", command);
			return command;
		}
	},
	watch: {
		axis() {
				if (this.model.move.axes.length <= 0)
					return;

				let index = this.model.move.axes.findIndex(item => item.letter === this.axis);
				if (index < 0)
					return;

				this.param.maxSpeed = this.model.move.axes[index].speed;
				this.param.maxAccel = this.model.move.axes[index].acceleration;
				this.param.minPosition = this.model.move.axes[index].min;
				this.param.maxPosition = this.model.move.axes[index].max;

				this.param.startPosition = Math.floor(this.param.minPosition + 10);
				this.param.stopPosition = Math.floor(this.param.minPosition + (this.param.maxPosition - this.param.minPosition) * 2 / 3);
			}
	},
	mounted() {
	}
}
</script>
