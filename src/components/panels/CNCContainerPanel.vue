
<style>
.category-header {
	flex: 0 0 100px;
}
</style>

<template>
	<div>
		<v-row align="stretch" >
			<v-col cols="2" >
				<v-card  class="justify-center fill-height">
					<v-card-title>
						<strong>Status</strong>
					</v-card-title>
					<v-card-text >
						<status-label v-if="status" ></status-label>
					</v-card-text>
				</v-card>
			</v-col>
			<v-col cols="3">
				<cnc-axes-position :machinePosition="true"></cnc-axes-position>
			</v-col>
			<v-col cols="3" class="fill-height">
				<cnc-axes-position :machinePosition="false"></cnc-axes-position>
			</v-col>
			<v-col cols="2">
				<v-card class="fill-height">
					<v-card-title><strong>Requested Speed</strong></v-card-title>
					<v-card-text>
						{{ $display(move.currentMove.requestedSpeed, 0, 'mm/s') }}
					</v-card-text>
				</v-card>
			</v-col>
			<v-col cols="2" >
				<v-card class="fill-height">
					<v-card-title><strong>Top Speed</strong></v-card-title>
					<v-card-text>
						{{ $display(move.currentMove.topSpeed, 0, 'mm/s') }}
					</v-card-text>
				</v-card>
			</v-col>
		</v-row>
	</div>
</template>

<script>
import { mapState } from 'vuex';
export default {
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
			const position = this.displayToolPosition ? axis.userPosition : axis.machinePosition;
			return axis.letter === 'Z' ? this.$displayZ(position, false) : this.$display(position, 1);
		},
	},
};
</script>
