<style scoped>
.card, .content {
	width: 100%;
	height: 100% !important;
}

.content {
	flex: 1;
}
</style>

<template>
	<v-card no-body class="card">
		<v-layout column class="content">
			<v-card-title class="base-panel-title pb-0">
				<v-icon>show_chart</v-icon> {{ $t('panel.tempChart.caption') }}
			</v-card-title>

			<v-card-text class="content pt-0 pl-2 pr-2 pb-0">
				<canvas ref="chart"></canvas>
			</v-card-text>
		</v-layout>
	</v-card>
</template>

<script>
'use strict'

import Chart from 'chart.js'

let datasets = [
	{
		label: "T0",
		backgroundColor: "rgba(255,99,132,0.2)",
		borderColor: "rgba(255,99,132,1)",
		borderWidth: 2,
		hoverBackgroundColor: "rgba(255,99,132,0.4)",
		hoverBorderColor: "rgba(255,99,132,1)",
		data: [65, 59, 20, 81, 56, 55, 40]
	}
]

export default {
	data() {
		return {
			data: {
				labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
				datasets
			},
			options: {
				maintainAspectRatio: false,
				scales: {
					yAxes: [
						{
							stacked: true,
							gridLines: {
								display: true,
								color: "rgba(255,99,132,0.2)"
							}
						}
					],
					xAxes: [
						{
							gridLines: {
								display: true
							}
						}
					]
				}
			}
		}
	},
	mounted() {
		Chart.Line(this.$refs.chart, {
			options: this.options,
			data: this.data
		});
	}
}
</script>
