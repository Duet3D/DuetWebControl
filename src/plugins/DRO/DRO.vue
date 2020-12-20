<template>
    <div ref="primarycontainer">
        <div v-for="(axis, index) in visibleAxes" :key="index" :style="{fontSize : labelHeight}">
            {{ axis.letter }}  {{ displayAxisPosition(axis)}}
        </div>
    </div>
</template>

<script>
'use strict';
import { mapState } from 'vuex'
export default {
	computed: {
		...mapState('machine/model', {
			move: state => state.move,
		}),
		visibleAxes() {
			return this.move.axes.filter(axis => axis.visible);
		},
		labelHeight() {
          return  (this.windowHeight / (this.visibleAxes.length + 2 )) + 'px' ;
        },
    },
    data: function() { return {
        windowHeight :50
    }},
    activated(){
        this.resize();
    },
	mounted() {
		window.addEventListener('resize', () => {
			this.$nextTick(() => {
				this.resize();
			});
        });
	},
	methods: {
		displayAxisPosition(axis) {
			const position = this.machinePosition ? axis.machinePosition : axis.userPosition;
			return axis.letter === 'Z' ? this.$displayZ(position, false) : this.$display(position, 1);
		},
		resize() {
            this.windowHeight =  window.innerHeight - document.getElementById('global-container').clientHeight - document.getElementsByClassName('v-toolbar__content')[0].clientHeight - 22;
			this.$refs.primarycontainer.style.height =this.windowHeight + 'px';
		},
	},
};
</script>

<style>
</style>