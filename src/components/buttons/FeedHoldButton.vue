<!-- NOT scoped: the rendered v-btn lives inside CodeButton's scope so this component's
     data-v hash never makes it onto the element -->
<style>
@media (max-width: 599.98px) {
	.feed-hold-button.v-btn {
		min-width: 48px;
		width: 48px;
		height: 48px;
		padding: 0;
	}
}
</style>

<template>
	<CodeButton :code="isHeld ? 'M24' : 'M25.1'" color="warning" variant="flat" urgent
				:size="large ? 'large' : undefined"
				:disabled="!canFeedHold" :title="isHeld ? $t('button.feedHold.releaseTitle') : $t('button.feedHold.title')"
				class="feed-hold-button">
		<v-icon class="me-0 me-sm-1">{{ isHeld ? "mdi-play" : "mdi-hand-back-left" }}</v-icon>
		<span class="d-none d-sm-inline">{{ isHeld ? $t("button.feedHold.release") : $t("button.feedHold.caption") }}</span>
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
const isHeld = computed(() => status.value === MachineStatus.held);

// A feed hold applies to any motion and to a job between moves; while held the button releases instead
const canFeedHold = computed(() => isHeld.value || (status.value !== MachineStatus.cancelling && (machineStore.model.move.currentMove.requestedSpeed > 0 || isPrinting(status.value))));
</script>
