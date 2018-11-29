<style scoped>
.base-card-title {
	padding-top: 8px;
	padding-bottom: 8px;
}
</style>

<template>
	<v-card v-auto-size>
		<v-card-title class="base-card-title">
			<v-icon small v-if="icon" class="mr-2">{{ icon }}</v-icon>
			<slot name="title"></slot>
		</v-card-title>

		<v-card-text class="pt-0 pb-0 base-card-content">
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
