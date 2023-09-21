<template>
	<v-row :dense="$vuetify.display.mobile">
		<v-col>
			<webcam-panel />
		</v-col>
	</v-row>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({});
</script>
