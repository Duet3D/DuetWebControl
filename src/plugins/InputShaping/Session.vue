<style scoped>
</style>

<template>
	<div>
		Session Component

		<v-row v-if="value">
			<v-col>
				name: {{ value.name }} id: {{ value.id }} date: {{ value.date }}<br>
				test: {{ value.test.testCommand }}
			</v-col>
		</v-row>
		<v-form ref="formSession" @submit.prevent="submit">
			<v-row>
				<v-col>
					<v-text-field
						:label="$t('plugins.inputShaping.id')"
						v-model="value.id"
						v-on:input="$emit('input', value)"
						required
					></v-text-field>
				</v-col>
			</v-row>
			<v-row>
				<v-col>
					<v-text-field
						:label="$t('plugins.inputShaping.name')"
						v-model="value.name"
						v-on:input="$emit('input', value)"
						required
					></v-text-field>
				</v-col>
			</v-row>
			<v-row>
				<v-col>
					<v-text-field
						:label="$t('plugins.inputShaping.date')"
						v-model="value.date"
						v-on:input="$emit('input', value)"
						required
					></v-text-field>
				</v-col>
			</v-row>
		</v-form>

		<test-command
			v-model="value.test"
			v-bind:id="value.id"
			v-on:test-command="console.log($event)"
			:disabled="value.records.length > 0"
		></test-command>

		<algorithm v-for="(algo, index) in value.algorithms"
				v-bind:key="index"
				v-model="value.algorithms[index]"
				v-on:update="updateAlgorithm(index, change)"
				v-on:remove="removeAlgorithm(index)"
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
import { Algorithm } from './InputShapingSession.js';
//import { makeNotification } from '../../utils/toast.js';

export default {
	props: [ 'value' ],
	data() {
		return {
		};
	},
	computed: {
	},
	methods: {
		addAlgorithm() {
			this.value.algorithms.push(new Algorithm());
		},
		removeAlgorithm(index) {
			this.value.algorithms.splice(index, 1);
		}

	},
	watch: {
	},
	mounted() {
	}
}
</script>
