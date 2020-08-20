<template>
	<span>
		AutoUpdate page (TBD!)
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
					caption: 'plugins.autoUpdate.menuCaption',
					path: '/Settings/Update'
				}
			}
		});
	}
}
</script>
