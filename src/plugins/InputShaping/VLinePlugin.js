// Original code from https://stackoverflow.com/questions/30256695/chart-js-drawing-an-arbitrary-vertical-line
'use strict'

import Chart from 'chart.js'

const VLinePlugin = {
	id: 'vline',
    getLinePosition(chart, pointIndex) {
		if (chart.data.datasets.length === 0) {
			return null;
		}
        const meta = chart.getDatasetMeta(0); // first dataset is used to discover X coordinate of a point
        const data = meta.data;
        return data ? data[pointIndex]._model.x : null;
    },
    renderVerticalLine(chartInstance, pointIndex) {
        const lineLeftOffset = this.getLinePosition(chartInstance, pointIndex);
		if (lineLeftOffset === null) {
			return;
		}

        const scale = chartInstance.scales['y-axis-0'];
        const context = chartInstance.chart.ctx;

        // render vertical line
        context.beginPath();
		context.lineWidth = (chartInstance.options.plugins.vline && chartInstance.options.plugins.vline.lineWidth) || 1;
        context.strokeStyle = (chartInstance.options.plugins.vline && chartInstance.options.plugins.vline.lineColor) || '#ff0000';
        context.moveTo(lineLeftOffset, scale.top);
        context.lineTo(lineLeftOffset, scale.bottom);
        context.stroke();
    },
    beforeDatasetsDraw(chart) {
        if (chart.config.lineAtIndex) {
            chart.config.lineAtIndex.forEach(pointIndex => this.renderVerticalLine(chart, pointIndex));
        }
    }
};

Chart.plugins.register(VLinePlugin);