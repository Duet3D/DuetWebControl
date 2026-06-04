<route lang="json">
{
	"meta": {
		"pageFill": true,
		"menu": {
			"category": "files",
			"icon": "mdi-polymer",
			"caption": "menu.files.macros",
			"order": 15,
			"conditionKey": "xsOrSm"
		}
	}
}
</route>

<template>
	<div class="macros-page dwc-page-fill">
		<MacroList class="h-100" />
	</div>
</template>

<script setup lang="ts">
import MacroList from "@/components/lists/MacroList.vue";
</script>
