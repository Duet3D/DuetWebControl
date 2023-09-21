<style>
table.tools {
	width: 100%;
	border-spacing: 0;
}

table.tools i {
    color: inherit !important;
}

table.tools td,
table.tools th {
	text-align: center;
}
</style>

<template>
    <table v-if="hasTools || hasBeds || hasChambers" class="tools">
        <colgroup>
            <col style="width: 25%">
            <col style="width: 20%">
            <col style="width: 19%">
            <col style="width: 18%">
            <col style="width: 18%">
        </colgroup>
        <thead>
            <tr>
                <th class="pl-2">
                    {{ $t("panel.tools.tool", [""]) }}
                </th>
                <th class="px-1">
                    {{ $t("panel.tools.heater", [""]) }}
                </th>
                <th class="px-1">
                    {{ $t("panel.tools.current", [""]) }}
                </th>
                <th class="px-1">
                    {{ $t("panel.tools.active") }}
                </th>
                <th class="pr-2">
                    {{ $t("panel.tools.standby") }}
                </th>
            </tr>
        </thead>
        <tbody>
            <!-- Tools -->
            <tool-rows @resetHeaterFault="resetHeaterFault" />

            <!-- Divider -->
            <tr v-if="hasTools && hasBeds">
                <td colspan="5">
                    <v-divider />
                </td>
            </tr>

            <!-- Beds -->
            <heater-rows type="bed" @resetHeaterFault="resetHeaterFault" />

            <!-- Divider -->
            <tr v-if="(hasTools || hasBeds) && hasChambers">
                <td colspan="5">
                    <v-divider />
                </td>
            </tr>

            <!-- Chambers -->
            <heater-rows type="chamber" @resetHeaterFault="resetHeaterFault" />
        </tbody>

        <!-- Heater faults-->
        <reset-heater-fault-dialog :shown.sync="resettingHeaterFault" :heater="faultyHeaterToReset" />
    </table>
    <v-alert v-else :value="true" type="info" class="mb-0">
        {{ $t("panel.tools.noTools") }}
    </v-alert>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

import { useMachineStore } from "@/store/machine";

import HeaterRows from "./HeaterRows.vue";
import ToolRows from "./ToolRows.vue";

const machineStore = useMachineStore();

// General appearance
const hasTools = computed(() => machineStore.model.tools.some(tool => tool !== null));
const hasBeds = computed(() => machineStore.model.heat.bedHeaters.some(bedHeater => (bedHeater >= 0) && (bedHeater < machineStore.model.heat.heaters.length) && (machineStore.model.heat.heaters[bedHeater] !== null)));
const hasChambers = computed(() => machineStore.model.heat.chamberHeaters.some(chamberHeater => (chamberHeater >= 0) && (chamberHeater < machineStore.model.heat.heaters.length) && (machineStore.model.heat.heaters[chamberHeater] !== null)));

// Heater fault management
const resettingHeaterFault = ref(false), faultyHeaterToReset = ref(-1);
function resetHeaterFault(heater: number) {
    faultyHeaterToReset.value = heater;
    resettingHeaterFault.value = true;
}
</script>
