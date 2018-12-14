'use strict'

import { extractFilePath } from '../../utils/path.js'
window.e = extractFilePath;

export default function() {
	return {
		namespaced: true,
		state: {
			fileInfos: {}
		},
		mutations: {
			setFileInfo(state, { filename, fileInfo }) {
				state.fileInfos[filename] = fileInfo;
			},
			clearFileInfo(state, directory) {
				for (let filename in state.fileInfos) {
					if (!directory || extractFilePath(filename) === directory) {
						delete state.fileInfos[filename];
					}
				}
			}
		}
	}
}
