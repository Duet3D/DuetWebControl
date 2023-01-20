<template>
	<v-checkbox :input-value="(value === 'none') ? (shapingType === 'none') : inputValue" :value="(value === 'none') ? true : value" :disabled="uiFrozen" :label="label" hide-details @change="change">
		<template #append>
			<slot>
				<v-chip v-show="current === value" small color="success">
					configured
				</v-chip>
				<v-chip v-show="showApply" small color="gray" @click="apply">
					apply
				</v-chip>
			</slot>
		</template>
	</v-checkbox>
</template>

<script>
'use strict'

import { mapActions, mapGetters, mapState } from 'vuex'

export default {
	props: {
		inputValue: Array,
		value: {
			required: true,
			type: String
		},
		current: String,
		canApply: {
			default: true,
			type: Boolean
		}
	},
	model: {
		prop: 'inputValue',
		event: 'change'
	},
	computed: {
		...mapGetters(['uiFrozen']),
		...mapState('machine/model', {
			shapingFrequency: state => state.move.shaping.frequency,
			shapingType: state => state.move.shaping.type
		}),
		label() {
			if (this.value === 'none') {
				return 'None';
			}
			if (this.value === 'custom') {
				return 'Custom';
			}
			return this.value.toUpperCase();
		},
		showApply() {
			return this.canApply && !this.uiFrozen && (this.current !== this.value) && (this.shapingFrequency > 0);
		}
	},
	methods: {
		...mapActions('machine', ['sendCode']),
		change(e) {
			if (this.value !== 'none') {
				this.$emit('change', e);
			}
		},
		async apply() {
			await this.sendCode(`M593 P"${this.value}"`);
		}
	}
}
</script>