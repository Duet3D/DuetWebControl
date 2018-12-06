<style>
.base-panel-title {
	padding-top: 8px;
	padding-bottom: 8px;
}
</style>

<template>
	<v-card>
		<v-card-title class="base-panel-title">
			<v-icon small v-if="icon" class="mr-1">{{ icon }}</v-icon>
			<slot name="title"></slot>
		</v-card-title>

		<v-card-text class="pa-0">
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
