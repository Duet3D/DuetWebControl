import "chartjs-adapter-date-fns";
import Vue from "vue";

import LayerChart from "./LayerChart.vue";
import TemperatureChart from "./TemperatureChart.vue";

Vue.component("layer-chart", LayerChart);
Vue.component("temperature-chart", TemperatureChart);

