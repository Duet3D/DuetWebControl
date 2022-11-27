<style scoped>
span {
	cursor: default;
}
</style>

<template>
	<a v-if="!active" href="javascript:void(0)" @click="$emit('click', $event)">
		<slot></slot>
	</a>
	<span v-else>
		<slot></slot>
	</span>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
	props: {
		active: Boolean
	}
});
</script>
