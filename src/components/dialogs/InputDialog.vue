<!-- Generic single-input dialog: prompts for one value, validates, emits "confirmed" with the parsed value -->
<template>
	<v-dialog v-model="shown" persistent no-click-animation width="360">
		<v-card>
			<v-form ref="form" @submit.prevent="submit">
				<v-card-title>
					<span class="text-h5">{{ title }}</span>
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
}>();

const shown = defineModel<boolean>("shown", { required: true });
const emit = defineEmits<{
	confirmed: [value: string | number];
	cancelled: [];
}>();

const form = ref<InstanceType<typeof VForm> | null>(null);
const input = ref("");

const inputRules = [
	(v: string) => !!v || i18n.global.t("dialog.inputRequired"),
	(v: string) => !props.isNumericValue || isFinite(parseFloat(v)) || i18n.global.t("dialog.numberRequired"),
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

watch(shown, (to) => {
	if (to) {
		input.value = (props.preset !== undefined && props.preset !== null) ? props.preset.toString() : "";
		// Defer reset so validation only fires after user interaction
		nextTick(() => form.value?.resetValidation());
	}
});
</script>
