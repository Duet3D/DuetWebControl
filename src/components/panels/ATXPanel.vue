<template>
	<v-card>
		<v-card-title class="d-flex align-center">
			<v-icon size="small" class="mr-1">mdi-power</v-icon>
			{{ $t("panel.atx.caption") }}
		</v-card-title>

		<v-card-text class="pt-0">
			<v-btn-toggle :model-value="atxPower" mandatory class="d-flex">
				<v-btn :value="true" variant="text" :disabled="uiStore.uiFrozen" :loading="sendingCode"
					   class="flex-grow-1" @click="toggleAtxPower(true)">
					{{ $t("panel.atx.on") }}
				</v-btn>
				<v-btn :value="false" variant="text" :disabled="uiStore.uiFrozen" :loading="sendingCode"
					   class="flex-grow-1" @click="toggleAtxPower(false)">
					{{ $t("panel.atx.off") }}
				</v-btn>
			</v-btn-toggle>
		</v-card-text>
	</v-card>
</template>

<script setup lang="ts">
import { useMachineStore } from "@/stores/machine";
import { useUiStore } from "@/stores/ui";

const machineStore = useMachineStore();
const uiStore = useUiStore();

const sendingCode = ref(false);

const atxPower = computed(() => machineStore.model.state.atxPower);

async function toggleAtxPower(value: boolean) {
	if (sendingCode.value) {
		return;
	}
	sendingCode.value = true;
	try {
		await machineStore.sendCode(value ? "M80" : "M81");
	} catch (e) {
		// handled before we get here
	}
	sendingCode.value = false;
}
</script>
