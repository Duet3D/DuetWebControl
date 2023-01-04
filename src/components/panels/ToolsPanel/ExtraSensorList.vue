<style scoped>
table {
	width: 100%;
	border-spacing: 0;
}

table td,
table th {
	text-align: center;
	width: 25%;
}

table tr > th:first-child,
table tr > td:first-child {
	width: 50%;
}
</style>

<template>
    <table v-if="extraSensors.length > 0" class="ml-2 mr-2">
        <thead>
            <tr>
                <th class="hidden-sm-and-down"></th>
                <th>
                    {{ $t("panel.tools.extra.sensor") }}
                </th>
                <th>
                    {{ $t("panel.tools.extra.value") }}
                </th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="extraSensor in extraSensors" :key="`extra-${extraSensor.index}`">
                <td class="hidden-sm-and-down">
                    <v-switch class="ml-3" :input-value="displayedExtraTemperatures.indexOf(extraSensor.index) !== -1"
                              @change="toggleExtraVisibility(extraSensor.index)"
                              :label="$t('panel.tools.extra.showInChart')" :disabled="uiFrozen" />
                </td>
                <th class="py-2" :class="getExtraColor(extraSensor.index)">
                    {{ formatExtraName(extraSensor) }}
                </th>
                <td class="py-2">
                    {{ displaySensorValue(extraSensor.sensor) }}
                </td>
            </tr>
        </tbody>
    </table>
    <v-alert v-else :value="true" type="info">
        {{ $t("panel.tools.extra.noItems") }}
    </v-alert>
</template>

<script setup lang="ts">
import { AnalogSensor, AnalogSensorType } from "@duet3d/objectmodel";
import { computed } from "vue";

import i18n from "@/i18n";
import store from "@/store";
import { getExtraColor } from "@/utils/colors";
import { displaySensorValue } from "@/utils/display";

interface ExtraSensor {
    sensor: AnalogSensor;
    index: number;
}

const extraSensors = computed<Array<ExtraSensor>>(() => {
    const heaters = store.state.machine.model.heat.heaters;
    return store.state.machine.model.sensors.analog
        .map((sensor, index) => ({
            sensor,
            index
        }))
        .filter(({ sensor, index }) => (sensor !== null) && !heaters.some(heater => (heater !== null) && (heater.sensor === index))) as Array<ExtraSensor>;
});

const displayedExtraTemperatures = computed(() => store.state.machine.settings.displayedExtraTemperatures);

function toggleExtraVisibility(sensor: number) {
    store.commit("machine/settings/toggleExtraVisibility", sensor);
}

const uiFrozen = computed<boolean>(() => store.getters["uiFrozen"]);

function formatExtraName(sensor: { sensor: AnalogSensor, index: number }) {
    if (sensor.sensor.name) {
        const matches = /(.*)\[(.*)\]$/.exec(sensor.sensor.name);
        if (matches) {
            return matches[1];
        }
        return sensor.sensor.name;
    }
    return i18n.t("panel.tools.extra.sensorIndex", [sensor.index]);
}
</script>