<style scoped>
a:not(:hover) {
	text-decoration: none;
}

table {
	width: 100%;
}
table.tools th,
table.tools td {
	width: 20%;
}
</style>

<template>
	<base-panel>
		<template slot="title">
			<panel-link :selected="currentPage == 'tools'" @click="currentPage = 'tools'" class="mr-2">
				<v-icon small>build</v-icon> {{ $t('panel.tools.caption') }}
			</panel-link>
			<panel-link :selected="currentPage == 'extra'" @click="currentPage = 'extra'">
				<v-icon small>timeline</v-icon> {{ $t('panel.tools.extra.caption') }}
			</panel-link>

			<v-spacer></v-spacer>

			<a href="#">
				<v-icon small>expand_more</v-icon> {{ $t('panel.tools.controlAll') }}
			</a>
		</template>

		<template v-if="currentPage == 'tools'">
			<table class="tools">
				<thead>
					<th>{{ $t('panel.tools.tool', ['']) }}</th>
					<th>{{ $t('panel.tools.heater', ['']) }}</th>
					<th>{{ $t('panel.tools.current', ['']) }}</th>
					<th>{{ $t('panel.tools.active') }}</th>
					<th>{{ $t('panel.tools.standby') }}</th>
				</thead>
				<tbody>
					<template v-for="(tool, index) in tools">
						<tr :key="`${index}-0`">
							<th :rowspan="Math.max(1, tool.heaters.length)">
								<a href="#" @click.prevent="toolClick(tool)">{{ tool.name || $t('panel.tools.tool', [tool.number]) }}</a>
							</th>

							<th>
								<a v-if="tool.heaters.length > 0" href="#" @click.prevent="heaterClick(tool, 0)">
									{{ $t('panel.tools.heater', [tool.heaters[0]]) }}
								</a>
							</th>
							<th>
								<span v-if="tool.heaters.length > 0">
									{{ $display(heaters.heaters[tool.heaters[0]].current, 1, "C") }}
								</span>
							</th>
							<td>
								<v-combobox type="number" v-model.lazy.number="test"></v-combobox>
							</td>
							<td>
								<v-combobox type="number"></v-combobox>
							</td>
						</tr>
						<tr v-for="heater in tool.heaters.slice(1)" :key="`${index}-${heater}`">
							<th>
								<a href="#" @click.prevent="heaterClick(tool, heater)">
									{{ $t('panel.tools.heater', [tool.heaters[0]]) }}
								</a>
							</th>
							<th>
								<span>
									{{ $display(heaters.heaters[heater].current, 1, "C") }}
								</span>
							</th>
						</tr>
					</template>
					<!-- TODO bed + chambers -->
				</tbody>
			</table>
		</template>

		<template v-if="currentPage == 'extra'">
			TODO extra temps here
		</template>
	</base-panel>
</template>

<script>
'use strict'

import Vue from 'vue'
import { mapState } from 'vuex'

export default {
	computed: mapState('machine', ['tools', 'heaters']),
	data() {
		return {
			currentPage: 'tools',
			test: 0
		}
	},
	methods: {
		toolClick(tool) {

		},
		heaterClick(tool, heater) {

		}
	}
}
</script>
