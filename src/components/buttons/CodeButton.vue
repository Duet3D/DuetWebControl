<template>
	<v-btn :color="color" :variant="variant" :size="size" :disabled="$props.disabled || (urgent ? uiStore.uiDisconnected : uiStore.uiFrozen)"
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
//
// Vue casts an absent Boolean prop to false, which would turn off sendCode's reply and error logging
const props = withDefaults(defineProps<{
    // G-code(s) to send when the button is clicked
    code: string;
    // Button colour, forwarded to v-btn
    color?: string;
    // Button variant, forwarded to v-btn
    variant?: "flat" | "text" | "elevated" | "tonal" | "outlined" | "plain";
    // Button size, forwarded to v-btn
    size?: "x-small" | "small" | "default" | "large" | "x-large";
    // Disable the button regardless of the UI state
    disabled?: boolean;
    // Log the reply and errors of the code
    log?: boolean;
    // Send the code without waiting for its reply
    noWait?: boolean;
    // The firmware executes this code ahead of a blocked channel (M112, M24, M25.1), so only a missing connection disables the button
    urgent?: boolean;
}>(), { log: true });

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
