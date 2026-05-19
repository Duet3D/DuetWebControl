<template>
	<DashboardContent />
</template>

<script setup lang="ts">
// Distinct route from `/` so the hub tile's `:to="/Dashboard"` actually navigates -
// vue-router treats clicks on the currently-active route as no-ops, and an alias on
// index.vue would make `/` and `/Dashboard` the same route record. Renders the same
// shared DashboardContent that index.vue does, with no cross-import between pages
import DashboardContent from "@/components/panels/DashboardContent.vue";
</script>
