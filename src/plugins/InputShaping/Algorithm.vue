<style scoped>
</style>

<template>
	<div>
		<v-form ref="formInputShaping" @submit.prevent="submit">
			<v-row>
				<v-col class="ma-2">
					<v-btn @click="$emit('remove')"
						:disabled="disabled"
						><v-icon>mdi-trash-can-outline</v-icon>
					</v-btn>
				</v-col>
				<v-col>
					<v-select
						:items="inputShapingTypes"
						v-model="algorithm.type"
						v-on:input="$emit('input', algorithm)"
						:label="$t('plugins.inputShaping.type')"
						:rules="rules.type"
						:disabled="disabled"
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
						:disabled="algorithm.type === this.InputShapingType.none || disabled"
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
						:disabled="algorithm.type === this.InputShapingType.none || disabled"
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
						:disabled="algorithm.type === this.InputShapingType.none || disabled"
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
import { mapState } from 'vuex';

export default {
	props: [ 'algorithm', 'disabled' ],
	data() {
		return {
			InputShapingType: InputShapingType,
			rules: {
				type: [ v => (this.inputShapingTypes.indexOf(v) >= 0) || this.$t('plugins.inputShaping.validType') ],
				frequency: [ v => v > 7 && v < 1000 || this.$t('plugins.inputShaping.validFrequency', [8, 1000]) ],
				damping: [  v => v > 0 && v < 1 || this.$t('plugins.inputShaping.validDamping', [ 0, 1 ]) ],
				minAcceleration: [ v => v >= 0 && v <= this.maxAcceleration || this.$t('plugins.inputShaping.validAcceleration', [ 0, this.maxAcceleration ]) ],
			}
		};
	},
	computed: {
		...mapState('machine/model', {
			maxAcceleration: model => model.move.printingAcceleration,
		}),
		inputShapingTypes() {
			return Object.values(InputShapingType);
		},
	},
	methods: {
	},
	watch: {
	},
	mounted() {
	}
}
</script>
