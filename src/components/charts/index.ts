import "chartjs-adapter-date-fns";
import { App } from "vue";

import LayerChart from "./LayerChart.vue";
import TemperatureChart from "./TemperatureChart.vue";

export function registerCharts(app: App<any>) {
    app
        .component("layer-chart", LayerChart)
        .component("temperature-chart", TemperatureChart);
}
