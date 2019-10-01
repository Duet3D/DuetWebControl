<style scoped>
span {
	cursor: default;
}
</style>

<template>
	<a v-if="active" href="#" tabindex="0" @click="$emit('click', $event)">
		<slot></slot>
	</a>
	<span v-else>
		<slot></slot>
	</span>
</template>

<script>
'use strict'

export default {
	props: {
		active: Boolean
	}
}
</script>
