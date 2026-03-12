<style scoped>
.disabled {
    color: inherit;
    cursor: default;
}

.disabled-heater {
    cursor: default;
}

.disabled:hover,
.disabled-heater {
    text-decoration: none;
}
</style>

<template>
    <tbody>
        <template v-if="singleControl && firstHeater !== null">
            <!-- Single Heater Control-->
            <tr>
                <!-- Heater item name -->
                <th class="pl-2">
                    <v-menu bottom offset-y :disabled="disabled">
                        <template #activator="{ on, attrs }">
                            <a href="javascript:void(0)" v-bind="attrs" :classes="{ disabled: disabled }" v-on="on">
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
                                <v-list-item v-if="heater !== null" :key="index"
                                             @click="selectHeater(index, heater, heaterIndex)">
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
                    <a href="javascript:void(0)" :class="getHeaterClasses(selectedHeaterIndex)" @click="heaterClick(selectedIndex, selectedHeater)">
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
                    <control-input type="all"
                                   :control-beds="type === 'bed' && store.state.machine.settings.singleBedControl"
                                   :control-chambers="type == 'chamber' && store.state.machine.settings.singleChamberControl"
                                   active />
                </td>

                <!-- Heater standby -->
                <td class="pl-1 pr-2">
                    <control-input type="all"
                                   :control-beds="type === 'bed' && store.state.machine.settings.singleBedControl"
                                   :control-chambers="type == 'chamber' && store.state.machine.settings.singleChamberControl"
                                   standby />
                </td>
            </tr>
        </template>
        <template v-else-if="heaterItems.some(item => item.heater !== null)">
            <template v-for="{ index, heater, heaterIndex } in heaterItems">
                <!-- Individual Heater Control-->
                <template v-if="heater !== null">
                    <!-- Heater -->
                    <tr :key="index">
                        <!-- Heater item name -->
                        <th class="pl-2">
                            <a href="javascript:void(0)" :class="{ disabled: disabled }" @click="heaterClick(index, heater)">
                                <v-icon small v-text="(props.type === 'bed') ? 'mdi-radiator' : 'mdi-heat-pump-outline'" />
                                {{ (props.type === "bed") ? $t("panel.tools.bed", [(heaterItems.length === 1) ? "" : index]) : $t("panel.tools.chamber", [(heaterItems.length === 1) ? "" : index]) }}
                            </a>
                        </th>

                        <!-- Heater name -->
                        <th>
                            <a href="javascript:void(0)" :class="getHeaterClasses(heaterIndex)" @click="heaterClick(index, heater)">
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
        </template>
    </tbody>
</template>

<script setup lang="ts">
import { Heater, HeaterState, MachineStatus } from "@duet3d/objectmodel";
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

const disabled = computed<boolean>(() => store.getters["uiFrozen"] || [MachineStatus.pausing, MachineStatus.processing, MachineStatus.resuming].includes(store.state.machine.model.state.status));

// Settings
const singleControl = computed(() => {
    if (props.type === "bed" && store.state.machine.settings.singleBedControl) {
        let state: HeaterState | null, active: number | null = null, standby: number | null = null;
        for (const heaterIndices of store.state.machine.model.heat.bedHeaterMapping) {
            for (const heaterIndex of heaterIndices) {
                if (heaterIndex >= 0 && heaterIndex < store.state.machine.model.heat.heaters.length) {
                    const heater = store.state.machine.model.heat.heaters[heaterIndex];
                    if (heater !== null) {
                        state ??= heater.state;
                        active ??= heater.active;
                        standby ??= heater.standby;
                        if (heater.state === state || heater.active !== active || heater.standby !== standby) {
                            return false;
                        }
                    }
                }
            }
        }
        return true;
    } else if (props.type === "chamber" && store.state.machine.settings.singleChamberControl) {
        let state: HeaterState | null, active: number | null = null, standby: number | null = null;
        for (const heaterIndices of store.state.machine.model.heat.chamberHeaterMapping) {
            for (const heaterIndex of heaterIndices) {
                if (heaterIndex >= 0 && heaterIndex < store.state.machine.model.heat.heaters.length) {
                    const heater = store.state.machine.model.heat.heaters[heaterIndex];
                    if (heater !== null) {
                        state ??= heater.state;
                        active ??= heater.active;
                        standby ??= heater.standby;
                        if (heater.state === state || heater.active !== active || heater.standby !== standby) {
                            return false;
                        }
                    }
                }
            }
        }
        return true;
    }
    return false;
});

// Heater abstraction
const heaterItems = computed(() => {
    const mapping = (props.type === "bed") ? store.state.machine.model.heat.bedHeaterMapping : store.state.machine.model.heat.chamberHeaterMapping;
    const heaterList: Array<{ index: number, heater: Heater, heaterIndex: number }> = [];
    for (let index = 0; index < mapping.length; index++) {
        for (const heaterIndex of mapping[index]) {
            if (heaterIndex >= 0 && heaterIndex < store.state.machine.model.heat.heaters.length) {
                const heater = store.state.machine.model.heat.heaters[heaterIndex];
                if (heater !== null) {
                    heaterList.push({
                        index,
                        heater,
                        heaterIndex
                    });
                }
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
    if (selectedHeater === null) {
        return (props.type === "bed") ? i18n.t("panel.tools.beds") : i18n.t("panel.tools.chambers");
    }
    return (props.type === "bed") ? i18n.t("panel.tools.bed", [""]) : i18n.t("panel.tools.chamber", [""]);
});

async function allHeatersClick() {
    if (disabled.value) {
        return;
    }

    // Get valid indices
    const mapping = (props.type === "bed") ? store.state.machine.model.heat.bedHeaterMapping : store.state.machine.model.heat.chamberHeaterMapping;
    const indices: Array<number> = [];
    for (let index = 0; index < mapping.length; index++) {
        for (const heaterIndex of mapping[index]) {
            if (heaterIndex >= 0 && heaterIndex < store.state.machine.model.heat.heaters.length) {
                const heater = store.state.machine.model.heat.heaters[heaterIndex];
                if (heater !== null) {
                    if (!indices.includes(index)) {
                        indices.push(index);
                    }

                    // Since there is no dedicated facility for resetting heater faults, check all heaters here
                    if (heater.state === HeaterState.fault) {
                        emit("resetHeaterFault", heaterIndex);
                        return;
                    }
                }
            }
        }
    }

    // Control heaters depending on the state of the first heater
    if (firstHeater.value !== null) {
        if (props.type === "bed") {
            switch (firstHeater.value.state) {
                case HeaterState.off:		// Off -> Active
                    await store.dispatch("machine/sendCode", indices.map(index => `M140 P${index} S${firstHeater.value!.active}`).join('\n'));
                    break;

                case HeaterState.standby:	// Standby -> Off
                    await store.dispatch("machine/sendCode", indices.map(index => `M140 P${index} S-273.15`).join('\n'));
                    break;

                case HeaterState.active:	// Active -> Standby
                    await store.dispatch("machine/sendCode", indices.map(index => `M144 P${index}\n`).join('\n'));
                    break;

                // Faults are handled before we get here
            }
        } else {
            switch (firstHeater.value.state) {
                case HeaterState.off:		// Off -> Active
                    await store.dispatch("machine/sendCode", indices.map(index => `M141 P${index} S${firstHeater.value!.active}`).join('\n'));
                    break;

                // Standby mode for chambers is not officially supported yet (there is no code for standby control)

                default:	// Active -> Off
                    await store.dispatch("machine/sendCode", indices.map(index => `M141 P${index} S-273.15`).join('\n'));
                    break;

                // Faults are handled before we get here
            }
        }
    }
}

// Individual heater control
function getHeaterClasses(heater: number) {
    const classes = [getHeaterColor(heater)];
    if (disabled.value) {
        classes.push("disabled-heater");
    }
    return classes;
}

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

async function heaterClick(index: number, heater: Heater | null) {
    if (disabled.value || !heater) {
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

            // Standby mode for chambers is not officially supported yet (there is no code for standby control)

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