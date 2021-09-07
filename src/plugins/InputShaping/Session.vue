<style scoped>
</style>

<template>
	<div>
		Session Component

		<v-row v-if="session">
			<v-col>
				name: {{ session.name }} id: {{ session.id }} date: {{ session.date }}<br>
				test: {{ test.testCommand }}
			</v-col>
		</v-row>
		<v-form ref="formSession" @submit.prevent="submit">
			<v-row>
				<v-col>
					<v-text-field
						:label="$t('plugins.inputShaping.id')"
						v-model="session.id"
						required
					></v-text-field>
				</v-col>
			</v-row>
			<v-row>
				<v-col>
					<v-text-field
						:label="$t('plugins.inputShaping.name')"
						v-model="session.name"
						required
					></v-text-field>
				</v-col>
			</v-row>
			<v-row>
				<v-col>
					<v-text-field
						:label="$t('plugins.inputShaping.date')"
						v-model="session.date"
						required
					></v-text-field>
				</v-col>
			</v-row>
		</v-form>

		<test-command
			v-model="test.testCommand"
			v-bind:value="session.id"
		></test-command>

		<algorithm v-for="(algo, index) in algorithms"
				v-bind:key="index"
				v-model="algorithms[index]"
				v-on:update="updateAlgorithm(index, change)"
				v-on:remove="algorithms.splice(index, 1)"
		></algorithm>

		<form v-on:submit.prevent="addAlgorithm">
			<v-btn color="primary" @click="addAlgorithm">
					<v-icon class="mr-2">mdi-plus-outline</v-icon> {{ $t('plugins.inputShaping.addAlgorithm') }}
			</v-btn>
		</form>
	</div>
</template>

<script>

'use strict';

//import { mapState, mapActions } from 'vuex';

//import { AccelStates } from './InputShapingEnums.js';
import { Algorithm, Session } from './InputShapingSession.js';
//import { makeNotification } from '../../utils/toast.js';

export default {
	props: [ ],
	data() {
		return {
			session: new Session(),
			algorithms: [ new Algorithm() ],
			test: {
				testCommand: null,

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
			}
		};
	},
	computed: {
	},
	methods: {
		addAlgorithm() {
			this.algorithms.push(new Algorithm());
		},

	},
	watch: {
	},
	mounted() {
	}
}
</script>
