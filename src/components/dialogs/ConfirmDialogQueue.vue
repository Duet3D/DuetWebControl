<template>
	<ConfirmDialog v-model:shown="shown" :title="current?.title ?? ''" :prompt="current?.prompt ?? ''"
				   :icon="current?.icon" :html="current?.html" @confirmed="settle(true)" @cancelled="settle(false)" />
</template>

<script setup lang="ts">
import ConfirmDialog from "./ConfirmDialog.vue";
import { useConfirmQueue } from "@/composables/useConfirmDialog";

const queue = useConfirmQueue();
const current = computed(() => queue[0] ?? null);

// ConfirmDialog sets shown=false itself on Yes/No; the queue is advanced from those emits instead,
// so the setter is a no-op to avoid settling the same request twice
const shown = computed({
	get: () => current.value !== null,
	set: () => {}
});

function settle(confirmed: boolean) {
	queue.shift()?.resolve(confirmed);
}
</script>
