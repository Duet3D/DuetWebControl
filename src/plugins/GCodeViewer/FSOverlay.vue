<template>
    <div ref="overlay" class="container">
        <!--  Print Progress -->
        <div :class="viewgcode ? 'axes-container-viewgcode' : 'axes-container'">
            <v-card class="axes">
                <v-card-text>
                    <strong>Tool Position</strong>
                    <v-row no-gutters>
                        <v-col v-for="(axis, index) in visibleAxes" :key="index" class="d-flex flex-column align-center">
                            <strong>
                                {{ axis.letter }}
                            </strong>
                            <span>
                                {{ displayAxisPosition(axis, index) }}
                            </span>
                        </v-col>
                    </v-row>
                </v-card-text>
            </v-card>
        </div>
        <div :class="viewgcode ? 'heater-container-viewgcode' : 'heater-container'">
            <v-card v-show="heat.heaters.length > 0">
                <v-card-text>
                    <strong>Temperatures</strong>
                    <!-- Tools -->
                    <template v-for="tool in tools.filter(tool => !!tool)">
                        <v-row dense v-for="(heaterIdx, idx) in tool.heaters" :key="'Tool ' + tool.number * 10 + idx" align="center" justify="center">
                            <template v-if="heaterIdx >= 0">
                                <v-col cols="12" :data="(heater = getHeaterInfo(heaterIdx))">
                                    <template v-if="heater">
                                        <gcodeviewer-gauge
                                            class="gauges"
                                            :max="heater.max"
                                            :min="0"
                                            :curval="heater.current"
                                            :settemp="tool.active[0]"
                                            :label="getToolLabel(tool, tool.number)"
                                            tool-type="t"
                                            :tool-number="tool.number"
                                            :state="heater.state"
                                        ></gcodeviewer-gauge>
                                    </template>
                                </v-col>
                            </template>
                        </v-row>
                    </template>
                    <!-- Bed -->
                    <template v-for="(heaterIndices, idx) in heat.bedHeaterMapping">
                        <v-row dense v-for="(heaterIdx, subIdx) in heaterIndices" :key="'bed' + idx + '-' + subIdx" align="center" justify="center">
                            <template v-if="heaterIdx >= 0">
                                <v-col cols="12" :data="(heater = getHeaterInfo(heaterIdx))">
                                    <template v-if="heater">
                                        <gcodeviewer-gauge class="gauges" :max="120" :curval="heater.current" :settemp="heater.active" :label="getBedLabel(idx)" tool-type="b" :tool-number="idx" :state="heater.state"></gcodeviewer-gauge>
                                    </template>
                                </v-col>
                            </template>
                        </v-row>
                    </template>
                    <!--Chamber -->
                    <template v-for="(heaterIndices, idx) in heat.chamberHeaterMapping">
                        <v-row dense v-for="(heaterIdx, subIdx) in heaterIndices" :key="'chamber' + idx + '-' + subIdx" align="center" justify="center">
                            <template v-if="heaterIdx >= 0">
                                <v-col cols="12" :data="(heater = getHeaterInfo(heaterIdx))">
                                    <template v-if="heater">
                                        <gcodeviewer-gauge class="gauges" :max="120" :curval="heater.current" :settemp="heater.active" :label="getChamberLabel(idx)" tool-type="c" :tool-number="idx" :state="heater.state"></gcodeviewer-gauge>
                                    </template>
                                </v-col>
                            </template>
                        </v-row>
                    </template>
                </v-card-text>
            </v-card>
        </div>
    </div>
</template>


<style scoped>
.container {
    position: fixed;
    top:0;
    left:0;
    right:0;
    bottom:0;
    width:100%;
    height:100%;
	z-index: 50;
}

.axes-container {
	position: fixed;
	left: 50%;
}

.axes-container-viewgcode {
	position: fixed;
	right: 50% 
}

.heater-container {
	position: fixed;
	right: 0%;
	top: 20%;
	width:200px;
	text-align: center;
	font-size: large;
}

.heater-container-viewgcode {
    position: fixed;
	right: 30.5%;
	top: 20%;
	width:200px;
	text-align: center;
	font-size: large;
}

.axes {
	position: relative;
	top: 10px;
	left: -50%;
	text-align: center;
	font-size: large;
	width: 300px;
}
</style>

<script lang="ts">
import Vue from "vue";
import { Axis, GCodeFileInfo, Heat, Heater, Move, Tool } from "@duet3d/objectmodel";
import store from "@/store";

export default Vue.extend({
	data: function () {
		return {};
    },
    props: {
        viewgcode: {
            type: Boolean,
            default: false
        }
    },
    mounted() {
        // noop
     },
    beforeDestroy(){},
	computed: {
		file(): GCodeFileInfo | null { return store.state.machine.model.job.file; },
		move(): Move { return store.state.machine.model.move; },
		heat(): Heat { return store.state.machine.model.heat; },
		tools(): Array<Tool | null> { return store.state.machine.model.tools; },
		visibleAxes(): Axis[] {
			return this.move.axes.filter((axis: Axis) => axis.visible);
		},
	},
	methods: {
		displayAxisPosition(axis: Axis): string {
			const position = axis.userPosition;
			return axis.letter === 'Z' ? this.$displayZ(position, false) : this.$display(position, 1);
		},
		getHeaterInfo(heaterIdx: number): Heater | null {
			return this.heat.heaters[heaterIdx];
		},
		getToolLabel(tool: Tool, toolIdx: number): string {
			if (toolIdx === undefined) return '';
			return tool.name === '' ? 'Tool ' + toolIdx : tool.name;
		},
		getBedLabel(bedIdx: number): string {
			return this.heat.bedHeaterMapping.length <= 2 ? 'Bed' : 'Bed ' + bedIdx;
		},
		getChamberLabel(chamberIdx: number): string {
			return this.heat.chamberHeaterMapping.length <= 2 ? 'Chamber' : 'Chamber ' + chamberIdx;
        },
    },
});
</script>

