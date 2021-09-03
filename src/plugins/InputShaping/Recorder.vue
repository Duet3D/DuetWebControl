<style scoped>
</style>

<template>
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
</template>

<script>
'use strict';

import { AccelStates } from './InputShapingEnums.js';

export default {
	props: {
			AccelStates: AccelStates,
			recorder: {
				name: Math.random().toString(16).substr(2, 8),
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
	},
	computed: {
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
	},
	methods: {
	}
}
</script>
