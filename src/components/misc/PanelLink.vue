<style scoped>
span {
	cursor: default;
}
</style>

<template>
	<component :is="active ? 'a' : 'span'" :href="active ? '#' : undefined" @click.prevent="active && $emit('click', $event)">
		<slot></slot>
	</component>
</template>

<script>
'use strict'

export default {
	props: {
		active: Boolean
	}
}
</script>
