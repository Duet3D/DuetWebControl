<template>
	<div class="mb-3">
		<fff-container-panel v-if="isFFF" />
		<cnc-container-panel v-else />
	</div>
</template>

<script lang="ts">
import Vue from "vue";

import { mapState } from "pinia";
import { useUiStore } from "@/store/ui";

export default Vue.extend({
	computed: mapState(useUiStore, ["isFFF"])
});
</script>