<route lang="json">
{
	"meta": {
		"menu": {
			"category": "control",
			"icon": "mdi-view-dashboard",
			"caption": "menu.control.dashboard",
			"order": 10
		}
	}
}
</route>

<template>
	<DashboardContent />
</template>

<script setup lang="ts">
import DashboardContent from "@/components/panels/DashboardContent.vue";
</script>
