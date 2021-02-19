<template>
	<v-row>
		<v-col cols="12" class="pt-1">
			<code-input solo></code-input>
		</v-col>
		<v-col cols="12">
			<event-list></event-list>
		</v-col>
	</v-row>
</template>

<script>
'use strict'

import { mapMutations } from 'vuex'

import { registerRoute } from '..'

export default {
	install() {
		// Register a route via Control -> Console
		registerRoute(this, {
			Control: {
				Console: {
					icon: 'mdi-code-tags',
					caption: 'menu.control.console',
					path: '/Console'
				}
			}
		});
	},
	methods: mapMutations(['hideCodeReplyNotifications', 'showCodeReplyNotifications']),
	activated() {
		this.hideCodeReplyNotifications();
	},
	deactivated() {
		this.showCodeReplyNotifications();
	}
}
</script>
