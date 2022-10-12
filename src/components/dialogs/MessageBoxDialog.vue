<template>
	<v-dialog v-model="shown" :persistent="isPersistent">
		<v-card>
			<v-card-title class="justify-center">
				<span class="headline">
					{{ messageBox.title }}
				</span>
			</v-card-title>

			<v-card-text>
				<!-- Main message -->
				<div class="text-center" :class="{ 'mb-6': displayedAxes.length }" v-html="messageBox.message"></div>

				<!-- Jog control -->
				<!-- TODO Replace the following and the content in MovementPanel with an own component -->
				<v-row v-for="axis in displayedAxes" :key="axis.letter" dense>
					<!-- Decreasing movements -->
					<v-col>
						<v-row no-gutters>
							<v-col v-for="index in numMoveSteps" :key="index" :class="getMoveCellClass(index - 1)">
								<code-btn :code="getMoveCode(axis, index - 1, true)" :disabled="!canMove(axis)" no-wait
										  block tile class="move-btn">
									<v-icon>mdi-chevron-left</v-icon>
									{{ axis.letter + showSign(-moveSteps(axis.letter)[index - 1]) }}
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
							<v-col v-for="index in numMoveSteps" :key="index"
								   :class="getMoveCellClass(numMoveSteps - index)">
								<code-btn :code="getMoveCode(axis, numMoveSteps - index, false)"
										  :disabled="!canMove(axis)" no-wait block tile class="move-btn">
									{{ axis.letter + showSign(moveSteps(axis.letter)[numMoveSteps - index]) }}
									<v-icon>mdi-chevron-right</v-icon>
								</code-btn>
							</v-col>
						</v-row>
					</v-col>
				</v-row>

				<!-- Inputs-->
				<form v-if="needsNumberInput || needsStringInput" @submit.prevent="ok">
					<v-text-field v-if="needsNumberInput" type="number" autofocus v-model.number="numberInput"
								  :min="messageBox.min" :max="messageBox.max" :step="needsIntInput ? 1 : 'any'" required
								  hide-details />
					<v-text-field v-else type="text" autofocus v-model="stringInput" :minlength="messageBox.min || 0"
								  :maxlength="messageBox.max || 100" required hide-details />
				</form>
			</v-card-text>

			<v-card-actions v-if="hasButtons" class="justify-center">
				<template v-if="isMultipleChoice">
					<v-btn v-for="(choice, index) in messageBox.choices" :key="choice" color="blue darken-1"
						   :text="messageBox.default !== index" :elevation="1" @click="accept(index)">
						{{ choice }}
					</v-btn>
					<v-btn v-if="messageBox.cancelButton" color="blue darken-1" text :elevation="1" @click="cancel">
						{{ $t('generic.cancel') }}
					</v-btn>
				</template>
				<template v-else>
					<v-btn color="blue darken-1" text @click="ok" :disabled="!canConfirm">
						{{ $t(isPersistent ? 'generic.ok' : 'generic.close') }}
					</v-btn>
					<v-btn v-if="messageBox.cancelButton" color="blue darken-1" text @click="cancel">
						{{ $t('generic.cancel') }}
					</v-btn>
				</template>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script>
'use strict'

import { MessageBox, MessageBoxMode } from "@duet3d/objectmodel";
import { mapState, mapGetters, mapActions } from 'vuex'
import { isNumber } from '@/utils/numbers';
import patch from '@/utils/patch';

export default {
	computed: {
		...mapState('machine', ['isReconnecting']),
		...mapState('machine/model', {
			currentMessageBox: state => state.state.messageBox,
			move: state => state.move
		}),
		...mapState('machine/settings', ['moveFeedrate']),
		...mapGetters('machine/settings', ['moveSteps', 'numMoveSteps']),
		canConfirm() {
			if (this.needsNumberInput) {
				let canConfirm;
				if (this.messageBox.mode === MessageBoxMode.intInput) {
					canConfirm = isNumber(this.numberInput) && this.numberInput === Math.round(this.numberInput);
				} else {
					canConfirm = isNumber(this.numberInput);
				}
				return canConfirm && ((this.messageBox.min === null) || (this.numberInput >= this.messageBox.min)) && ((this.messageBox.max === null) || (this.numberInput <= this.messageBox.max));
			}

			if (this.needsStringInput) {
				return ((this.messageBox.min === null) || (this.stringInput.length >= this.messageBox.min)) && ((this.messageBox.max === null) || (this.stringInput.length <= this.messageBox.max));
			}

			return true;
		},
		displayedAxes() {
			const axisControls = this.messageBox ? this.messageBox.axisControls : 0;
			return this.move.axes.filter((axis, index) => axis.visible && ((axisControls & (1 << index)) !== 0));
		},
		hasButtons() {
			return this.messageBox.mode !== MessageBoxMode.noButtons;
		},
		isMultipleChoice() {
			return this.messageBox.mode === MessageBoxMode.multipleChoice;
		},
		isPersistent() {
			return this.messageBox.mode >= MessageBoxMode.okOnly;
		},
		needsIntInput() {
			return this.messageBox.mode === MessageBoxMode.intInput;
		},
		needsNumberInput() {
			return (this.messageBox.mode === MessageBoxMode.intInput) || (this.messageBox.mode === MessageBoxMode.floatInput);
		},
		needsStringInput() {
			return this.messageBox.mode === MessageBoxMode.stringInput;
		}
	},
	data() {
		return {
			messageBox: new MessageBox(),
			numberInput: 0,
			shown: false,
			stringInput: ''
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
			if (this.messageBox.mode === MessageBoxMode.okOnly || this.messageBox.mode === MessageBoxMode.okCancel) {
				await this.sendCode(`M292 S${this.messageBox.seq}`);
			} else if (this.messageBox.mode === MessageBoxMode.intInput || this.messageBox.mode === MessageBoxMode.floatInput) {
				await this.sendCode(`M292 R{${this.numberInput}} S${this.messageBox.seq}`);
			} else if (this.messageBox.mode === MessageBoxMode.stringInput) {
				await this.sendCode(`M292 R{"${this.stringInput.replace(/"/g, '""').replace(/'/g, "''")}"} S${this.messageBox.seq}`);
			}
		},
		async accept(choice) {
			this.shown = false;
			if (this.messageBox.mode >= MessageBoxMode.multipleChoice) {
				await this.sendCode(`M292 R{${choice}} S${this.messageBox.seq}`);
			}
		},
		async cancel() {
			this.shown = false;
			if (this.messageBox.cancelButton) {
				await this.sendCode(`M292 P1 S${this.messageBox.seq}`);
			}
		}
	},
	watch: {
		isReconnecting(to) {
			if (to) {
				this.shown = false;
			}
		},
		currentMessageBox: {
			deep: true,
			handler(to) {
				if (to && to.mode !== null) {
					this.numberInput = to.default || 0;
					this.stringInput = to.default || '';
					this.messageBox.default = to.default;
					patch(this.messageBox, to);
					this.shown = true;
				} else {
					this.shown = false;
				}
			}
		}
	}
}
</script>
