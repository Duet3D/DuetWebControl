<style scoped>
.macro {
    width: 100%;
}
</style>

<template>
    <v-row>
        <v-col cols="12" class="pt-0 pb-0">
            <cnc-movement-panel class="mb-2" />
        </v-col>
        <v-col cols="12" md="9">
            <v-row dense>
                <v-col cols="12">
                    <spindle-speed-panel />
                </v-col>
                <v-col cols="12">
                    <v-card>
                        <v-card-text>
                            <job-progress />
                        </v-card-text>
                    </v-card>
                </v-col>
                <v-col cols="4" class="flex-grow-1">
                    <job-control-panel />
                </v-col>
                <v-col cols="4" class="flex-grow-1">
                    <z-babystep-panel class="fill-height" />
                </v-col>
                <v-col cols="4" class="flex-grow-1">
                    <speed-factor-panel class="fill-height" />
                </v-col>
            </v-row>
        </v-col>
        <v-col cols="12" md="3">
            <v-row dense>
                <macro-list class="macro" />
            </v-row>
        </v-col>
    </v-row>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({});
</script>
