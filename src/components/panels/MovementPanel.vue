<style scoped>
.dropdown-btn {
	border-radius: 2px;
	background: transparent;
	justify-content: center;
	min-width: 0;
	width: 36px;
}

.move-btn {
	padding-left: 0;
	padding-right: 0;
	min-width: 0;
}

.nowrap {
	flex-wrap: nowrap;
}
</style>

<template>
	<v-card v-auto-size>
		<v-card-title class="pt-2 pb-0 nowrap">
			<code-btn color="primary" small code="G28" :title="$t('button.home.titleAll')" class="ml-0 hidden-sm-and-down">
				{{ $t('button.home.captionAll') }}
			</code-btn>

			<v-spacer class="hidden-sm-and-down"></v-spacer>

			<v-icon small class="mr-1">swap_horiz</v-icon> {{ $t('panel.movement.caption') }}

			<v-spacer></v-spacer>

			<code-btn color="primary" small code="G32" class="mr-0" title="$t(move.geometry === 'delta' ? 'button.compensation.titleDelta' : 'button.compensation.title')">
				{{ $t(move.geometry === 'delta' ? 'button.compensation.captionDelta' : 'button.compensation.caption') }}
			</code-btn>
			<v-menu offset-y left :close-on-content-click="false" :disabled="frozen">
				<template slot="activator">
					<v-btn color="primary" small class="mx-0 dropdown-btn" :disabled="frozen">
						<v-icon>arrow_drop_down</v-icon>
					</v-btn>
				</template>

				<v-card>
					<v-layout justify-center column class="pt-2 px-2">
						TODO some more stuff here, see DWC1
					</v-layout>
				</v-card>
			</v-menu>
		</v-card-title>

		<v-card-text class="pt-0 pb-2">
			<!-- Mobile home buttons -->
			<v-layout justify-center row wrap class="hidden-md-and-up">
				<v-flex>
					<code-btn color="primary" code="G28" :title="$t('button.home.titleAll')" block>
						{{ $t('button.home.captionAll') }}
					</code-btn>
				</v-flex>
				<v-flex v-for="axis in move.axes.filter(axis => axis.visible)" :key="axis.letter">
					<code-btn :color="axis.homed ? 'primary' : 'warning'" :disabled="frozen" :title="$t('button.home.title', [axis.letter])" :code="`G28 ${axis.letter}`" block>

						{{ $t('button.home.caption', [axis.letter]) }}
					</code-btn>
				</v-flex>
			</v-layout>

			<v-layout row>
				<!-- Regular home buttons -->
				<v-flex shrink class="hidden-sm-and-down">
					<v-layout column inline>
						<v-flex v-for="axis in move.axes.filter(axis => axis.visible)" :key="axis.letter">
							<code-btn :color="axis.homed ? 'primary' : 'warning'" :disabled="frozen" :title="$t('button.home.title', [axis.letter])" :code="`G28 ${axis.letter}`" class="ml-0">

								{{ $t('button.home.caption', [axis.letter]) }}
							</code-btn>
						</v-flex>
					</v-layout>
				</v-flex>

				<v-flex>
					<v-layout row inline>
						<!-- Decreasing movements -->
						<v-flex v-for="index in numAxisSteps" :key="-index" :class="getMoveCellClass(index - 1)">
							<v-layout column>
								<v-flex v-for="axis in move.axes.filter(axis => axis.visible)" :key="axis.letter">
									<code-btn code="`G1 ${axis}${-moveSteps(axis.letter)[index - 1]} F${machineUI.moveFeedrate}`" block class="move-btn">
										<v-icon>arrow_left</v-icon> {{ axis.letter + -moveSteps(axis.letter)[index - 1] }}
									</code-btn>
								</v-flex>
							</v-layout>
						</v-flex>

						<v-flex shrink class="hidden-sm-and-down px-1"></v-flex>

						<!-- Increasing movements -->
						<v-flex v-for="index in numAxisSteps" :key="index" :class="getMoveCellClass(numAxisSteps - index)">
							<v-layout column>
								<v-flex v-for="axis in move.axes.filter(axis => axis.visible)" :key="axis.letter">
									<code-btn code="`G1 ${axis}${moveSteps(axis.letter)[numAxisSteps - index]} F${machineUI.moveFeedrate}`" block class="move-btn">
										{{ axis.letter + '+' + moveSteps(axis.letter)[numAxisSteps - index] }} <v-icon>arrow_right</v-icon>
									</code-btn>
								</v-flex>
							</v-layout>
						</v-flex>
					</v-layout>
				</v-flex>
			</v-layout>
		</v-card-text>

		<v-alert v-if="unhomedAxes.length" :value="true" type="warning">
			{{ $t(unhomedAxes.length === 1 ? 'panel.movement.axisNotHomed' : 'panel.movement.axesNotHomed') }}
			<strong>
				{{ unhomedAxes.map(axis => axis.letter).reduce((a, b) => `${a}, ${b}`) }}
			</strong>
		</v-alert>
	</v-card>
</template>

<script>
'use strict'

import { mapState, mapGetters } from 'vuex'

export default {
	computed: {
		...mapState('machine', ['move']),
		...mapGetters('ui', ['frozen', 'machineUI', 'moveSteps']),
		unhomedAxes() { return this.move.axes.filter(axis => axis.visible && !axis.homed); },
		numAxisSteps() { return this.moveSteps('x').length; }
	},
	methods: {
		getMoveCellClass(index) {
			let classes = '';
			if (index === 0 || index === 5) {
				classes += 'hidden-lg-and-down';
			}
			if (index > 1 && index < 4 && index % 2 === 1) {
				classes += 'hidden-md-and-down';
			}
			return classes;
		}
	}
}
</script>
