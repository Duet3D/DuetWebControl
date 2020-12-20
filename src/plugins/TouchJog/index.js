'use strict';
import Vue from 'vue';
import { registerRoute } from '../../routes';
import JogControl from './JogControl.vue';

Vue.component('jog-control', JogControl);

registerRoute(JogControl, {
    Control: {
      Jog: {
        icon: 'mdi-gamepad',
        caption: "Jog",
        path: '/Jog',
      },
    },
  });
  