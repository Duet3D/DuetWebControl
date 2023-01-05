<template>
    <fragment>
        <template v-if="singleControl && firstHeater !== null">
            <!-- Single Heater Control-->
            <tr>
                <!-- Heater item name -->
                <th class="pl-2">
                    <v-menu bottom offset-y>
                        <template #activator="{ on, attrs }">
                            <a href="javascript:void(0)" v-bind="attrs" v-on="on">
                                {{ singleHeaterCaption }}
                                <v-icon dense class="ms-n1">mdi-menu-down</v-icon>
                            </a>
                        </template>
                        <v-list>
                            <v-list-item @click="selectedHeater = null; selectedHeaterIndex = -1">
                                <v-list-item-title>
                                    <v-icon small v-text="(props.type === 'bed') ? 'mdi-radiator' : 'mdi-heat-pump-outline'" />
                                    {{ (props.type === "bed") ? $t("panel.tools.allBeds") : $t("panel.tools.allChambers") }}
                                </v-list-item-title>
                            </v-list-item>

                            <template v-for="{ heater, index } in heaterItems">
                                <v-list-item v-if="heater !== null" :key="index" @click="selectHeater(heater, index)">
                                    <v-list-item-title>
                                        <v-icon class="mr-1" v-text="(props.type === 'bed') ? 'mdi-radiator' : 'mdi-heat-pump-outline'" />
                                        {{ (props.type === "bed") ? $t("panel.tools.bed", [index]) : $t("panel.tools.chamber", [index]) }}
                                    </v-list-item-title>
                                </v-list-item>
                            </template>
                        </v-list>
                    </v-menu>
                </th>

                <!-- Heater name -->
                <th v-if="selectedHeater !== null">
                    <a href="javascript:void(0)" @click="heaterClick(selectedHeater, selectedHeaterIndex)"
                       :class="getHeaterColor(heaterIndices[selectedHeaterIndex])">
                        {{ getHeaterName(selectedHeater, heaterIndices[selectedHeaterIndex]) }}
                    </a>
                    <br>
                    <span class="font-weight-regular caption">
                        {{ $t(`generic.heaterStates.${selectedHeater.state}`) }}
                    </span>
                </th>
                <th v-else>
                    <a href="javascript:void(0)" class="font-weight-regular" @click="allBedHeaterClick">
                        {{ $t(`generic.heaterStates.${ firstHeater.state}`) }}
                    </a>
                </th>

                <!-- Heater value -->
                <td>
                    {{ getHeaterValue(firstHeater) }}
                </td>

                <!-- Heater active -->
                <td class="pl-2 pr-1">
                    <control-input type="all" control-beds active />
                </td>

                <!-- Heater standby -->
                <td class="pl-1 pr-2">
                    <control-input type="all" control-beds standby />
                </td>
            </tr>
        </template>
        <template v-else v-for="{ heater, index } in heaterItems">
            <!-- Individual Heater Control-->
            <template v-if="heater !== null">
                <!-- Heater -->
                <tr :key="`heater - ${ index } -0`">
                    <!-- Heater item name -->
                    <th class="pl-2">
                        <a href="javascript:void(0)" @click="heaterClick(heater, index)">
                            <v-icon small v-text="(props.type === 'bed') ? 'mdi-radiator' : 'mdi-heat-pump-outline'" />
                            {{ (props.type === "bed") ? $t("panel.tools.bed", [(heaterItems.length === 1) ? "" : index]) : $t("panel.tools.chamber", [(heaterItems.length === 1) ? "" : index]) }}
                        </a>
                    </th>

                    <!-- Heater name -->
                    <th>
                        <a href="javascript:void(0)" @click="heaterClick(heater, index)"
                           :class="getHeaterColor(heaterIndices[index])">
                            {{ getHeaterName(heater, heaterIndices[index]) }}
                        </a>
                        <br>
                        <span class="font-weight-regular caption">
                            {{ $t(`generic.heaterStates.${ heater.state}`) }}
                        </span>
                    </th>

                    <!-- Heater value -->
                    <td>
                        {{ getHeaterValue(heater) }}
                    </td>

                    <!-- Heater active -->
                    <td class="pl-2 pr-1">
                        <control-input :type="props.type" :index="index" active />
                    </td>

                    <!-- Heater standby -->
                    <td class="pl-1 pr-2">
                        <control-input :type="props.type" :index="index" standby />
                    </td>
                </tr>
            </template>
        </template>
    </fragment>
</template>

<script setup lang="ts">
import { Heater, HeaterState } from "@duet3d/objectmodel";
import { computed, PropType, ref } from "vue";

import i18n from "@/i18n";
import store from "@/store";
import { getHeaterColor } from "@/utils/colors";
import { displaySensorValue } from "@/utils/display";

const props = defineProps({
    type: String as PropType<"bed" | "chamber">
});

const emit = defineEmits<{
    (e: "resetHeaterFault", heater: number): void
}>();

const uiFrozen = computed<boolean>(() => store.getters["uiFrozen"]);

// Settings
const singleControl = computed(() => (props.type === "bed") ? store.state.machine.settings.singleBedControl : store.state.machine.settings.singleChamberControl);

// Heater abstraction
const heaterIndices = computed(() => (props.type === "bed") ? store.state.machine.model.heat.bedHeaters : store.state.machine.model.heat.chamberHeaters);
const heaterItems = computed<Array<{ heater: Heater, index: number }>>(() => {
    const heaterList: Array<{ heater: Heater, index: number }> = [];
    for (const index of heaterIndices.value) {
        if ((index >= 0) && (index < store.state.machine.model.heat.heaters.length) && (store.state.machine.model.heat.heaters[index] !== null)) {
            heaterList.push({ heater: store.state.machine.model.heat.heaters[index]!, index });
        }
    }
    return heaterList;
});
const firstHeater = computed(() => (heaterItems.value.length > 0) ? heaterItems.value[0].heater : null);

// Single heater control
const selectedHeater = ref<Heater | null>(null), selectedHeaterIndex = ref(-1);

function selectHeater(heater: Heater, index: number) {
    selectedHeater.value = heater;
    selectedHeaterIndex.value = index;
}

const singleHeaterCaption = computed(() => {
    if (selectedHeater === null) {
        return (props.type === "bed") ? i18n.t("panel.tools.beds") : i18n.t("panel.tools.chambers");
    }
    return (props.type === "bed") ? i18n.t("panel.tools.bed", [""]) : i18n.t("panel.tools.chamber", [""]);
});

async function allBedHeaterClick() {
    if (uiFrozen.value) {
        return;
    }

    // Get valid bed indices
    const bedIndices: Array<number> = [];
    for (let bedIndex = 0; bedIndex < store.state.machine.model.heat.bedHeaters.length; bedIndex++) {
        const heaterIndex = store.state.machine.model.heat.bedHeaters[bedIndex];
        if (heaterIndex >= 0 && heaterIndex < store.state.machine.model.heat.heaters.length) {
            const bedHeater = store.state.machine.model.heat.heaters[heaterIndex];
            if (bedHeater !== null) {
                bedIndices.push(bedIndex);

                // Since there is no dedicate facility for resetting heater faults, check all bed heaters here
                if (bedHeater.state === HeaterState.fault) {
                    emit("resetHeaterFault", heaterIndex);
                    return;
                }
            }
        }
    }

    // Control beds depending on the state of the first heater
    if (firstHeater.value !== null) {
        switch (firstHeater.value.state) {
            case HeaterState.off:		// Off -> Active
                await store.dispatch("machine/sendCode", bedIndices.map(bedIndex => `M140 P${bedIndex} S${firstHeater.value!.active}`).join('\n'));
                break;

            case HeaterState.standby:	// Standby -> Off
                await store.dispatch("machine/sendCode", bedIndices.map(bedIndex => `M140 P${bedIndex} S-273.15`).join('\n'));
                break;

            case HeaterState.active:	// Active -> Standby
                await store.dispatch("machine/sendCode", bedIndices.map(bedIndex => `M144 P${bedIndex}\n`).join('\n'));
                break;

            // Faults are handled before we get here
        }
    }
}

// Individual heater control
function getHeaterName(heater: Heater | null, heaterIndex: number) {
    if ((heater !== null) && (heater.sensor >= 0) && (heater.sensor < store.state.machine.model.sensors.analog.length)) {
        const sensor = store.state.machine.model.sensors.analog[heater.sensor];
        if ((sensor !== null) && sensor.name) {
            const matches = /(.*)\[(.*)\]$/.exec(sensor.name);
            if (matches) {
                return matches[1];
            }
            return sensor.name;
        }
    }
    return i18n.t("panel.tools.heater", [heaterIndex]);
}

function getHeaterValue(heater: Heater | null) {
    if ((heater !== null) && (heater.sensor >= 0) && (heater.sensor < store.state.machine.model.sensors.analog.length)) {
        const sensor = store.state.machine.model.sensors.analog[heater.sensor];
        if (sensor !== null) {
            return displaySensorValue(sensor);
        }
    }
    return i18n.t("generic.noValue");
}

async function heaterClick(heater: Heater | null, index: number) {
    if (uiFrozen.value || !heater) {
        return;
    }

    if (props.type === "bed") {
        switch (heater.state) {
            case HeaterState.off:		// Off -> Active
                await store.dispatch("machine/sendCode", `M140 P${index} S${heater.active}`);
                break;

            case HeaterState.standby:	// Standby -> Off
                await store.dispatch("machine/sendCode", `M140 P${index} S-273.15`);
                break;

            case HeaterState.active:	// Active -> Standby
                await store.dispatch("machine/sendCode", `M144 P${index}`);
                break;

            case HeaterState.fault:		// Fault -> Ask for reset
                emit("resetHeaterFault", store.state.machine.model.heat.heaters.indexOf(heater));
                break;
        }
    } else {
        switch (heater.state) {
            case HeaterState.off:		// Off -> Active
                await store.dispatch("machine/sendCode", `M141 P${index} S${heater.active}`);
                break;

            // Standby mode for chambers is not officially supported yet (there"s no code for standby control)

            case HeaterState.fault:		// Fault -> Ask for reset
                emit("resetHeaterFault", store.state.machine.model.heat.heaters.indexOf(heater));
                break;

            default:	// Active -> Off
                await store.dispatch("machine/sendCode", `M141 P${index} S-273.15`);
                break;
        }
    }
}
</script>