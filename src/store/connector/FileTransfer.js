'use strict'

import axios from 'axios'

import { FileTransmissionCancelledError } from '../../utils/errors.js'

class FileTransfer {
	filename = null
	finished = false

	_options = null
	_cancelToken = null

	constructor(filename, options) {
		this.filename = filename;

		this._options = options;
		this._cancelToken = axios.CancelToken.source();
		options.cancelToken = this._cancelToken.token;
	}

	// start(onProgress) must be attached dynamically by the connector because progress events cannot be remapped

	cancel(e) {
		if (!this.finished) {
			this.finished = true;
			this._cancelToken.cancel(e || new FileTransmissionCancelledError());
		}
	}
}

class UploadFileTransfer extends FileTransfer {}
class DownloadFileTransfer extends FileTransfer {}

export { UploadFileTransfer, DownloadFileTransfer }
export default FileTransfer
