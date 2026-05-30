<template>
	<v-dialog v-model="shown" persistent no-click-animation width="360">
		<v-card>
			<v-form ref="form" @submit.prevent="submit">
				<v-card-title>
					<span class="text-headline-small">{{ title }}</span>
				</v-card-title>

				<v-card-text>
					{{ prompt }}
					<v-text-field v-model="input" :rules="inputRules" autofocus required />
				</v-card-text>

				<v-card-actions>
					<v-spacer />
					<v-btn color="blue-darken-1" variant="text" @click="cancel">
						{{ $t("generic.cancel") }}
					</v-btn>
					<v-btn color="blue-darken-1" variant="text" type="submit">
						{{ $t("generic.ok") }}
					</v-btn>
				</v-card-actions>
			</v-form>
		</v-card>
	</v-dialog>
</template>

<script setup lang="ts">
import { VForm } from "vuetify/components";

import i18n from "@/i18n";

const props = defineProps<{
	title: string;
	prompt: string;
	isNumericValue?: boolean;
	preset?: string | number;
	// Numeric input: min/max bound the value. String input: they bound the length
	min?: number;
	max?: number;
}>();

const shown = defineModel<boolean>("shown", { required: true });
const emit = defineEmits<{
	confirmed: [value: string | number];
	cancelled: [];
}>();

const form = ref<InstanceType<typeof VForm> | null>(null);
const input = ref("");

function checkMin(v: string): boolean | string {
	if (props.min === undefined) {
		return true;
	}
	if (props.isNumericValue) {
		return parseFloat(v) >= props.min || i18n.global.t("dialog.minValue", [props.min]);
	}
	return v.length >= props.min || i18n.global.t("dialog.minLength", [props.min]);
}

function checkMax(v: string): boolean | string {
	if (props.max === undefined) {
		return true;
	}
	if (props.isNumericValue) {
		return parseFloat(v) <= props.max || i18n.global.t("dialog.maxValue", [props.max]);
	}
	return v.length <= props.max || i18n.global.t("dialog.maxLength", [props.max]);
}

const inputRules = [
	(v: string) => !!v || i18n.global.t("dialog.inputRequired"),
	(v: string) => !props.isNumericValue || isFinite(parseFloat(v)) || i18n.global.t("dialog.numberRequired"),
	checkMin,
	checkMax,
];

async function submit() {
	if (!form.value) {
		return;
	}
	const { valid } = await form.value.validate();
	if (valid) {
		shown.value = false;
		emit("confirmed", props.isNumericValue ? parseFloat(input.value) : input.value);
	}
}

function cancel() {
	shown.value = false;
	emit("cancelled");
}

// immediate so a freshly-mounted instance (the queue host remounts one per request) picks up its
// preset even though `shown` is already true at mount
watch(shown, (to) => {
	if (to) {
		input.value = (props.preset !== undefined && props.preset !== null) ? props.preset.toString() : "";
		// Defer reset so validation only fires after user interaction
		nextTick(() => form.value?.resetValidation());
	}
}, { immediate: true });
</script>
