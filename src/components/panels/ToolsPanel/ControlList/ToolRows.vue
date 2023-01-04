<template>
    <fragment>
        <template v-for="(tool, toolIndex) in toolsToDisplay">
            <!-- Tool -->
            <tr v-for="(toolHeater, toolHeaterIndex) in getToolHeaters(tool)"
                :key="`tool-${tool.number}-${toolHeaterIndex}`"
                :class="(tool.number === currentTool) ? selectedToolClass : ''">
                <!-- Tool Name -->
                <th v-if="toolHeaterIndex === 0" :rowspan="Math.max(1, tool.heaters.length)" class="pl-2"
                    :class="{ 'pt-2 pb-2': !tool.heaters.length && !toolHeater }">

                    <!-- Tool Name or Dropdown -->
                    <a v-if="!isToolCollapsed(tool)" href="javascript:void(0)" @click="toolClick(tool)">
                        <v-progress-circular v-if="tool === busyTool" indeterminate color="primary" :size="14" />
                        <v-icon v-if="getToolIcon(tool)" small v-text="getToolIcon(tool)" />
                        {{ tool.name || $t("panel.tools.tool", [tool.number]) }}
                    </a>
                    <v-menu v-else offset-y auto>
                        <template #activator="{ on }">
                            <a v-on="on" href="javascript:void(0)">
                                <v-progress-circular v-if="isCollapsedToolBusy(tool)" indeterminate color="primary"
                                                     :size="14" />
                                <v-icon v-if="getToolIcon(tool)" small v-text="getToolIcon(tool)" />
                                {{ tool.name || $t("panel.tools.tool", [tool.number]) }}
                                <v-icon small>mdi-menu-down</v-icon>
                            </a>
                        </template>

                        <v-list>
                            <v-list-item v-for="otherTool in getCollapsedTools(tool)" @click="toolClick(otherTool)"
                                         :key="otherTool.number">
                                <v-icon v-if="getToolIcon(tool)" class="mr-1" v-text="getToolIcon(tool)" />
                                {{ `${otherTool.name} (T${otherTool.number})` || $t("panel.tools.tool", [otherTool.number]) }}
                            </v-list-item>
                        </v-list>
                    </v-menu>

                    <br>
                    <span class="font-weight-regular caption">
                        T{{ tool.number }}

                        <template v-if="canLoadFilament(tool)">
                            -
                            <v-menu v-if="getFilament(tool)" offset-y auto>
                                <template #activator="{ on }">
                                    <a v-on="on" href="javascript:void(0)" class="font-weight-regular">
                                        {{ getFilament(tool) }}
                                    </a>
                                </template>

                                <v-list>
                                    <v-list-item @click="changeFilament(tool)">
                                        <v-icon class="mr-1">mdi-swap-vertical</v-icon>
                                        {{ $t("panel.tools.changeFilament") }}
                                    </v-list-item>
                                    <v-list-item @click="unloadFilament(tool)">
                                        <v-icon class="mr-1">mdi-arrow-up</v-icon>
                                        {{ $t("panel.tools.unloadFilament") }}
                                    </v-list-item>
                                </v-list>
                            </v-menu>
                            <a v-else href="javascript:void(0)" @click="showFilamentDialog(tool)">
                                {{ $t("panel.tools.loadFilament") }}
                            </a>
                        </template>
                    </span>
                </th>

                <template v-if="!toolHeater && getSpindle(tool)">
                    <!-- Spindle Name -->
                    <td>
                        <template v-if="tool.number === currentTool">
                            <v-row dense>
                                <v-col>
                                    <code-btn code="M4" no-wait small>
                                        <v-icon>mdi-rotate-left</v-icon>
                                    </code-btn>
                                    <code-btn code="M3" no-wait small>
                                        <v-icon>mdi-rotate-right</v-icon>
                                    </code-btn>
                                </v-col>
                            </v-row>
                            <v-row dense>
                                <v-col>
                                    <code-btn code="M5" no-wait small>
                                        <v-icon>mdi-stop</v-icon>
                                    </code-btn>
                                </v-col>
                            </v-row>
                        </template>
                    </td>

                    <!-- Current RPM -->
                    <td class="text-center">
                        {{ $display(getSpindleSpeed(tool), 0, $t("generic.rpm")) }}
                    </td>

                    <!-- Active RPM -->
                    <td>
                        <control-input type="spindle" :index="tool.number" active />
                    </td>

                    <!-- Standby RPM -->
                    <td>
                        <!-- unused -->
                    </td>
                </template>
                <template v-else>
                    <!-- Heater Name -->
                    <th>
                        <template v-if="toolHeater">
                            <a href="javascript:void(0)" @click="toolHeaterClick(tool, toolHeater)"
                               :class="getHeaterColor(tool.heaters[toolHeaterIndex])">
                                {{ getHeaterName(toolHeater, tool.heaters[toolHeaterIndex]) }}
                            </a>
                            <template v-if="toolHeater.state !== null">
                                <br>
                                <span class="font-weight-regular caption">
                                    {{ $t(`generic.heaterStates.${toolHeater.state }`) }}
                                </span>
                            </template>
                        </template>
                        <span v-else>
                            {{ $t("generic.noValue") }}
                        </span>
                    </th>

                    <!-- Heater value -->
                    <td>
                        {{ getHeaterValue(toolHeater) }}
                    </td>

                    <!-- Heater active -->
                    <td class="pl-2 pr-1">
                        <control-input :disabled="isToolBusy(tool)" type="tool" :index="tool.number" :tool-heater-index="toolHeaterIndex" active />
                    </td>

                    <!-- Heater standby -->
                    <td class="pl-1 pr-2">
                        <control-input :disabled="isToolBusy(tool)" type="tool" :index="tool.number" :tool-heater-index="toolHeaterIndex" standby />
                    </td>
                </template>

                <filament-dialog v-if="toolIndex === 0" :shown.sync="filamentDialogShown" :tool="filamentDialogTool" />
            </tr>

            <!-- Divider -->
            <tr v-if="toolIndex < toolsToDisplay.length - 1" :key="`div - tool - ${ toolIndex } `">
                <td colspan="5">
                    <v-divider />
                </td>
            </tr>
        </template>
    </fragment>
</template>

<script setup lang="ts">
import { Heater, HeaterState, SpindleState, Tool } from "@duet3d/objectmodel";
import { computed, ref } from "vue";

import i18n from "@/i18n";
import store from "@/store";
import { getHeaterColor } from "@/utils/colors";
import { DisconnectedError, getErrorMessage } from "@/utils/errors";
import { log, LogType } from "@/utils/logging";
import { displaySensorValue } from "@/utils/display";

const emit = defineEmits<{
    (e: "resetHeaterFault", heater: number): void
}>();

const uiFrozen = computed<boolean>(() => store.getters["uiFrozen"]);

// Tool display
const toolsToDisplay = computed<Array<Tool>>(() => {
    if (!store.state.machine.settings.groupTools) {
        return store.state.machine.model.tools.filter(tool => tool !== null) as Array<Tool>;
    }

    const tools: Array<Tool> = [];
    for (const item of store.state.machine.model.tools) {
        if (item !== null) {
            let equalToolFound = false;

            for (let i = 0; i < tools.length; i++) {
                const tool = tools[i];
                if ((item.extruders.length === tool.extruders.length && item.extruders.every((extruder, index) => extruder === tool.extruders[index])) &&
                    (item.heaters.length === tool.heaters.length && item.heaters.every((heater, index) => heater === tool.heaters[index])) &&
                    (item.offsets.length === tool.offsets.length && item.offsets.every((offset, index) => offset === tool.offsets[index])) &&
                    item.spindle === tool.spindle)
                {
                    // Tool is identical
                    equalToolFound = true;
                    if (item.number === store.state.machine.model.state.currentTool) {
                        // If another tool is selected, prefer the displayed tool
                        tools[i] = item;
                    }
                }
            }

            if (!equalToolFound) {
                tools.push(item);
            }
        }
    }
    return tools;
});

const currentTool = computed(() => store.state.machine.model.state.currentTool), busyTool = ref<Tool | null>(null);
const selectedToolClass = computed(() => store.state.settings.darkTheme ? "grey darken-3" : "blue lighten-5");

function isToolCollapsed(tool: Tool) {
    if (toolsToDisplay.value.length < store.state.machine.model.tools.length) {
        for (const item of store.state.machine.model.tools) {
            if (item !== null && item !== tool) {
                if ((item.extruders.length === tool.extruders.length && item.extruders.every((extruder, index) => extruder === tool.extruders[index])) &&
                    (item.heaters.length === tool.heaters.length && item.heaters.every((heater, index) => heater === tool.heaters[index])) &&
                    (item.offsets.length === tool.offsets.length && item.offsets.every((offset, index) => offset === tool.offsets[index])) &&
                    item.spindle === tool.spindle)
                {
                    return true;
                }
            }
        }
    }
    return false;
}

function getCollapsedTools(tool: Tool) {
    const tools: Array<Tool> = [];
    for (const item of store.state.machine.model.tools) {
        if (item !== null &&
            (item.extruders.length === tool.extruders.length && item.extruders.every((extruder, index) => extruder === tool.extruders[index])) &&
            (item.heaters.length === tool.heaters.length && item.heaters.every((heater, index) => heater === tool.heaters[index])) &&
            (item.offsets.length === tool.offsets.length && item.offsets.every((offset, index) => offset === tool.offsets[index])) &&
            item.spindle === tool.spindle)
        {
            // Tool is identical
            tools.push(item);
        }
    }
    return tools;
}

function isCollapsedToolBusy(tool: Tool) {
    return getCollapsedTools(tool).includes(busyTool.value as Tool);
}

function isToolBusy(tool: Tool) {
    return isToolCollapsed(tool) ? isCollapsedToolBusy(tool) : (busyTool.value === tool);
}

function getToolIcon(tool: Tool) {
    if (tool !== null) {
        if (tool.extruders.length > 0) {
            return "mdi-printer-3d-nozzle";
        }
        if (tool.spindle >= 0) {
            return "mdi-saw-blade";
        }
        if (tool.name.toLowerCase().includes("laser")) {
            // TODO the object model does not report if a laser is mapped to a tool
            return "mdi-star-four-points-circle-outline";
        }
    }
    return null;
}

// Tool caption
const toolChangeParameter = computed<string>(() => store.getters["machine/settings/toolChangeParameter"]);

async function toolClick(tool: Tool) {
    if (uiFrozen.value || busyTool.value !== null) {
        return;
    }

    busyTool.value = tool;
    try {
        if (store.state.machine.model.state.currentTool === tool.number) {
            // Deselect current tool
            await store.dispatch("machine/sendCode", "T-1" + toolChangeParameter.value);
        } else {
            // Select new tool
            await store.dispatch("machine/sendCode", `T${tool.number}${toolChangeParameter.value}`);
        }
    } catch (e) {
        if (!(e instanceof DisconnectedError)) {
            log(LogType.error, getErrorMessage(e));
        }
    }
    busyTool.value = null;
}

// Filament management
const loadingFilament = ref(false), filamentDialogShown = ref(false), filamentDialogTool = ref<Tool | null>(null);

function getFilament(tool: Tool) {
    if ((tool.filamentExtruder >= 0) && (tool.filamentExtruder < store.state.machine.model.move.extruders.length)) {
        return store.state.machine.model.move.extruders[tool.filamentExtruder].filament;
    }
    return null;
}

function canLoadFilament(tool: Tool) {
    return !uiFrozen.value && (tool.filamentExtruder >= 0) && (tool.filamentExtruder < store.state.machine.model.move.extruders.length);
}

async function showFilamentDialog(tool: Tool) {
    if (busyTool.value !== null) {
        return;
    }

    filamentDialogTool.value = tool;
    filamentDialogShown.value = true;
}

async function changeFilament(tool: Tool) {
    await unloadFilament(tool);
    await showFilamentDialog(tool);
}

async function unloadFilament(tool: Tool) {
    if (busyTool.value !== null) {
        return;
    }

    busyTool.value = tool;
    try {
        let code = "";
        if (currentTool.value !== tool.number) {
            code = `T${tool.number}\n`;
        }
        code += "M702";
        await store.dispatch("machine/sendCode", code);
    } finally {
        busyTool.value = null;
    }
}

// Tool heaters
function getToolHeaters(tool: Tool) {
    const heaters = store.state.machine.model.heat.heaters;
    const toolHeaters = tool.heaters
        .filter(heaterIndex => (heaterIndex >= 0) && (heaterIndex < heaters.length) && (heaters[heaterIndex] !== null))
        .map(heaterIndex => heaters[heaterIndex]);
    return (toolHeaters.length > 0) ? toolHeaters : [null];
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

async function toolHeaterClick(tool: Tool, heater: Heater) {
    if (uiFrozen.value || isToolBusy(tool)) {
        return;
    }

    switch (heater.state) {
        case HeaterState.off:		// Off -> Active
            await store.dispatch("machine/sendCode", `M568 P${tool.number} A2`);
            break;

        case HeaterState.standby:	// Standby -> Off
            await store.dispatch("machine/sendCode", `M568 P${tool.number} A0`);
            break;

        case HeaterState.active:	// Active -> Standby
            await store.dispatch("machine/sendCode", `M568 P${tool.number} A1`);
            break;

        case HeaterState.fault:		// Fault -> Ask for reset
            emit("resetHeaterFault", store.state.machine.model.heat.heaters.indexOf(heater));
            break;
    }
}

// Spindles
function getSpindle(tool: Tool) {
    return (tool.spindle >= 0) && (tool.spindle < store.state.machine.model.spindles.length) ? store.state.machine.model.spindles[tool.spindle] : null;
}

function getSpindleSpeed(tool: Tool) {
    const spindle = getSpindle(tool);
    return spindle ? ((spindle.state === SpindleState.reverse) ? -spindle.current : spindle.current) : 0;
}
</script>