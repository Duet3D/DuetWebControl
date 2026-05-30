<template>
	<InputDialog v-model:shown="shown" :key="current?.id ?? 0" :title="current?.title ?? ''"
				 :prompt="current?.prompt ?? ''" :preset="current?.preset"
				 :is-numeric-value="current?.isNumeric ?? false" :min="current?.min" :max="current?.max"
				 @confirmed="settle" @cancelled="settle(null)" />
</template>

<script setup lang="ts">
import InputDialog from "./InputDialog.vue";
import { useInputQueue } from "@/composables/useInputDialog";

const queue = useInputQueue();
const current = computed(() => queue[0] ?? null);

// InputDialog sets shown=false itself on OK/Cancel; the queue is advanced from those emits instead,
// so the setter is a no-op to avoid settling the same request twice. Keying by request id remounts
// the field per request, so a request resolving straight into the next one still resets the input
const shown = computed({
	get: () => current.value !== null,
	set: () => {}
});

function settle(value: string | number | null) {
	queue.shift()?.resolve(value);
}
</script>
