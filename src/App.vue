<template>
	<v-app>
		<v-main>
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
		</v-main>

		<MessageBoxDialog />
	</v-app>
</template>

<script setup lang="ts">
import { useMachineStore } from "@/stores/machine";

const machineStore = useMachineStore();

if (!machineStore.isConnected) {
  /* await */ machineStore.connect("ender6");
}
</script>
