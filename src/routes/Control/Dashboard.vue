<template>
	<div class="mb-3">
		<fff-dashboard-panel v-if="isFFF" />
		<cnc-dashboard-panel v-else />
	</div>
</template>

<script lang="ts">
import { mapState } from "pinia";
import Vue from "vue";

import { useUiStore } from "@/store/ui";

export default Vue.extend({
	computed: mapState(useUiStore, ["isFFF"])
});
</script>
