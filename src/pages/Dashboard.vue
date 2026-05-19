<template>
	<DashboardIndex />
</template>

<script setup lang="ts">
// Distinct route from the root `/` so the hub tile's `:to="/Dashboard"` actually navigates -
// vue-router treats clicks on the currently-active route as no-ops, and an alias on index.vue
// would make `/` and `/Dashboard` the same route record. The static import of index.vue lets
// vue-router warn about the dual-import-path situation, which is harmless here because both
// routes land in the same app chunk anyway (per manualChunks in vite.config.mts)
import DashboardIndex from "@/pages/index.vue";
</script>
