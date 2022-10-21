import Vue from "vue";
import "chartjs-adapter-date-fns";

import LayerChart from "./LayerChart.vue";
import TemperatureChart from "./TemperatureChart.vue";

Vue.component("layer-chart", LayerChart);
Vue.component("temperature-chart", TemperatureChart);

