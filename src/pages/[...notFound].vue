<template>
	<v-container class="pa-4">
		<v-alert type="warning" variant="tonal" icon="mdi-help-circle">
			<div class="text-title-medium mb-2">{{ $t("page.notFound.title") }}</div>
			<div class="text-body-medium">{{ $t("page.notFound.message", [route.path]) }}</div>
			<div v-if="looksLikePluginPath" class="text-body-small text-medium-emphasis mt-2">
				{{ $t("page.notFound.pluginHint") }}
			</div>
			<v-btn class="mt-4" color="primary" variant="elevated" to="/">
				{{ $t("page.notFound.goHome") }}
			</v-btn>
		</v-alert>
	</v-container>
</template>

<script setup lang="ts">
import Events from "@/utils/events";

const route = useRoute();
const router = useRouter();

const looksLikePluginPath = computed(() => route.path.startsWith("/Plugins/"));

// When a plugin registers its route after the user already landed here, re-resolve and replace
// so the user transparently lands on the proper page instead of staying parked on the fallback
function tryNavigate() {
	const resolved = router.resolve(route.fullPath);
	const currentMatch = route.matched[0]?.path;
	if (resolved.matched.length > 0 && resolved.matched[0].path !== currentMatch) {
		router.replace(route.fullPath);
	}
}

Events.on("dwcPluginLoaded", tryNavigate);
onBeforeUnmount(() => Events.off("dwcPluginLoaded", tryNavigate));
</script>
