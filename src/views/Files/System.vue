<template>
	<base-grid>
		<dynamic-grid-item :md="[0, 0, 24, 9]">
			<sys-file-list></sys-file-list>
		</dynamic-grid-item>
	</base-grid>
</template>

<script>
'use strict'

import BasePage from '../BasePage.vue'

export default {
	extends: BasePage
}
</script>
