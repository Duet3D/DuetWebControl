'use strict'

import { registerSettingTab } from '../../routes'
//import { registerPluginData, PluginDataType } from '../../store'

import Accelerometer from './Accelerometer.vue'

// Register a route via Machine Settings -> Accelerometer
registerSettingTab(false, 'Accelerometer', Accelerometer, 'plugins.accelerometer.name');
