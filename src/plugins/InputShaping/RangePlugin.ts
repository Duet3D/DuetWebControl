// based on the VerticalLinePlugin
import { Chart, ChartConfiguration, Scale } from 'chart.js';

interface RangeConfig {
	start: number;
	end?: number;
}

declare module 'chart.js' {
	interface PluginOptionsByType<TType extends import('chart.js').ChartType> {
		range?: {
			color?: string;
		};
	}
	interface ChartConfiguration {
		range?: RangeConfig;
	}
}

const verticalLinePlugin = {
	id: 'range',
	renderRect(chartInstance: Chart, startX: number, endX: number) {
		const scale = chartInstance.scales['y'] as Scale;
		const context = chartInstance.ctx;

		// render vertical line
		context.beginPath();
		context.rect(startX, scale.top, endX - startX, scale.bottom - scale.top);
		context.fillStyle = (chartInstance.options.plugins?.range && chartInstance.options.plugins.range.color) || '#0000FF30';
		context.fill();
	},
	beforeDatasetsDraw(chart: Chart) {
		const config = chart.config as ChartConfiguration;
		if (config.range && config.range.end !== undefined) {
			this.renderRect!(chart, Math.min(config.range.start, config.range.end), Math.max(config.range.start, config.range.end));
		}
	}
};

Chart.register(verticalLinePlugin);
