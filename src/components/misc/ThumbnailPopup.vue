<template>
    <v-menu offset-x offset-y  open-on-hover>
        <template v-slot:activator="{on, attrs}">
            <v-img  :width="48" :height="48" :src="largestImage.encodedImage" v-bind="attrs" v-on="on"></v-img>
        </template>
        <v-card>
            <v-img  contain :height="600"  :width="600"  :src="largestImage.encodedImage" ></v-img>
        </v-card>
    </v-menu>
</template>

<script>
export default {
	data: function () {
		return {
            
        };
	},
	props: {
		thumbnail: {
			type: Array,
			required: true,
		},
    },
    computed : {
        smallestImage() {
            return this.thumbnail[0];
        },
        largestImage()  {
            return this.thumbnail[this.thumbnail.length - 1];
        },
        getWidth(){
            return this.largestImage().width * 2;
        },
        getHeight() {
            return this.largestImage().height * 2;
        }
    }
};
</script>

<style>
</style>