<template>
	<v-app>
		<v-main>
			<v-container class="fill-height">
				<v-responsive class="align-center text-center fill-height">
					nothing to see here yet
				</v-responsive>
			</v-container>
		</v-main>
	</v-app>
</template>

<script setup lang="ts">
import { useMachineStore } from "@/store/machine";

// temp
useMachineStore().model.job.lastDuration = 123;
</script>
