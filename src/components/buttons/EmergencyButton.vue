<!-- NOT scoped: the rendered v-btn lives inside CodeButton's scope so this component's
     data-v hash never makes it onto the element -->
<style>
@media (max-width: 599.98px) {
	.estop-button.v-btn {
		min-width: 48px;
		width: 48px;
		height: 48px;
		padding: 0;
	}
}
</style>

<template>
	<CodeButton :code="emergencyCode" :log="false" :color="color || 'error'" variant="flat"
				:size="large ? 'large' : undefined"
				:disabled="disabled" :title="$t('button.emergencyStop.title')"
				class="estop-button">
		<v-icon class="me-0 me-sm-1">mdi-flash</v-icon>
		<span class="d-none d-sm-inline">{{ $t("button.emergencyStop.caption") }}</span>
	</CodeButton>
</template>

<script setup lang="ts">
defineProps<{
	color?: string;
	disabled?: boolean;
	large?: boolean;
}>();

// M112: immediate emergency stop; M999: restart the firmware afterwards so the user can continue
const emergencyCode = "M112\nM999";
</script>
