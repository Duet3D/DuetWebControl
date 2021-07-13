<template>
   <div class="center-container"  ref="jogContainer"></div>
</template>

<script>
'use strict';
import jogControl from './JogControl.js';
import { mapState, mapActions } from 'vuex';
export default {
	computed: {
		...mapState('settings', ['darkTheme']),
		...mapState('machine/model', ['move']),
		axesState() {
			return this.move.axes.map(axis => {
				return { letter: axis.letter, homed: axis.homed };
			});
		},
	},
	mounted() {
		this.$options.jogControl = new jogControl(this.$refs.jogContainer, this.jogAction);
		this.$options.jogControl.config.noSelectClass = 'noselect';
		this.$options.jogControl.updateTheme(this.darkTheme);
		this.$options.jogControl.render();
		this.$options.jogControl.updateHomeButtons(this.axesState);

		this.$nextTick(() => {
			this.resize();
		});

		//watch for resizing events
		window.addEventListener('resize', () => {
			this.$nextTick(() => {
				this.resize();
			});
		});
	},
	methods: {
		...mapActions('machine', ['sendCode']),
		jogAction(command) {
			this.sendCode(command);
		},
		resize() {
			this.$refs.jogContainer.style.height = window.innerHeight - document.getElementById('global-container').clientHeight - document.getElementsByClassName('v-toolbar__content')[0].clientHeight - 22 + 'px';
			//         this.$options.jogControl.render();
			console.log(this.$refs.jogContainer.style.height);
		},
	},
	activated() {
		this.resize();
	},
	watch: {
		darkTheme: function (to) {
			this.$options.jogControl.updateTheme(to);
		},
		axesState: {
			handler: function (to) {
				this.$options.jogControl.updateHomeButtons(to);
			},
			deep: true,
		},
	},
};
</script>

<style>
.center-container {
	text-align: center;
}
.noselect {
	-webkit-touch-callout: none;
	-webkit-user-select: none;
	-khtml-user-select: none;
	-moz-user-select: none;
	-ms-user-select: none;
	-o-user-select: none;
	user-select: none;
}
</style>  
