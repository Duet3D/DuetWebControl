<template>
	<CodeButton :code="emergencyCode" :log="false" :color="color || 'error'" :disabled="disabled"
				:title="$t('button.emergencyStop.title')">
		<v-icon class="mr-1">mdi-flash</v-icon>
		<span class="d-none d-sm-inline">{{ $t("button.emergencyStop.caption") }}</span>
	</CodeButton>
</template>

<script setup lang="ts">
defineProps<{
	color?: string;
	disabled?: boolean;
}>();

// M112: immediate emergency stop; M999: restart the firmware afterwards so the user can continue
const emergencyCode = "M112\nM999";
</script>
