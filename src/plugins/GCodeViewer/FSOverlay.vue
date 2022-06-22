<template>
    <div class="container">
        <!--  Print Progress -->
        <div class="axes-container">
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
        <div class="heater-container">
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
                    <v-row dense v-for="(heaterIdx, idx) in heat.bedHeaters" :key="'heater' + idx" align="center" justify="center">
                        <template v-if="heaterIdx >= 0">
                            <v-col cols="12" :data="(heater = getHeaterInfo(heaterIdx))">
                                <template v-if="heater">
                                    <gcodeviewer-gauge class="gauges" :max="120" :curval="heater.current" :settemp="heater.active" :label="getBedLabel(idx)" tool-type="b" :tool-number="idx" :state="heater.state"></gcodeviewer-gauge>
                                </template>
                            </v-col>
                        </template>
                    </v-row>
                    <!--Chamber -->
                    <v-row dense v-for="(heaterIdx, idx) in heat.chamberHeaters" :key="idx" align="center" justify="center">
                        <template v-if="heaterIdx >= 0">
                            <v-col cols="12" :data="(heater = getHeaterInfo(heaterIdx))">
                                <template v-if="heater">
                                    <gcodeviewer-gauge class="gauges" :max="120" :curval="heater.current" :settemp="heater.active" :label="getChamberLabel(idx)" tool-type="c" :tool-number="idx" :state="heater.state"></gcodeviewer-gauge>
                                </template>
                            </v-col>
                        </template>
                    </v-row>
                </v-card-text>
            </v-card>
        </div>
    </div>
</template>


<style scoped>
.container {
	z-index: 50;
}

.axes-container {
	position: absolute;
	left: 50%;
}

.heater-container {
	position: absolute;
	right: 20px;
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

<script>
import { mapState } from 'vuex';
//import { isPrinting } from '../../store/machine/modelEnums.js';

('use strict');
export default {
	data: function () {
		return {};
	},
	computed: {
		...mapState('machine/model', ['file', 'move', 'heat', 'tools']),
		visibleAxes() {
			return this.move.axes.filter(axis => axis.visible);
		},
	},
	methods: {
		displayAxisPosition(axis) {
			const position = axis.userPosition;
			return axis.letter === 'Z' ? this.$displayZ(position, false) : this.$display(position, 1);
		},
		getHeaterInfo(heaterIdx) {
			return this.heat.heaters[heaterIdx];
		},
		getToolLabel(tool, toolIdx) {
			if (toolIdx === undefined) return '';
			return tool.name === '' ? 'Tool ' + toolIdx : tool.name;
		},
		getBedLabel(bedIdx) {
			return this.heat.bedHeaters.length <= 2 ? 'Bed' : 'Bed ' + bedIdx;
		},
		getChamberLabel(chamberIdx) {
			return this.heat.chamberHeaters.length <= 2 ? 'Chamber' : 'Chamber ' + chamberIdx;
		},
	},
};
</script>

