<!-- Yes/No confirmation prompt. Caller drives `shown` via v-model and listens for `confirmed` or
	 `cancelled` to take action -->
<template>
	<v-dialog v-model="shown" width="480" persistent no-click-animation>
		<v-card>
			<v-card-title>
				<v-icon v-if="icon" class="mr-1">{{ icon }}</v-icon>
				{{ title }}
			</v-card-title>
			<v-card-text>{{ prompt }}</v-card-text>
			<v-card-actions>
				<v-spacer />
				<v-btn color="blue-darken-1" variant="text" @click="cancel">
					{{ $t("generic.no") }}
				</v-btn>
				<v-btn color="blue-darken-1" variant="text" @click="confirm">
					{{ $t("generic.yes") }}
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script setup lang="ts">
defineProps<{
	title: string;
	prompt: string;
	icon?: string;
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
