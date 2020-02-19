'use strict'

const boardDefinitions = {
	LPC176x: {
		firmwareFileRegEx: /firmware(.*)\.bin/i,
		firmwareFile: 'firmware.bin',
        iapFiles: [],
        hasDisplay: true,
        hasEthernet: true,
        hasWiFi: true,
        hasPowerFailureDetection: false,
        hasMotorLoadDetection: false
    },
	duet06: {
		firmwareFileRegEx: /RepRapFirmware(.*)\.bin/i,
		firmwareFile: 'RepRapFirmware.bin',
		iapFiles: ['iap.bin'],
		hasDisplay: false,
		hasEthernet: true,
		hasWiFi: false,
		hasPowerFailureDetection: false,
		hasMotorLoadDetection: false
	},
	duet085: {
		firmwareFileRegEx: /RepRapFirmware(.*)\.bin/i,
		firmwareFile: 'RepRapFirmware.bin',
		iapFiles: ['iap.bin'],
		hasDisplay: false,
		hasEthernet: true,
		hasWiFi: false,
		hasPowerFailureDetection: false,
		hasMotorLoadDetection: false
	},
	duetwifi: {
		firmwareFileRegEx: /Duet2CombinedFirmware(.*)\.bin/i,
		firmwareFile: 'Duet2CombinedFirmware.bin',
		iapFiles: ['iap4e.bin', 'Duet2CombinedIAP.bin'],
		hasDisplay: false,
		hasEthernet: false,
		hasWiFi: true,
		hasPowerFailureDetection: true,
		hasMotorLoadDetection: true
	},
	duetethernet: {
		firmwareFileRegEx: /Duet2CombinedFirmware(.*)\.bin/i,
		firmwareFile: 'Duet2CombinedFirmware.bin',
		iapFiles: ['iap4e.bin', 'Duet2CombinedIAP.bin'],
		hasDisplay: false,
		hasEthernet: true,
		hasWiFi: false,
		hasPowerFailureDetection: true,
		hasMotorLoadDetection: true
	},
	duetmaestro: {
		firmwareFileRegEx: /DuetMaestroFirmware(.*)\.bin/i,
		firmwareFile: 'DuetMaestroFirmware.bin',
		iapFiles: ['iap4s.bin', ' DuetMaestroIAP.bin'],
		hasDisplay: true,
		hasEthernet: true,
		hasWiFi: false,
		hasPowerFailureDetection: true,
		hasMotorLoadDetection: true
	},
	duet3: {
		firmwareFileRegEx: null,
		firmwareFile: null,
		iapFiles: ['Duet3_SDiap_MB6HC.bin', 'Duet3_SDiap_MBP05.bin', 'Duet3_SBCiap_MB6HC.bin', 'Duet3_SBCiap_MBP05.bin'],
		hasDisplay: false,
		hasEthernet: true,
		hasWiFi: true,
		hasPowerFailureDetection: true,
		hasMotorLoadDetection: true
	}
}

export const defaultBoardName = 'duetwifi'
export const defaultBoard = boardDefinitions[defaultBoardName]

export function getBoardDefinition(boardType) {
	for (let board in boardDefinitions) {
		if (boardType.startsWith(board)) {
			return boardDefinitions[board];
		}
	}

	console.warn(`Unsupported board ${boardType}, assuming Duet WiFi`);
	return boardDefinitions[defaultBoardName];
}
