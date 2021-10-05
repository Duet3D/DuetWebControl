<style scoped>
</style>

<template>
	<v-col>
		<v-form ref="formSession" @submit.prevent="submit">
			<v-row>
				<v-col>
					<v-text-field
						:label="$t('plugins.inputShaping.id')"
						v-model="session.id"
						:disabled="true"
						required
					></v-text-field>
				</v-col>
			</v-row>
			<v-row>
				<v-col>
					<v-text-field
						:label="$t('plugins.inputShaping.name')"
						v-model="session.name"
						v-on:input="$emit('input', session)"
						required
					></v-text-field>
				</v-col>
			</v-row>
		</v-form>

		<v-card-text class="pa-0" v-show="session.records.length > 0">
			<v-alert :type="'warning'">
				TEST can not be edited when records were recorded.<br>
				To edit a test delete all records or start a new session.<br><br>
				ALGORITHMS can still be added.<br>
				ALGORITHM can only be changed if no records is linked to it.<br>
				To edit an algortihm delete the appropriate record.
			</v-alert>
		</v-card-text>

		<test-command
			:test="session.test"
			v-bind:id="session.id"
			v-on:test-command="console.log($event)"
			:disabled="session.records.length > 0"
		></test-command>

		<algorithm v-for="(algo, index) in session.algorithms"
				v-bind:key="index"
				:algorithm="session.algorithms[index]"
				:disabled="session.records.findIndex(rec => rec.config === algo) >= 0"
				v-on:update="updateAlgorithm(index, change)"
				v-on:remove="removeAlgorithm(index)"
		></algorithm>

		<form v-on:submit.prevent="addAlgorithm">
			<v-btn color="primary" @click="addAlgorithm">
					<v-icon class="mr-2">mdi-plus-outline</v-icon> {{ $t('plugins.inputShaping.addAlgorithm') }}
			</v-btn>
		</form>
	</v-col>
</template>

<script>

'use strict';

import { Algorithm } from './InputShapingSession.js';

export default {
	props: [ 'session' ],
	data() {
		return {
		};
	},
	computed: {
	},
	methods: {
		addAlgorithm() {
			this.session.algorithms.push(new Algorithm());
		},
		removeAlgorithm(index) {
			this.session.algorithms.splice(index, 1);
		}

	},
	watch: {
	},
	mounted() {
	}
}
</script>
