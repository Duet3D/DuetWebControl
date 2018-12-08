<style scoped>
.v-btn-toggle {
	display: flex;
}
.v-btn-toggle > button {
	display: flex;
	flex: 1 1 auto;
}
</style>

<template>
	<v-card>
		<v-card-title>
			<v-icon small class="mr-1">ac_unit</v-icon> Fan Control
		</v-card-title>

		<v-card-text class="px-3 pt-0 pb-2">
			<v-layout row align-center>
				<v-flex>
					<p class="mb-1">Fan selection:</p>
					<v-btn-toggle v-model="fan" mandatory>
						<v-btn flat :value="-1" :disabled="frozen" color="primary">
							Tool Fan
						</v-btn>
						<v-btn flat v-for="(fan, index) in fans" v-if="!fan.thermostatic.control" :key="index" :value="index":disabled="frozen" color="primary">
							{{ fan.name ? fan.name : `Fan ${index}` }}
						</v-btn>
					</v-btn-toggle>
				</v-flex>

				<v-flex shrink class="pl-3">
					<v-btn large icon><v-icon>add</v-icon></v-btn>
				</v-flex>

				<v-flex class="pl-4 pr-2">
					<v-slider
						:min="0" :max="100"
						thumb-label="always"
						></v-slider>
				</v-flex>

				<v-flex shrink color="error">
					<v-btn large icon><v-icon>remove</v-icon></v-btn>
				</v-flex>
			</v-layout>
		</v-card-text>
	</v-card>
</template>

<script>
'use strict'

import { mapState, mapGetters } from 'vuex'

export default {
	computed: {
		...mapGetters('ui', ['frozen']),
		...mapState('machine', ['fans'])
	},
	data() {
		return {
			fan: -1
		}
	}
}
</script>
