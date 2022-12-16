<template>
	<v-card>
		<v-card-title class="pb-1">
			<v-icon small class="mr-1">mdi-dots-horizontal</v-icon> 
			{{ $t("panel.jobData.caption") }}
		</v-card-title>

		<v-card-text class="text-center pb-2">
			<v-row dense>
				<v-col class="d-flex flex-column">
					<strong>
						{{ $t("panel.jobData.warmUpDuration") }}
					</strong>
					<span>
						{{ $displayTime(warmUpDuration) }}
					</span>
				</v-col>

				<v-col class="d-flex flex-column">
					<strong>
						{{ $t("panel.jobData.currentLayerTime") }}
					</strong>
					<span>
						{{ $displayTime(layerTime) }}
					</span>
				</v-col>

				<v-col class="d-flex flex-column">
					<strong>
						{{ $t("panel.jobData.lastLayerTime") }}
					</strong>
					<span>
						{{ $displayTime(lastLayerTime) }}
					</span>
				</v-col>

				<v-col class="d-flex flex-column">
					<strong>
						{{ $t("panel.jobData.jobDuration") }}
					</strong>
					<span>
						{{ $displayTime(jobDuration) }}
					</span>
				</v-col>
			</v-row>
		</v-card-text>
	</v-card>
</template>

<script lang="ts">
import Vue from "vue";

import store from "@/store";
import { isPrinting } from "@/utils/enums";

export default Vue.extend({
	computed: {
		warmUpDuration(): number | null {
			return isPrinting(store.state.machine.model.state.status) ? store.state.machine.model.job.warmUpDuration : store.state.machine.model.job.lastWarmUpDuration;
		},
		layerTime(): number | null {
			return store.state.machine.model.job.layerTime;
		},
		lastLayerTime(): number | null {
			if (store.state.machine.model.job.layers.length === 0) {
				return null;
			}
			return store.state.machine.model.job.layers[store.state.machine.model.job.layers.length - 1].duration;
		},
		jobDuration(): number | null {
			return isPrinting(store.state.machine.model.state.status) ? store.state.machine.model.job.duration : store.state.machine.model.job.lastDuration;
		}
	}
});
</script>
