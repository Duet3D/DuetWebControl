<template>
	<v-dialog v-model="shown" :persistent="persistent">
		<v-card>
			<v-card-title>
				<center class="headline">{{ messageBox.title }}</center>
			</v-card-title>

			<v-card-text>
				<center>
					{{ messageBox.message }}
				</center>

				<!-- Jog control -->
				<v-layout v-if="displayedAxes.length" row wrap class="my-2">
					<!-- Decreasing movements -->
					<v-flex>
						<v-layout row>
							<v-flex v-for="index in numMoveSteps" :key="-index" :class="getMoveCellClass(index - 1)">
								<v-layout column>
									<v-flex v-for="axis in displayedAxes" :key="axis.letter">
										<code-btn :code="`G91\nG1 ${axis.letter}${-moveSteps(axis.letter)[index - 1]} F${moveFeedrate}\nG90`" block>
											<v-icon>keyboard_arrow_left</v-icon> {{ axis.letter + -moveSteps(axis.letter)[index - 1] }}
										</code-btn>
									</v-flex>
								</v-layout>
							</v-flex>
						</v-layout>
					</v-flex>

					<v-flex shrink class="hidden-sm-and-down px-1"></v-flex>

					<!-- Increasing movements -->
					<v-flex>
						<v-layout row>
							<v-flex v-for="index in numMoveSteps" :key="index" :class="getMoveCellClass(numMoveSteps - index)">
								<v-layout column>
									<v-flex v-for="axis in displayedAxes" :key="axis.letter">
										<code-btn :code="`G91\nG1 ${axis.letter}${moveSteps(axis.letter)[numMoveSteps - index]} F${moveFeedrate}\nG90`" block>
											{{ axis.letter + '+' + moveSteps(axis.letter)[numMoveSteps - index] }} <v-icon>keyboard_arrow_right</v-icon>
										</code-btn>
									</v-flex>
								</v-layout>
							</v-flex>
						</v-layout>
					</v-flex>
				</v-layout>
			</v-card-text>

			<v-card-actions v-if="messageBox.mode">
				<v-spacer></v-spacer>
				<v-btn v-if="messageBox.mode === 1 || messageBox.mode === 3" color="blue darken-1" flat @click="cancel">
					{{ $t(messageBox.mode === 1 ? 'generic.close' : 'generic.cancel') }}
				</v-btn>
				<v-btn v-if="messageBox.mode === 2 || messageBox.mode === 3" color="blue darken-1" flat @click="ok">
					{{ $t('generic.ok') }}
				</v-btn>
				<v-spacer></v-spacer>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions } from 'vuex'

export default {
	computed: {
		// no need to observe isConnected here because the default machine instance never displays a messagebox anyway
		...mapState('machine/model', ['messageBox', 'move']),
		...mapState('machine/settings', ['moveFeedrate']),
		...mapGetters('machine/settings', ['moveSteps', 'numMoveSteps']),
		displayedAxes() {
			const axisControls = this.messageBox.axisControls;
			return this.move.axes.filter((axis, index) => axis.visible && axisControls.indexOf(index) !== -1);
		}
	},
	data() {
		return {
			shown: false,
			persistent: false
		}
	},
	methods: {
		...mapActions('machine', ['sendCode']),
		getMoveCellClass(index) {
			let classes = '';
			if (index === 0 || index === this.numAxsSteps - 1) {
				classes += 'hidden-md-and-down';
			}
			if (index > 1 && index < 5 && index % 2 === 1) {
				classes += 'hidden-sm-and-down';
			}
			return classes;
		},
		ok() {
			this.shown = false;
			this.sendCode('M292');
		},
		cancel() {
			this.shown = false;
			this.sendCode('M292 P1');
		}
	},
	watch: {
		'messageBox.mode'(to) {
			this.shown = (to !== null);
			this.persistent = (to === 1);
		}
	}
}
</script>
