<template>
	<v-checkbox :model-value="isChecked" :disabled="uiStore.uiFrozen" :label="label" hide-details
				color="primary" @update:model-value="onChange">
		<template #append>
			<slot>
				<v-chip v-if="current === value" size="x-small" color="success">
					{{ $t("plugins.accelerometer.configured") }}
				</v-chip>
				<v-chip v-if="showApply" size="x-small" color="surface-variant" class="ml-1" @click="apply">
					{{ $t("plugins.accelerometer.apply") }}
				</v-chip>
			</slot>
		</template>
	</v-checkbox>
</template>

<script setup lang="ts">
import { useMachineStore } from "@/stores/machine";
import { useUiStore } from "@/stores/ui";

const props = withDefaults(defineProps<{
	value: string;
	current?: string;
	canApply?: boolean;
}>(), {
	canApply: true
});

const selected = defineModel<Array<string>>({ default: () => [] });

const machineStore = useMachineStore();
const uiStore = useUiStore();

const shapingFrequency = computed(() => machineStore.model.move.shaping.frequency);
const shapingType = computed(() => machineStore.model.move.shaping.type);

const label = computed(() => {
	if (props.value === "none") {
		return "None";
	}
	if (props.value === "custom") {
		return "Custom";
	}
	return props.value.toUpperCase();
});

// "none" is not part of the selected-shapers array, it only mirrors the firmware state and is applied via its
// chip. Every other row reflects whether its key is in the array. Driving the checkbox via a plain boolean
// (instead of the dual model-value + value props pair) avoids Vuetify's array-mode toggling silently dropping
// the update event when value mismatches model-value's runtime type
const isChecked = computed(() => (props.value === "none") ? (shapingType.value === "none") : selected.value.includes(props.value));

const showApply = computed(() => props.canApply && !uiStore.uiFrozen && shapingType.value !== props.value && shapingFrequency.value > 0);

function onChange(next: boolean | null) {
	if (props.value === "none") {
		return;
	}
	const checked = next === true;
	const has = selected.value.includes(props.value);
	if (checked && !has) {
		selected.value = [...selected.value, props.value];
	} else if (!checked && has) {
		selected.value = selected.value.filter((v) => v !== props.value);
	}
}

async function apply() {
	try {
		await machineStore.sendCode(`M593 P"${props.value}"`);
	} catch (e) {
		console.warn(e);
	}
}
</script>
