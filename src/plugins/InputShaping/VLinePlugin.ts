// Original code from https://stackoverflow.com/questions/30256695/chart-js-drawing-an-arbitrary-vertical-line
import { Chart, ChartConfiguration, Scale } from 'chart.js';

declare module 'chart.js' {
	interface PluginOptionsByType<TType extends import('chart.js').ChartType> {
		vline?: {
			lineColor?: string;
			lineWidth?: number;
		};
	}
	interface ChartConfiguration {
		lineAtIndex?: number[];
	}
}

const VLinePlugin = {
	id: 'vline',
	getLinePosition(chart: Chart, pointIndex: number): number | null {
		if (chart.data.datasets.length === 0) {
			return null;
		}
		const meta = chart.getDatasetMeta(0); // first dataset is used to discover X coordinate of a point
		const data = meta.data;
		return data ? data[pointIndex].x : null;
	},
	renderVerticalLine(chartInstance: Chart, pointIndex: number) {
		const lineLeftOffset = this.getLinePosition!(chartInstance, pointIndex);
		if (lineLeftOffset === null) {
			return;
		}

		const scale = chartInstance.scales['y'] as Scale;
		const context = chartInstance.ctx;

		// render vertical line
		context.beginPath();
		context.lineWidth = (chartInstance.options.plugins?.vline && chartInstance.options.plugins.vline.lineWidth) || 1;
		context.strokeStyle = (chartInstance.options.plugins?.vline && chartInstance.options.plugins.vline.lineColor) || '#ff0000';
		context.moveTo(lineLeftOffset, scale.top);
		context.lineTo(lineLeftOffset, scale.bottom);
		context.stroke();
	},
	beforeDatasetsDraw(chart: Chart) {
		const config = chart.config as ChartConfiguration;
		if (config.lineAtIndex) {
			config.lineAtIndex.forEach(pointIndex => this.renderVerticalLine!(chart, pointIndex));
		}
	}
};

Chart.register(VLinePlugin);
