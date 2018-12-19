'use strict'

import { getLocalSetting, setLocalSetting, removeLocalSetting } from '../../utils/localStorage.js'
import merge from '../../utils/merge.js'
import Path from '../../utils/path.js'

export default function(hostname) {
	return {
		namespaced: true,
		state: {
			fileInfos: {}
		},
		actions: {
			async load({ rootState, commit, dispatch }) {
				let cache;
				if (rootState.settings.cacheStorageLocal) {
					cache = getLocalSetting(`cache/${hostname}`);
				} else {
					try {
						cache = await dispatch(`machines/${hostname}/download`, { filename: Path.dwcCacheFile, showProgress: false, showSuccess: false, showError: false });
					} catch (e) {
						// may happen if the user is still using factory defaults
					}
				}

				if (cache) {
					commit('load', cache);
				}
			},
			save({ state, rootState, dispatch }) {
				if (rootState.settings.cacheStorageLocal) {
					setLocalSetting(`cache/${hostname}`, state);
				} else {
					removeLocalSetting(`cache/${hostname}`);

					try {
						const content = new Blob([JSON.stringify(state)]);
						dispatch(`machines/${hostname}/upload`, { filename: Path.dwcCacheFile, content, showProgress: false, showSuccess: false });
					} catch (e) {
						// handled before we get here
					}
				}
			}
		},
		mutations: {
			load: (state, content) => merge(state, content),

			setFileInfo(state, { filename, fileInfo }) {
				state.fileInfos[filename] = fileInfo;
			},
			clearFileInfo(state, directory) {
				for (let filename in state.fileInfos) {
					if (!directory || Path.extractFilePath(filename) === directory) {
						delete state.fileInfos[filename];
					}
				}
			}
		}
	}
}
