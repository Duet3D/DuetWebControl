<!-- Phase 1 placeholder so the file-based router resolves "/" and the default layout actually mounts -->
<!-- Replaced by the real Dashboard page during Phase 3 of the modernization plan -->
<template>
	<v-container class="fill-height">
		<v-responsive class="align-center text-center fill-height">
			nothing to see here yet
			<template v-if="machineStore.isConnected">
				<br>
				<br>
				Uptime: {{ machineStore.model.state.upTime }}
			</template>
		</v-responsive>
	</v-container>
</template>

<script setup lang="ts">
import { useMachineStore } from "@/stores/machine";

const machineStore = useMachineStore();
</script>
