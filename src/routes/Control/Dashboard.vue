<template>
	<v-layout row wrap>
		<v-flex xs12 sm8 md8 lg9 xl9>
			<v-layout column>
				<v-flex>
					<movement-panel></movement-panel>
				</v-flex>

				<v-flex v-if="!state.mode || state.mode === 'FFF' || state.atxPower !== null">
					<v-layout v-if="!state.mode || state.mode === 'FFF'" row>
						<v-flex sm12
							:md9="state.atxPower !== null" :lg9="state.atxPower !== null" :xl10="state.atxPower !== null"
							:md12="state.atxPower === null" :lg12="state.atxPower === null" :xl12="state.atxPower === null">
							<extrude-panel></extrude-panel>
						</v-flex>

						<v-flex v-if="state.atxPower !== null" class="hidden-sm-and-down" align-self-center md3 lg3 xl2>
							<atx-panel></atx-panel>
						</v-flex>
					</v-layout>
				</v-flex>

				<v-flex md9>
					<fan-panel></fan-panel>
				</v-flex>

				<v-flex v-if="state.atxPower !== null" class="hidden-md-and-up">
					<atx-panel></atx-panel>
				</v-flex>
			</v-layout>
		</v-flex>

		<v-flex class="hidden-xs-only" sm4 md4 lg3 xl3>
			<macro-list></macro-list>
		</v-flex>
	</v-layout>
</template>

<script>

import { mapState } from 'vuex'

export default {
	computed: mapState('machine/model', ['state'])
}
</script>
