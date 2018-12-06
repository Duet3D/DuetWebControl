'use strict'

import axios from 'axios'

class FileTransfer {
	filename = null
	finished = false
	cancelled = false

	_options = null
	_cancelToken = null

	constructor(filename, options) {
		this.filename = filename;
		this._options = options;

		// Work-around for global cancel token, see https://github.com/axios/axios/issues/978
		this._cancelSource = axios.CancelToken.source();
		this._cancelSource.token.throwIfRequested = this._cancelSource.token.throwIfRequested;
		this._cancelSource.token.promise.then = this._cancelSource.token.promise.then.bind(this._cancelSource.token.promise);
		this._cancelSource.token.promise.catch = this._cancelSource.token.promise.catch.bind(this._cancelSource.token.promise);
		options.cancelToken = this._cancelSource.token;
	}

	// start(onProgress) must be attached dynamically by the connector because progress events cannot be remapped

	cancel(e) {
		if (!this.finished) {
			this.cancelled = true
			this.finished = true;
			this._cancelSource.cancel(e);
		}
	}
}

class UploadFileTransfer extends FileTransfer {}
class DownloadFileTransfer extends FileTransfer {}

export { UploadFileTransfer, DownloadFileTransfer }
export default FileTransfer
