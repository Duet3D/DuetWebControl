<template>
	<div class="mb-3">
		<fff-dashboard-panel v-if="isFFF" />
		<cnc-dashboard-panel v-else />
	</div>
</template>

<script lang="ts">
import { mapState } from "pinia";
import { defineComponent } from "vue";

import { useUiStore } from "@/store/ui";

export default defineComponent({
	computed: mapState(useUiStore, ["isFFF"])
});
</script>
