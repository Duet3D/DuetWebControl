<style scoped>
p {
	margin-bottom: 8px;
}
p:last-child {
	margin-bottom: 0;
}
</style>

<template>
	<v-card>
		<v-card-title>
			<v-icon small class="mr-1">mdi-information</v-icon>
			{{ $t("panel.jobInfo.caption") }}
		</v-card-title>

		<v-card-text class="d-flex flex-column pt-0">
			<p>
				<strong>{{ $t("panel.jobInfo.height") }}</strong>
				{{ $displayZ(jobFile?.height) }}
			</p>
			<p v-if="isFFF">
				<strong>{{ $t("panel.jobInfo.layerHeight") }}</strong>
				{{ $displayZ(jobFile?.layerHeight) }}
			</p>
			<p v-if="isFFF">
				<strong>{{ $t("panel.jobInfo.filament") }}</strong>
				{{ $displayZ(jobFile?.filament) }}
			</p>
			<p>
				<strong>{{ $t("panel.jobInfo.generatedBy") }}</strong>
				{{ $display(jobFile?.generatedBy) }}
			</p>
		</v-card-text>
	</v-card>
</template>

<script lang="ts">
import { mapState } from "pinia";
import { defineComponent } from "vue";

import { useMachineStore } from "@/store/machine";
import { useUiStore } from "@/store/ui";

export default defineComponent({
	computed: {
		...mapState(useMachineStore, {
			jobFile: state => state.model.job.file
		}),
		...mapState(useUiStore, ["isFFF"])
	}
});
</script>
