import { MachineStatus } from '@duet3d/objectmodel'

/**
 * Check if the machine is in a pause-related state
 * @param status Machine status
 * @returns If the machine is paused
 */
export function isPaused (status: MachineStatus) {
  return [MachineStatus.pausing, MachineStatus.paused, MachineStatus.cancelling, MachineStatus.resuming].includes(status)
}

/**
 * Check if the machine is in a print-related state
 * @param status Machine status
 * @returns If the machine is printing
 */
export function isPrinting (status: MachineStatus) {
  return [MachineStatus.pausing, MachineStatus.paused, MachineStatus.cancelling, MachineStatus.resuming, MachineStatus.processing, MachineStatus.simulating].includes(status)
}
