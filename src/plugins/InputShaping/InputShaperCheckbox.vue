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

<script lang="ts">
import Vue, { PropType } from "vue";
import store from "@/store"

export default Vue.extend({
	props: {
		inputValue: Array as PropType<string[]>,
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
		uiFrozen(): boolean { return store.getters["uiFrozen"]; },
		shapingFrequency(): number { return store.state.machine.model.move.shaping.frequency; },
		shapingType(): string { return store.state.machine.model.move.shaping.type; },
		label(): string {
			if (this.value === 'none') {
				return 'None';
			}
			if (this.value === 'custom') {
				return 'Custom';
			}
			return this.value.toUpperCase();
		},
		showApply(): boolean {
			return this.canApply && !this.uiFrozen && (this.current !== this.value) && (this.shapingFrequency > 0);
		}
	},
	methods: {
		change(e: any) {
			if (this.value !== 'none') {
				this.$emit('change', e);
			}
		},
		async apply() {
			await store.dispatch("machine/sendCode", `M593 P"${this.value}"`);
		}
	}
});
</script>