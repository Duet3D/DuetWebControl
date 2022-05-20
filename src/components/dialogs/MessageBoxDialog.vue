<template>
	<v-dialog v-model="shown" :persistent="persistent">
		<v-card>
			<v-card-title class="justify-center">
				<span class="headline">
					{{ messageBox ? messageBox.title : $t('generic.noValue') }}
				</span>
			</v-card-title>

			<v-card-text>
				<!-- Main message -->
				<div class="text-center" :class="{ 'mb-6': displayedAxes.length }" v-html="messageBox ? messageBox.message : $t('generic.noValue')"></div>

				<!-- Jog control -->
				<!-- TODO Replace the following and the content in MovementPanel with an own component -->
				<v-row v-for="axis in displayedAxes" :key="axis.letter" dense align="center">
					<!-- Decreasing movements -->
					<v-col>
						<v-row no-gutters>
							<v-col v-for="index in numMoveSteps" :key="index"  :class="getMoveCellClass(index - 1)">
								<code-btn :code="getMoveCode(axis, index - 1, true)" :disabled="!canMove(axis)" no-wait block tile class="move-btn">
									<v-icon>mdi-chevron-left</v-icon> {{ axis.letter + showSign(-moveSteps(axis.letter)[index - 1]) }}
								</code-btn>
							</v-col>
						</v-row>
					</v-col>

					<!-- Current position -->
					<v-col cols="auto" class="px-3">
						<strong>
							{{ axis.letter + ' = ' + displayAxisPosition(axis) }}
						</strong>
					</v-col>

					<!-- Increasing movements -->
					<v-col>
						<v-row no-gutters>
							<v-col v-for="index in numMoveSteps" :key="index" :class="getMoveCellClass(numMoveSteps - index)">
								<code-btn :code="getMoveCode(axis, numMoveSteps - index, false)" :disabled="!canMove(axis)" no-wait block tile class="move-btn">
									{{ axis.letter + showSign(moveSteps(axis.letter)[numMoveSteps - index]) }} <v-icon>mdi-chevron-right</v-icon>
								</code-btn>
							</v-col>
						</v-row>
					</v-col>
				</v-row>
			</v-card-text>

			<v-card-actions v-if="messageBox && messageBox.mode !== 0">
				<v-spacer></v-spacer>
				<v-btn color="blue darken-1" text @click="ok">
					{{ $t(messageBox.mode === 1 ? 'generic.close' : 'generic.ok') }}
				</v-btn>
				<v-btn v-if="messageBox && messageBox.mode === 3" color="blue darken-1" text @click="cancel">
					{{ $t('generic.cancel') }}
				</v-btn>
				<v-spacer></v-spacer>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions } from 'vuex'
import { MessageBoxMode } from "@/store/machine/modelEnums";

export default {
	computed: {
		...mapState('machine', ['isReconnecting']),
		...mapState('machine/model', {
			messageBox: state => state.state.messageBox,
			move: state => state.move
		}),
		...mapState('machine/settings', ['moveFeedrate']),
		...mapGetters('machine/settings', ['moveSteps', 'numMoveSteps']),
		displayedAxes() {
			const axisControls = this.messageBox ? this.messageBox.axisControls : 0;
			return this.move.axes.filter((axis, index) => axis.visible && ((axisControls & (1 << index)) !== 0));
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
		canMove(axis) {
			return axis.homed || !this.move.noMovesBeforeHoming;
		},
		displayAxisPosition(axis) {
			let position = NaN;
			if (this.displayToolPosition) {
				if (axis.drives.length > 0) {
					position = this.move.drives[axis.drives[0]].position;
				}
			} else {
				position = axis.machinePosition;
			}
			return (axis.letter === 'Z') ? this.$displayZ(position, false) : this.$display(position, 1);
		},
		getMoveCellClass(index) {
			let classes = '';
			if (index === 0 || index === 5) {
				classes += 'hidden-lg-and-down';
			}
			if (index > 1 && index < 4 && index % 2 === 1) {
				classes += 'hidden-md-and-down';
			}
			return classes;
		},
		getMoveCode(axis, index, decrementing) {
			return `M120\nG91\nG1 ${/[a-z]/.test(axis.letter) ? '\'' : ''}${axis.letter.toUpperCase()}${decrementing ? '-' : ''}${this.moveSteps(axis.letter)[index]} F${this.moveFeedrate}\nM121`;
		},
		showSign: (value) => (value > 0) ? `+${value}` : value,
		async ok() {
			this.shown = false;
			if (this.messageBox && (this.messageBox.mode === MessageBoxMode.okOnly || this.messageBox.mode === MessageBoxMode.okCancel)) {
				await this.sendCode('M292');
			}
		},
		async cancel() {
			this.shown = false;
			if (this.messageBox && (this.messageBox.mode === MessageBoxMode.okCancel)) {
				await this.sendCode('M292 P1');
			}
		}
	},
	watch: {
		isReconnecting(to) {
			if (to) {
				this.shown = false;
			}
		},
		messageBox: {
			deep: true,
			handler(to) {
				this.shown = (to && to.mode !== null);
				this.persistent = (to && to.mode !== 0);
			}
		}
	}
}
</script>
