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
						v-model="test.accel"
						v-on:input="$emit('input', test)"
						:rules="rules.accel"
						required
					></v-text-field>
				</v-col>
			</v-row>
			<v-row>
				<v-col>
					<v-select
						:items="recorderMenuAxis"
						v-model="test.axis"
						v-on:input="$emit('input', test)"
						:label="$t('plugins.inputShaping.axis')"
						:rules="rules.axis"
					></v-select>
				</v-col>
				<v-col>
					<v-text-field
						v-model.number="test.param.numSamples"
						v-on:input="$emit('input', test)"
						type="number" :min="1" :max="65535"
						:label="$t('plugins.inputShaping.numSamples')"
						:rules="rules.numSamples"
					></v-text-field>
				</v-col>
			</v-row>
			<v-row>
				<v-col>
					<v-text-field
						v-model.number="test.param.startPosition"
						v-on:input="$emit('input', test)"
						type="number" :min="test.param.minPosition" :max="test.param.maxPosition"
						:label="$t('plugins.inputShaping.startPosition')"
						:rules="rules.startPosition"
					></v-text-field>
				</v-col>
				<v-col>
					<v-text-field
						v-model.number="test.param.stopPosition"
						v-on:input="$emit('input', test)"
						type="number" :min="test.param.minPosition" :max="test.param.maxPosition"
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

import { Test } from './InputShapingSession.js';

export default {
	props: [ 'value', 'id' ],

	data() {
		return {
			test: this.value ? this.value : new Test(),
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
					v => (typeof v === "number" && this.test.axis ? true : false) || this.$t('plugins.inputShaping.axisFirst'),
					v => (v >= this.test.param.minPosition) || this.$t('plugins.inputShaping.greaterThan', [ this.test.param.minPosition ]),
					v => (v < this.test.param.stopPosition) || this.$t('plugins.inputShaping.smallerThan', [ this.test.param.stopPosition ]),
					v => (v <= this.test.param.maxPosition) || this.$t('plugins.inputShaping.smallerThan', [ this.test.param.maxPosition ]),
				],
				stopPosition: [
					v => /\d+/.test(v) || this.$t('plugins.inputShaping.validInteger'),
					v => (typeof v === "number" && this.test.axis ? true : false) || this.$t('plugins.inputShaping.axisFirst'),
					v => (v >= this.test.param.minPosition) || this.$t('plugins.inputShaping.greaterThan', [ this.test.param.minPosition ]),
					v => (v > this.test.param.startPosition) || this.$t('plugins.inputShaping.greaterThan', [ this.test.param.startPosition ]),
					v => (v <= this.test.param.maxPosition) || this.$t('plugins.inputShaping.smallerThanOrEqualTo', [ this.test.param.maxPosition ]),
				],
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
			return `is-${this.id}-${this.test.axis}.csv`;
		},
		testCommand() {
			let command = `M204 P10000 T10000 G1 ${this.test.axis}${this.test.param.startPosition} F${this.test.param.maxSpeed} G4 S2 G1 ${this.test.axis}${this.test.param.stopPosition} M400 M956 P${this.test.accel} S${this.test.param.numSamples} A2 F"${this.test.recorderFilename}"`;
			return command;
		}
	},
	watch: {
		'test.axis': {
			handler: function() {
				if (this.model.move.axes.length <= 0)
					return;

				let index = this.model.move.axes.findIndex(item => item.letter === this.test.axis);
				if (index < 0)
					return;

				this.test.param.maxSpeed = this.model.move.axes[index].speed;
				this.test.param.maxAccel = this.model.move.axes[index].acceleration;
				this.test.param.minPosition = this.model.move.axes[index].min;
				this.test.param.maxPosition = this.model.move.axes[index].max;

				this.test.param.startPosition = Math.floor(this.test.param.minPosition + 10);
				this.test.param.stopPosition = Math.floor(this.test.param.minPosition + (this.test.param.maxPosition - this.test.param.minPosition) * 2 / 3);

				console.log("axis changed", this.test);
			},
		},
		'testCommand': function(value) {
			console.log("watch testCommand", value);
			this.test.testCommand = value;
		}
	},
	mounted() {
	}
}
</script>
