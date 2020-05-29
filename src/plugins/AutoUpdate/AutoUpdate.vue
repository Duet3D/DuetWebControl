<template>
	<span>
		AutoUpdate page
	</span>
</template>

<script>
'use strict'

import { registerRoute } from '../../routes'

export default {
	install() {
		// Register a route via Settings -> Auto Update
		registerRoute(this, {
			Settings: {
				AutoUpdate: {
					icon: 'mdi-update',
					caption: 'menu.settings.update',
					path: '/Settings/Update'
				}
			}
		});
	}
}
</script>
