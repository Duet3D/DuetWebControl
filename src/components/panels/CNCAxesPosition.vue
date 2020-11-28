<template>
	<v-card>
		<v-card-title class="py-2">
			<strong>{{ machinePosition ? $t('panel.status.machinePosition') : $t('panel.status.toolPosition') }} </strong>
		</v-card-title>
		<v-card-text>
			<v-row no-gutters class="flex-nowrap">
				<v-col>
					<v-row  align-content="center" no-gutters>
						<v-col v-for="(axis, index) in visibleAxes" :key="index" class="d-flex flex-column align-center">
							<strong>
								{{ axis.letter }}
							</strong>
							<span>
								{{ displayAxisPosition(axis, index) }}
							</span>
						</v-col>
					</v-row>
				</v-col>
			</v-row>
		</v-card-text>
	</v-card>
</template>

<script>
import { mapState } from 'vuex';
export default {
	props: {
		machinePosition: {
			type: Boolean,
			required: true,
		},
	},
	computed: {
		...mapState('machine/model', {
			move: state => state.move,
			machineMode: state => state.state.machineMode,
			status: state => state.state.status,
		}),
		visibleAxes() {
			return this.move.axes.filter(axis => axis.visible);
		},
	},
	methods: {
		displayAxisPosition(axis) {
			const position = this.machinePosition ? axis.machinePosition : axis.userPosition ;
			return axis.letter === 'Z' ? this.$displayZ(position, false) : this.$display(position, 1);
		},
	},
};
</script>

<style>
</style>