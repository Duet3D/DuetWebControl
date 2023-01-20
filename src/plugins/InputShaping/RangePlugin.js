// based on the VerticalLinePlugin
'use strict'

import Chart from 'chart.js';

const verticalLinePlugin = {
	renderRect(chartInstance, startX, endX) {
		const scale = chartInstance.scales['y-axis-0'];
		const context = chartInstance.chart.ctx;

		// render vertical line
		context.beginPath();
		context.rect(startX, scale.top, endX - startX, scale.bottom - scale.top);
		context.fillStyle = (chartInstance.options.plugins.range && chartInstance.options.plugins.range.color) || '#0000FF30';
		context.fill();
	},
	beforeDatasetsDraw(chart) {
		if (chart.config.range) {
			this.renderRect(chart, Math.min(chart.config.range.start, chart.config.range.end), Math.max(chart.config.range.start, chart.config.range.end));
		}
	}
};

Chart.plugins.register(verticalLinePlugin);