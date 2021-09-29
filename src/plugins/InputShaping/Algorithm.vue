<style scoped>
</style>

<template>
	<div>
		<v-form ref="formInputShaping" @submit.prevent="submit">
			<v-row>
				<v-col class="ma-2">
					<v-btn @click="$emit('remove')">
							<v-icon>mdi-close</v-icon>
					</v-btn>
				</v-col>
				<v-col>
					<v-select
						:items="Object.values(InputShapingType)"
						v-model="algorithm.type"
						v-on:input="$emit('input', algorithm)"
						:label="$t('plugins.inputShaping.type')"
						:rules="rules.type"
						required
						></v-select>
				</v-col>
				<v-col>
					<v-text-field
						v-model.number="algorithm.frequency"
						v-on:input="$emit('input', algorithm)"
						type="number"
						:label="$t('plugins.inputShaping.frequency')"
						:rules="rules.frequency"
						required
						></v-text-field>
				</v-col>
				<v-col>
					<v-text-field
						v-model.number="algorithm.damping"
						v-on:input="$emit('input', algorithm)"
						type="number"
						:label="$t('plugins.inputShaping.damping')"
						:rules="rules.damping"
						required
						></v-text-field>
				</v-col>
				<v-col>
					<v-text-field
						v-model.number="algorithm.minAcceleration"
						v-on:input="$emit('input', algorithm)"
						type="number"
						:label="$t('plugins.inputShaping.minAcceleration')"
						:rules="rules.minAcceleration"
						required
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
	props: [ 'algorithm' ],
	data() {
		return {
			InputShapingType: InputShapingType,
			rules: {
				type: [ true ],
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
