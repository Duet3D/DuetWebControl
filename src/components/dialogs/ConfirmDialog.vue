<template>
	<v-dialog v-model="shown" width="480" persistent no-click-animation>
		<v-form @submit.prevent="confirm">
			<v-card>
				<v-card-title>
					<v-icon v-if="icon" class="mr-1">{{ icon }}</v-icon>
					{{ title }}
				</v-card-title>
				<v-card-text v-if="html" v-html="prompt" />
				<v-card-text v-else>{{ prompt }}</v-card-text>
				<v-card-actions>
					<slot name="extra-actions" />
					<v-spacer />
					<v-btn color="blue-darken-1" variant="text" type="button" @click="cancel">
						{{ $t("generic.no") }}
					</v-btn>
					<v-btn color="blue-darken-1" variant="text" type="submit" autofocus>
						{{ $t("generic.yes") }}
					</v-btn>
				</v-card-actions>
			</v-card>
		</v-form>
	</v-dialog>
</template>

<script setup lang="ts">
// `html` callers pass a developer-authored, already-translated string (see showConfirmDialog);
// it is never user input, so v-html here carries no injection surface the page doesn't already have
defineProps<{
	title: string;
	prompt: string;
	icon?: string;
	html?: boolean;
}>();

const shown = defineModel<boolean>("shown", { required: true });
const emit = defineEmits<{
	confirmed: [];
	cancelled: [];
}>();

function confirm() {
	shown.value = false;
	emit("confirmed");
}

function cancel() {
	shown.value = false;
	emit("cancelled");
}
</script>
