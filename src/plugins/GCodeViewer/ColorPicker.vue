<template>
  <v-row justify="center" align="center">
    <v-col class="shrink" :style="[backgroundColorStyle]">
      <v-text-field v-model="internalTextColor" @blur="updateValue(internalTextColor)" @keyup.enter="updateValue(internalTextColor)" hide-details class="ma-0 pa-0" solo>
        <template v-slot:append>
          <v-menu v-model="menu" top nudge-bottom="105" nudge-left="16" :close-on-content-click="false">
            <template v-slot:activator="{ on }">
              <div :style="swatchStyle" v-on="on" />
            </template>
            <v-card>
              <v-card-text class="pa-0">
                <v-color-picker class="index-placement" v-model="color" flat @input="updateValue(color)"></v-color-picker>
              </v-card-text>
            </v-card>
          </v-menu>
        </template>
      </v-text-field>
    </v-col>
  </v-row>
</template>

<script>
'use strict'

  export default {
    props: ["editcolor"],
    data: () => ({
      internalTextColor: "#000000",
      color: "#000000",
      menu: false,
    }),
    computed: {
      backgroundColorStyle() {
        return {
          minWidth: "220px",
          backgroundColor: this.color,
        };
      },
      swatchStyle() {
        const { color, menu } = this;
        return {
          backgroundColor: color,
          cursor: "pointer",
          height: "30px",
          width: "30px",
          borderRadius: menu ? "50%" : "4px",
          transition: "border-radius 200ms ease-in-out",
        };
      },
    },
    mounted() {
      this.color = this.editcolor;
      this.internalTextColor = this.editcolor;
    },
    methods: {
      updateValue(val) {
        this.color = val;
        if (!val.startsWith("#")) {
          this.color = "#" + val;
        }
        this.color = this.color.toUpperCase().padEnd(7, "0").substring(0, 7);
        this.internalTextColor = this.color;
        this.$emit("updatecolor", this.color);
      },
    },
    watch: {
      editcolor: {
        handler: function (newVal) {
          this.color = newVal;
          this.internalTextColor = newVal;
        },
      },
    },
  };
</script>

<style>
  .menuable__content__active {
    z-index: 50 !important;
  }
</style>
