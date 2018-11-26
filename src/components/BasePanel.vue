<style scoped>
.base-card-title {
	padding-top: 3px;
	padding-bottom: 4px;
}
</style>

<template>
	<v-card class="base-card">
		<v-card-title class="base-card-title">
			<i v-if="icon" class="fas mr-2" :class="'fa-' + icon"></i>
			<slot name="title"></slot>
		</v-card-title>
		<v-card-text class="pt-0">
			<slot></slot>
		</v-card-text>
	</v-card>
</template>

<script>
export default {
	props: {
		icon: String,
		title: String
	}
}
</script>
