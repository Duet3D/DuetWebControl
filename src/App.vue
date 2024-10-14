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

		<ConnectDialog />
		<ConnectionProgressDialog />
		<MessageBoxDialog />
		<NotificationDisplay />
	</v-app>
</template>

<script setup lang="ts">
import { useMachineStore } from "@/stores/machine";

const machineStore = useMachineStore();

// Attempt to connect straight away unless running in dev mode
if (process.env.NODE_ENV !== "development") {
	/*await*/ machineStore.connect();
}
</script>
