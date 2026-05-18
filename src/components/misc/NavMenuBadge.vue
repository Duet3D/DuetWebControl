<template>
	<!-- Wrapping span gets a real native click listener so .stop.prevent reliably halts the
		 bubble before it reaches the v-list-item's RouterLink. Going through @click on v-chip
		 itself doesn't work because v-chip declares emits: ['click'] - the listener runs via
		 Vue's custom event system and stopPropagation on the native event isn't always honored
		 across that boundary. The wrapper is render-only; visual layout is unchanged -->
	<span class="d-inline-flex align-center" @click="onWrapperClick">
		<v-chip :size="size" density="comfortable" :color="badge.color ?? 'warning'"
				:class="{ 'nav-menu-badge-clickable': clearable }"
				:title="clearable ? $t('button.dismissAll.title') : undefined">
			{{ badge.value }}
			<v-icon v-if="clearable" :size="size" class="ms-1">mdi-close</v-icon>
		</v-chip>
	</span>
</template>

<script setup lang="ts">
import type { MenuBadge } from "@/stores/menu";

const props = withDefaults(defineProps<{
	badge: MenuBadge;
	size?: "x-small" | "small" | "default" | "large";
	noClear?: boolean;
}>(), {
	size: "x-small",
	noClear: false,
});

const clearable = computed(() => !props.noClear && !!props.badge.onClear);

// Native click handler on the wrapping span. For dismissible badges we swallow the event
// (so the surrounding v-list-item doesn't navigate) and fire onClear. For non-dismissible
// badges (Explorer's modified-editors chip) we let the click propagate to the list item
function onWrapperClick(e: MouseEvent) {
	if (!clearable.value) {
		return;
	}
	e.stopPropagation();
	e.preventDefault();
	props.badge.onClear!();
}
</script>

<style scoped>
.nav-menu-badge-clickable {
	cursor: pointer;
}
</style>
