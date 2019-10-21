<template>
	<v-row>
		<v-col xs="12" sm="8" md="8" lg="9" xl="9">
			<movement-panel class="mb-2"></movement-panel>

			<v-row v-if="!state.mode || state.mode === 'FFF'">
				<v-col v-if="!state.mode || state.mode === 'FFF'" sm="12" :md="(state.atxPower !== null) ? 9 : 12" :lg="(state.atxPower !== null) ? 9 : 12" :xl="(state.atxPower !== null) ? 10 : 12">
					<extrude-panel></extrude-panel>
				</v-col>

				<v-col v-if="state.atxPower !== null" class="hidden-sm-and-down" md="3" lg="3" xl="2" align-self="center">
					<atx-panel></atx-panel>
				</v-col>
			</v-row>

			<v-row>
				<v-col cols="12">
					<fan-panel></fan-panel>
				</v-col>

				<v-col v-if="state.atxPower !== null" :class="{ 'hidden-md-and-up': !state.mode || state.mode === 'FFF' }" cols="3">
					<atx-panel></atx-panel>
				</v-col>
			</v-row>
		</v-col>

		<v-col class="hidden-xs-only" sm="4" md="4" lg="3" xl="3">
			<macro-list></macro-list>
		</v-col>
	</v-row>
</template>

<script>

import { mapState } from 'vuex'

export default {
	computed: mapState('machine/model', ['state'])
}
</script>
