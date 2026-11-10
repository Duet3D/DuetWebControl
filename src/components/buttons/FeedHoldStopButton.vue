<!-- NOT scoped: the rendered v-btn lives inside CodeButton's scope so this component's
     data-v hash never makes it onto the element -->
<style>
@media (max-width: 599.98px) {
	.feed-hold-stop-button.v-btn {
		min-width: 48px;
		width: 48px;
		height: 48px;
		padding: 0;
	}
}
</style>

<template>
	<CodeButton code="M25.1 S1" color="warning" variant="flat" urgent
				:size="large ? 'large' : undefined"
				:disabled="!canStop" :title="$t('button.feedHoldStop.title')"
				class="feed-hold-stop-button">
		<v-icon class="me-0 me-sm-1">mdi-stop</v-icon>
		<span class="d-none d-sm-inline">{{ $t("button.feedHoldStop.caption") }}</span>
	</CodeButton>
</template>

<script setup lang="ts">
import { MachineStatus } from "@duet3d/objectmodel";

import CodeButton from "@/components/buttons/CodeButton.vue";
import { useMachineStore } from "@/stores/machine";
import { isPrinting } from "@/utils/enums";

defineProps<{
	large?: boolean;
}>();

const machineStore = useMachineStore();

const status = computed(() => machineStore.model.state.status);

// Stop-and-abort applies to any motion, to a held machine and to a job between moves
const canStop = computed(() => status.value !== MachineStatus.cancelling && (machineStore.model.move.currentMove.requestedSpeed > 0 || isPrinting(status.value)));
</script>
