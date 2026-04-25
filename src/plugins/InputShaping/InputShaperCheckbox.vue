<!-- Per-shaper toggle row used in the InputShaping sidebar. Wraps a v-checkbox with a status
	 chip (configured / apply) and an optional default slot for shaper-specific UI (e.g. the
	 custom shaper opens an edit menu in that slot). v-model carries the selected-shapers array
	 with "none" treated specially - it represents "shaping disabled" rather than an item -->
<template>
	<v-checkbox v-bind="checkboxBindings" :disabled="uiStore.uiFrozen" :label="label" hide-details
				color="primary" @update:model-value="onChange">
		<template #append>
			<slot>
				<v-chip v-if="current === value" size="x-small" color="success">
					{{ $t("plugins.accelerometer.configured") }}
				</v-chip>
				<v-chip v-if="showApply" size="x-small" color="grey" class="ml-1" @click="apply">
					{{ $t("plugins.accelerometer.apply") }}
				</v-chip>
			</slot>
		</template>
	</v-checkbox>
</template>

<script setup lang="ts">
import { useMachineStore } from "@/stores/machine";
import { useUiStore } from "@/stores/ui";

const props = defineProps<{
	value: string;
	current?: string;
	canApply?: boolean;
}>();

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

// "none" is the special "shaping disabled" sentinel; it's checked when the firmware reports
// type === "none" rather than tracked via the selected-shapers array. Every other row reflects
// whether its key is in the array
const checkboxBindings = computed(() => {
	if (props.value === "none") {
		return { "model-value": shapingType.value === "none" };
	}
	return { "model-value": selected.value.includes(props.value), value: props.value };
});

const showApply = computed(() => {
	const enabled = props.canApply ?? true;
	return enabled && !uiStore.uiFrozen && shapingType.value !== props.value && shapingFrequency.value > 0;
});

function onChange(next: unknown) {
	if (props.value === "none") {
		// The "none" row is read-only - clearing all shapers happens via M593 P"none" through the
		// Apply chip rather than the checkbox itself
		return;
	}
	if (Array.isArray(next)) {
		selected.value = next as Array<string>;
	} else if (typeof next === "boolean") {
		const has = selected.value.includes(props.value);
		if (next && !has) {
			selected.value = [...selected.value, props.value];
		} else if (!next && has) {
			selected.value = selected.value.filter((v) => v !== props.value);
		}
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
