<!-- Reference page for the next-branch port - exercises the file-based route + menu meta + useComponentSettings + container queries pattern -->
<route lang="json">
{
	"meta": {
		"menu": {
			"category": "control",
			"icon": "mdi-code-tags",
			"caption": "menu.control.console",
			"order": 30
		}
	}
}
</route>

<template>
	<v-container fluid class="pa-2 pa-md-3">
		<v-row no-gutters>
			<v-col cols="12">
				<CodeInput variant="solo" />
			</v-col>
			<v-col cols="12" class="mt-3">
				<EventList />
			</v-col>
		</v-row>
	</v-container>
</template>

<script setup lang="ts">
import { useUiStore } from "@/stores/ui";

const uiStore = useUiStore();

// Suppress duplicate code-reply notifications while the Console is open - the EventList shows them anyway
onMounted(() => {
	uiStore.hideCodeReplyNotifications = true;
});

onBeforeUnmount(() => {
	uiStore.hideCodeReplyNotifications = false;
});
</script>
