<style scoped>
</style>

<template>
	<div>
		Algorithm Component

		<v-form ref="formInputShaping" v-on:submit.prevent="">
			<v-row>
				<v-col>
					<v-select
						:items="Object.values(InputShapingType)"
						v-model="value.type"
						v-on:input="$emit('input', value)"
						:label="$t('plugins.inputShaping.algorithm')"
						:rules="rules.algorithm"
						></v-select>
				</v-col>
				<v-col>
					<v-text-field
						v-model.number="value.frequency"
						v-on:input="$emit('input', value)"
						type="number"
						:label="$t('plugins.inputShaping.frequency')"
						:rules="rules.frequency"
						></v-text-field>
				</v-col>
				<v-col>
					<v-text-field
						v-model.number="value.damping"
						v-on:input="$emit('input', value)"
						type="number"
						:label="$t('plugins.inputShaping.damping')"
						:rules="rules.damping"
						></v-text-field>
				</v-col>
				<v-col>
					<v-text-field
						v-model.number="value.minAcceleration"
						v-on:input="$emit('input', value)"
						type="number"
						:label="$t('plugins.inputShaping.minAcceleration')"
						:rules="rules.minAcceleration"
						></v-text-field>
				</v-col>
			</v-row>
		</v-form>

	</div>
</template>

<script>
'use strict';

import { InputShapingType } from '../../store/machine/modelEnums.js';

export default {
	props: [
		'value'
	],
	data() {
		return {
			InputShapingType: InputShapingType,
			rules: {
				algorithm: [ true ],
				frequency: [ true ],
				damping: [ true ],
				minAcceleration: [ true ],
			}
		};
	},
	computed: {
	},
	methods: {
	},
	watch: {
	},
	mounted() {
	}
}
</script>
