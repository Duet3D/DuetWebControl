<template>
	<v-btn :disabled="$props.disabled || uiStore.uiFrozen" :elevation="1" :loading="waitingForCode"
		   @click="click" @contextmenu="$emit('contextmenu', $event)">
		<slot></slot>
	</v-btn>
</template>

<script setup lang="ts">
import { useMachineStore } from "@/stores/machine";
import { useUiStore } from "@/stores/ui";

const props = defineProps<{
    code: string;
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