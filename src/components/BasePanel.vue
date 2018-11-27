<style scoped>
.base-card-title {
	padding-top: 3px;
	padding-bottom: 4px;
}
</style>

<template>
	<v-card>
		<v-card-title class="base-card-title">
			<i v-if="icon" class="fas mr-2" :class="'fa-' + icon"></i>
			<slot name="title"></slot>
		</v-card-title>

		<v-card-text class="pt-0 pb-0 base-card-content">
			<slot></slot>
		</v-card-text>
	</v-card>
</template>

<script>
export default {
	data() {
		return {
			gridItem: null
		}
	},
	props: {
		icon: String,
		title: String,
		width: Number | String,
		height: {
			type: Number | String,
			default: "auto"
		}
	},
	created() {
		this.gridItem = this.$parent;
		while (this.gridItem.$options._componentTag !== 'vue-grid-item') {
			this.gridItem = this.gridItem.$parent;
		}
	},
	mounted() {
		this.attemptResize();
		window.addEventListener('resize', this.resize);
	},
	methods: {
		// FIXME The following method should not be necessary...
		attemptResize() {
			if (this.gridItem.$parent.originalLayout === null) {
				setTimeout(this.attemptResize, 0);
				return;
			}
			this.resize();
		},
		resize() {
			if (this.width === "auto") {
				let totalWidth = 0;
				for (let i = 0; i < this.$el.children.length; i++) {
					const child = this.$el.children[i];
					totalWidth += child.offsetWidth;
					if (child.style.marginLeft !== "") { totalWidth += child.style.marginLeft; }
					if (child.style.marginRight !== "") { totalWidth += child.style.marginRight; }
				}
				this.gridItem.$emit("requestWidth", totalWidth);
			}

			if (this.height === "auto") {
				let totalHeight = 0;
				for (let i = 0; i < this.$el.children.length; i++) {
					const child = this.$el.children[i];
					totalHeight += child.offsetHeight;
					if (child.style.marginTop !== "") { totalHeight += child.style.marginTop; }
					if (child.style.marginBottom !== "") { totalHeight += child.style.marginBottom; }
				}
				this.gridItem.$emit("requestHeight", totalHeight);
			}
		}
	},
	updated() {
		// Sadly there is no resize event on DOM elements, so we assume size changes occur after every update
		this.resize();
	},
	watch: {
		height(to) {
			if (this.gridItem !== null) {
				this.gridItem.$emit("requestHeight", to);
			}
		},
		width(to) {
			if (this.gridItem !== null) {
				this.gridItem.$emit("requestWidth", to);
			}
		}
	}
}
</script>
