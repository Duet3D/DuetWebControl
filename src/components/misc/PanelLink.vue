<style scoped>
a:not(:hover) {
	text-decoration: none;
}

span {
	cursor: pointer;
}
</style>

<template>
	<div>
		<span v-if="selected">
			<slot></slot>
		</span>
		<a v-if="!selected" href="#" @click.prevent="$emit('click')">
			<slot></slot>
		</a>
	</div>
</template>

<script>
'use strict'

export default {
	props: {
		selected: Boolean
	}
}
</script>
