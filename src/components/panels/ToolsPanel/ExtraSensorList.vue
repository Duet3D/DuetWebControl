<style scoped>
table {
	width: 100%;
	border-spacing: 0;
}

table td,
table th {
	text-align: center;
}
</style>

<template>
    <table v-if="extraSensors.length > 0" class="ml-2 mr-2">
        <colgroup>
            <col style="width: 50%;">
            <col style="width: 25%;">
            <col style="width: 25%;">
        </colgroup>
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
                    <v-switch class="ml-3" :input-value="settingsStore.displayedExtraTemperatures.indexOf(extraSensor.index) !== -1"
                              @change="settingsStore.toggleExtraVisibility(extraSensor.index)"
                              :label="$t('panel.tools.extra.showInChart')" :disabled="uiStore.uiFrozen" />
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
import { useMachineStore } from "@/store/machine";
import { useSettingsStore } from "@/store/settings";
import { useUiStore } from "@/store/ui";
import { getExtraColor } from "@/utils/colors";
import { displaySensorValue } from "@/utils/display";

const machineStore = useMachineStore(), settingsStore = useSettingsStore(), uiStore = useUiStore();

interface ExtraSensor {
    sensor: AnalogSensor;
    index: number;
}

const extraSensors = computed<Array<ExtraSensor>>(() => {
    const heaters = machineStore.model.heat.heaters;
    return machineStore.model.sensors.analog
        .map((sensor, index) => ({
            sensor,
            index
        }))
        .filter(({ sensor, index }) => (sensor !== null) && !heaters.some(heater => (heater !== null) && (heater.sensor === index))) as Array<ExtraSensor>;
});

function formatExtraName(sensor: { sensor: AnalogSensor, index: number }) {
    if (sensor.sensor.name) {
        const matches = /(.*)\[(.*)\]$/.exec(sensor.sensor.name);
        if (matches) {
            return matches[1];
        }
        return sensor.sensor.name;
    }
    return i18n.global.t("panel.tools.extra.sensorIndex", [sensor.index]);
}
</script>