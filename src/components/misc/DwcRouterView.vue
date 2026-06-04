<template>
	<router-view v-slot="{ Component }">
		<Transition :name="transitionName">
			<keep-alive :include="keepAliveInclude">
				<component :is="Component" />
			</keep-alive>
		</Transition>
	</router-view>
</template>

<script setup lang="ts">
const router = useRouter();

defineProps<{
	// Vue <Transition> name driving the page swap; the shell provides the matching CSS. Omit for
	// no transition
	transitionName?: string;
}>();

// keep-alive matches by component name, so a page opts into caching by setting `meta.keepAlive` to
// its own defineOptions name in its <route> block. Keeping the opt-in on the route lets every shell -
// the built-in one and any plugin's custom layout - cache the same pages without copying a name list
const keepAliveInclude = router.getRoutes()
	.filter((r) => typeof r.meta.keepAlive === "string")
	.map((r) => r.meta.keepAlive as string);
</script>
