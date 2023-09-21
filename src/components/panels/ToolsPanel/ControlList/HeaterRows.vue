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
                            <v-list-item @click="selectHeater(-1, null, -1)">
                                <v-list-item-title>
                                    <v-icon small
                                            v-text="(props.type === 'bed') ? 'mdi-radiator' : 'mdi-heat-pump-outline'" />
                                    {{ (props.type === "bed") ? $t("panel.tools.allBeds") : $t("panel.tools.allChambers") }}
                                </v-list-item-title>
                            </v-list-item>

                            <template v-for="{ heater, heaterIndex, index } in heaterItems">
                                <v-list-item v-if="heater !== null" :key="index" @click="selectHeater(index, heater, heaterIndex)">
                                    <v-list-item-title>
                                        <v-icon class="mr-1"
                                                v-text="(props.type === 'bed') ? 'mdi-radiator' : 'mdi-heat-pump-outline'" />
                                        {{ (props.type === "bed") ? $t("panel.tools.bed", [index]) : $t("panel.tools.chamber", [index]) }}
                                    </v-list-item-title>
                                </v-list-item>
                            </template>
                        </v-list>
                    </v-menu>
                </th>

                <!-- Heater name -->
                <th v-if="selectedHeater !== null">
                    <a href="javascript:void(0)" @click="heaterClick(selectedIndex, selectedHeater)"
                       :class="getHeaterColor(selectedHeaterIndex)">
                        {{ getHeaterName(selectedHeater, selectedHeaterIndex) }}
                    </a>
                    <br>
                    <span class="font-weight-regular caption">
                        {{ $t(`generic.heaterStates.${selectedHeater.state}`) }}
                    </span>
                </th>
                <th v-else>
                    <a href="javascript:void(0)" class="font-weight-regular" @click="allHeatersClick">
                        {{ $t(`generic.heaterStates.${firstHeater.state}`) }}
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
        <template v-else v-for="{ index, heater, heaterIndex } in heaterItems">
            <!-- Individual Heater Control-->
            <template v-if="heater !== null">
                <!-- Heater -->
                <tr :key="index">
                    <!-- Heater item name -->
                    <th class="pl-2">
                        <a href="javascript:void(0)" @click="heaterClick(index, heater)">
                            <v-icon small v-text="(props.type === 'bed') ? 'mdi-radiator' : 'mdi-heat-pump-outline'" />
                            {{ (props.type === "bed") ? $t("panel.tools.bed", [(heaterItems.length === 1) ? "" : index]) : $t("panel.tools.chamber", [(heaterItems.length === 1) ? "" : index]) }}
                        </a>
                    </th>

                    <!-- Heater name -->
                    <th>
                        <a href="javascript:void(0)" @click="heaterClick(index, heater)"
                           :class="getHeaterColor(heaterIndex)">
                            {{ getHeaterName(heater, heaterIndex) }}
                        </a>
                        <br>
                        <span class="font-weight-regular caption">
                            {{ $t(`generic.heaterStates.${heater.state}`) }}
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
import { getHeaterColor } from "@/utils/colors";
import { displaySensorValue } from "@/utils/display";
import { useMachineStore } from "@/store/machine";
import { useUiStore } from "@/store/ui";
import { useSettingsStore } from "@/store/settings";
import { StoreState } from "pinia";

const props = defineProps({
    type: String as PropType<"bed" | "chamber">
});

const emit = defineEmits<{
    (e: "resetHeaterFault", heater: number): void
}>();

const machineStore = useMachineStore(), settingsStore = useSettingsStore(), uiStore = useUiStore();

// Settings
const singleControl = computed(() => (props.type === "bed") ? settingsStore.singleBedControl : settingsStore.singleChamberControl);

// Heater abstraction
const heaterItems = computed(() => {
    const heaterIndices = (props.type === "bed") ? machineStore.model.heat.bedHeaters : machineStore.model.heat.chamberHeaters;
    const heaterList: Array<{ index: number, heater: Heater, heaterIndex: number }> = [];
    for (let index = 0; index < heaterIndices.length; index++) {
        const heaterIndex = heaterIndices[index];
        if (heaterIndex >= 0 && heaterIndex < machineStore.model.heat.heaters.length) {
            const heater = machineStore.model.heat.heaters[heaterIndex] as Heater;
            if (heater !== null) {
                heaterList.push({
                    index,
                    heater,
                    heaterIndex
                });
            }
        }
    }
    return heaterList;
});
const firstHeater = computed(() => (heaterItems.value.length > 0) ? heaterItems.value[0].heater : null);

// Single heater control
const selectedIndex = ref(-1), selectedHeater = ref<Heater | null>(null), selectedHeaterIndex = ref(-1);

function selectHeater(index: number, heater: Heater | null, heaterIndex: number) {
    selectedIndex.value = index;
    selectedHeater.value = heater;
    selectedHeaterIndex.value = heaterIndex;
}

const singleHeaterCaption = computed(() => {
    if (selectedHeater.value === null) {
        return (props.type === "bed") ? i18n.global.t("panel.tools.beds") : i18n.global.t("panel.tools.chambers");
    }
    return (props.type === "bed") ? i18n.global.t("panel.tools.bed", [""]) : i18n.global.t("panel.tools.chamber", [""]);
});

async function allHeatersClick() {
    if (uiStore.uiFrozen) {
        return;
    }

    // Get valid indices
    const heaters = (props.type === "bed") ? machineStore.model.heat.bedHeaters : machineStore.model.heat.chamberHeaters;
    const indices: Array<number> = [];
    for (let index = 0; index < heaters.length; index++) {
        const heaterIndex = heaters[index];
        if (heaterIndex >= 0 && heaterIndex < machineStore.model.heat.heaters.length) {
            const bedHeater = machineStore.model.heat.heaters[heaterIndex];
            if (bedHeater !== null) {
                indices.push(index);

                // Since there is no dedicate facility for resetting heater faults, check all bed heaters here
                if (bedHeater.state === HeaterState.fault) {
                    emit("resetHeaterFault", heaterIndex);
                    return;
                }
            }
        }
    }

    // Control heaters depending on the state of the first heater
    if (firstHeater.value !== null) {
        if (props.type === "bed") {
            switch (firstHeater.value.state) {
                case HeaterState.off:		// Off -> Active
                    await machineStore.sendCode(indices.map(index => `M140 P${index} S${firstHeater.value!.active}`).join('\n'));
                    break;

                case HeaterState.standby:	// Standby -> Off
                    await machineStore.sendCode(indices.map(index => `M140 P${index} S-273.15`).join('\n'));
                    break;

                case HeaterState.active:	// Active -> Standby
                    await machineStore.sendCode(indices.map(index => `M144 P${index}\n`).join('\n'));
                    break;

                // Faults are handled before we get here
            }
        } else {
            switch (firstHeater.value.state) {
                case HeaterState.off:		// Off -> Active
                    await machineStore.sendCode(indices.map(index => `M141 P${index} S${firstHeater.value!.active}`).join('\n'));
                    break;

                // Standby mode for chambers is not officially supported yet (there is no code for standby control)

                default:	// Active -> Off
                    await machineStore.sendCode(indices.map(index => `M141 P${index} S-273.15`).join('\n'));
                    break;

                // Faults are handled before we get here
            }
        }
    }
}

// Individual heater control
function getHeaterName(heater: StoreState<Heater> | null, heaterIndex: number) {
    if ((heater !== null) && (heater.sensor >= 0) && (heater.sensor < machineStore.model.sensors.analog.length)) {
        const sensor = machineStore.model.sensors.analog[heater.sensor];
        if ((sensor !== null) && sensor.name) {
            const matches = /(.*)\[(.*)\]$/.exec(sensor.name);
            if (matches) {
                return matches[1];
            }
            return sensor.name;
        }
    }
    return i18n.global.t("panel.tools.heater", [heaterIndex]);
}

function getHeaterValue(heater: Heater | null) {
    if ((heater !== null) && (heater.sensor >= 0) && (heater.sensor < machineStore.model.sensors.analog.length)) {
        const sensor = machineStore.model.sensors.analog[heater.sensor];
        if (sensor !== null) {
            return displaySensorValue(sensor);
        }
    }
    return i18n.global.t("generic.noValue");
}

async function heaterClick(index: number, heater: StoreState<Heater> | null) {
    if (uiStore.uiFrozen || !heater) {
        return;
    }

    if (props.type === "bed") {
        switch (heater.state) {
            case HeaterState.off:		// Off -> Active
                await machineStore.sendCode(`M140 P${index} S${heater.active}`);
                break;

            case HeaterState.standby:	// Standby -> Off
                await machineStore.sendCode(`M140 P${index} S-273.15`);
                break;

            case HeaterState.active:	// Active -> Standby
                await machineStore.sendCode(`M144 P${index}`);
                break;

            case HeaterState.fault:		// Fault -> Ask for reset
                emit("resetHeaterFault", machineStore.model.heat.heaters.indexOf(heater as Heater));
                break;
        }
    } else {
        switch (heater.state) {
            case HeaterState.off:		// Off -> Active
                await machineStore.sendCode(`M141 P${index} S${heater.active}`);
                break;

            // Standby mode for chambers is not officially supported yet (there is no code for standby control)

            case HeaterState.fault:		// Fault -> Ask for reset
                emit("resetHeaterFault", machineStore.model.heat.heaters.indexOf(heater as Heater));
                break;

            default:	// Active -> Off
                await machineStore.sendCode(`M141 P${index} S-273.15`);
                break;
        }
    }
}
</script>