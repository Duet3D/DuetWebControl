<style scoped>
.v-btn-toggle {
	display: flex;
}

.v-btn-toggle > button {
	display: flex;
	flex: 1 1 auto;
}
</style>

<template>
	<v-card>
		<v-card-title>
			<v-icon small class="mr-1">mdi-power</v-icon>
			{{ $t("panel.atx.caption") }}
		</v-card-title>

		<v-card-text class="pt-0">
			<v-btn-toggle :value="machineStore.model.state.atxPower" @change="toggleAtxPower" mandatory>
				<v-btn variant="text" :value="true" :disabled="uiStore.uiFrozen" :loading="sendingCode"
					   @click="toggleAtxPower(true)">
					{{ $t("panel.atx.on") }}
				</v-btn>
				<v-btn variant="text" :value="false" :disabled="uiStore.uiFrozen" :loading="sendingCode"
					   @click="toggleAtxPower(false)">
					{{ $t("panel.atx.off") }}
				</v-btn>
			</v-btn-toggle>
		</v-card-text>
	</v-card>
</template>

<script setup lang="ts">
import { useMachineStore } from "@/store/machine";
import { useUiStore } from "@/store/ui";

const machineStore = useMachineStore(), uiStore = useUiStore();

let sendingCode = false;

async function toggleAtxPower(value: boolean) {
	if (!sendingCode) {
		sendingCode = true;
		try {
			await machineStore.sendCode(value ? "M80" : "M81");
		} catch (e) {
			// handled before we get here
		}
		sendingCode = false;
	}
}
</script>
