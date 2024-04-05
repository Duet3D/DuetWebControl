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
	</v-app>
</template>

<script setup lang="ts">
import { useMachineStore } from "@/store/machine";

const machineStore = useMachineStore();

if (!machineStore.isConnected) {
	/*await*/ machineStore.connect("ender5pro");
}
</script>
