<route lang="json">
{
	"meta": {
		"menu": {
			"category": "control",
			"icon": "mdi-code-tags",
			"caption": "menu.control.console",
			"order": 30,
			"badgeKey": "pendingNotifications"
		}
	}
}
</route>

<template>
	<v-row no-gutters>
		<v-col cols="12" class="px-2 px-md-0">
			<CodeInput variant="solo" />
		</v-col>
		<v-col cols="12" class="mt-3">
			<EventList />
		</v-col>
	</v-row>
</template>

<script setup lang="ts">
import { useUiStore } from "@/stores/ui";

const uiStore = useUiStore();

// Suppress duplicate code-reply notifications while the Console is open - the EventList
// already shows them. The Console page is NOT in the keep-alive include list, so it remounts
// on every navigation; onMounted/onBeforeUnmount are the right hooks
onMounted(() => {
	uiStore.hideCodeReplyNotifications = true;
	uiStore.markConsoleRead();
});

onBeforeUnmount(() => {
	uiStore.hideCodeReplyNotifications = false;
});
</script>
