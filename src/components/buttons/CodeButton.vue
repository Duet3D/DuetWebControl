<template>
	<v-btn :color="color" :variant="variant" :size="size" :disabled="$props.disabled || uiStore.uiFrozen"
		   :elevation="1" :loading="waitingForCode" @click="click">
		<slot></slot>
	</v-btn>
</template>

<script setup lang="ts">
import { useMachineStore } from "@/stores/machine";
import { useUiStore } from "@/stores/ui";

// Forward color + variant to v-btn so callers (EmergencyButton wants color="error" with the
// filled flat variant for the solid red E-STOP look) actually paint. The default `<v-btn>`
// variant is "elevated" which renders white with a subtle shadow even when colored
const props = defineProps<{
    code: string;
    color?: string;
    variant?: "flat" | "text" | "elevated" | "tonal" | "outlined" | "plain";
    size?: "x-small" | "small" | "default" | "large" | "x-large";
    disabled?: boolean;
    log?: boolean;
    noWait?: boolean;
}>();

const machineStore = useMachineStore(), uiStore = useUiStore();

const waitingForCode = ref(false);

async function click() {
    try {
        if (props.noWait) {
            // Run the requested code but don't wait for a result
            await machineStore.sendCode(props.code, false, props.log, true);
        } else {
            // Wait for the code to complete and block while doing so
            waitingForCode.value = true;
            try {
                await machineStore.sendCode(props.code, false, props.log);
            } finally {
                waitingForCode.value = false;
            }
        }
    } catch (e) {
        // handled before we get here
    }
}
</script>
