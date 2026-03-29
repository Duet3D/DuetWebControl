<!-- Header-tab link helper: renders as a clickable anchor when inactive, or plain text when active.
	 Used by ToolsPanel to switch between the Tools list and the Extra-sensor list -->
<template>
	<a v-if="!active" href="javascript:void(0)" @click="$emit('click', $event)">
		<slot></slot>
	</a>
	<span v-else>
		<slot></slot>
	</span>
</template>

<style scoped>
span {
	cursor: default;
}
</style>

<script setup lang="ts">
defineProps<{
	active?: boolean;
}>();

defineEmits<{
	(e: "click", event: MouseEvent): void;
}>();
</script>
