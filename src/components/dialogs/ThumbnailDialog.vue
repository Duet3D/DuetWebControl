<template>
	<v-dialog v-model="shown" @click:outside="close" @click="close">
		<v-card>
			<v-card-title>{{ filename }}</v-card-title>
			<v-card-text>
				<v-img @click="close" height="70vh" :src="thumbnail.encodedImage" contain> </v-img>
			</v-card-text>
		</v-card>
	</v-dialog>
</template>

<script>
export default {
	props: {
		shown: {
			type: Boolean,
			required: true,
		},
		thumbnail: {
			type: Object,
			default: function () {
				return {
					encodedImage: '',
				};
			},
		},
		filename: {
			type: String,
		},
	},
	methods: {
		close() {
			this.$emit('update:shown', false);
		},
	},
};
</script>

<style>
</style>