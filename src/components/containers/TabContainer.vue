<template>
	<v-card>
		<v-card-text>
			{{ test }}
		</v-card-text>
	</v-card>
</template>

<script>
export default {
	data() {
		return {
			test: 'default'
		}
	},
	methods: {
		load(content) {
			this.test = content;
		},
		save() {
			return this.test;
		}
	}
}
</script>
