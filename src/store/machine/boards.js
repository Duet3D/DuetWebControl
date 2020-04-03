'use strict'

// Fallback definitions for firmware versions that do not support rr_model
const boardDefinitions = {
	duet1: {
		firmwareFileName: 'RepRapFirmware.bin',
		iapFileNameSD: 'iap.bin',
		maxHeaters: 8,
		maxMotors: 10,
		supports12864: false,
		hasEthernet: true,
		hasWiFi: false
	},
	duetwifi: {
		firmwareFileName: 'Duet2CombinedFirmware.bin',
		iapFileNameSD: 'iap4e.bin',
		maxHeaters: 8,
		maxMotors: 10,
		supports12864: false,
		hasEthernet: false,
		hasWiFi: true
	},
	duetethernet: {
		firmwareFileName: 'Duet2CombinedFirmware.bin',
		iapFileNameSD: 'iap4e.bin',
		maxHeaters: 8,
		maxMotors: 10,
		supports12864: false,
		hasEthernet: true,
		hasWiFi: false
	},
	duetmaestro: {
		firmwareFileName: 'DuetMaestroFirmware.bin',
		maxHeaters: 3,
		maxMotors: 7,
		iapFileNameSD: 'iap4s.bin',
		supports12864: true,
		hasEthernet: true,
		hasWiFi: false
	},
	duet3: {
		firmwareFileName: 'Duet3Firmware_MB6HC.bin',
		iapFileNameSD: 'Duet3SDiap_MB6HC.bin',
		maxHeaters: 32,
		maxMotors: 6,
		supports12864: false,
		hasEthernet: true,
		hasWiFi: false
	},
}

export const defaultBoardName = 'duet1'
export const defaultBoard = boardDefinitions[defaultBoardName]

export function getBoardDefinition(boardType) {
	for (let board in boardDefinitions) {
		if (boardType.startsWith(board)) {
			return boardDefinitions[board];
		}
	}

	console.warn(`Unsupported board ${boardType}, assuming ${defaultBoardName}`);
	return boardDefinitions[defaultBoardName];
}
