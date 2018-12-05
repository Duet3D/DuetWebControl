'use strict'

import iziToast from 'izitoast'
import 'izitoast/dist/css/iziToast.css'

import i18n from '../i18n'
import { UploadFileTransfer, DownloadFileTransfer } from '../store/connector/FileTransfer.js'
import { FileTransmissionCancelledError } from '../utils/errors.js'
import { formatSize, formatSpeed } from '../utils/numbers.js'
import { formatTime } from '../utils/time.js'

const defaults = {
	layout: 2,
	transitionIn: 'fadeInLeft',
	transitionOut: 'fadeOutRight'
}

function makeNotification(type, title, message = "") {
	// Prepare and show new toast
	const options = Object.assign({
		class: 'new-toast',
		title,
		message
	}, defaults);

	switch (type) {
		case 'info':
			iziToast.info(options);
			break;
		case 'success':
			iziToast.success(options);
			break;
		case 'warning':
			iziToast.warning(options);
			break;
		case 'error':
			iziToast.error(options);
			break;
	}

	// Get the new toast instance (iziToast does not return it)
	const toast = document.querySelector('.new-toast');
	toast.classList.remove('new-toast');

	// Fix layout of the created toast (by default layout 2 toasts are too wide)
	if (message) {
		const messageElement = toast.querySelector('p.iziToast-message');
		messageElement.style.width = 'auto';
		messageElement.parentNode.insertBefore(document.createElement('br'), messageElement);
	}

	return toast;
}

async function makeFileTransferNotification(fileTransfer, showSuccess = true, showError = true) {
	// Prepare and show new toast
	let type;
	if (fileTransfer instanceof UploadFileTransfer) {
		type = 'upload';
	} else if (fileTransfer instanceof DownloadFileTransfer) {
		type = 'download';
	} else {
		throw '[makeFileTransferNotification] Invalid file transfer type';
	}

	iziToast.info({
		class: 'file-transfer',
		title: i18n.t(`notification.${type}.title`, [fileTransfer.filename, 0, 0]),
		message: i18n.t(`notification.${type}.message`),
		layout: 2,
		timeout: false,
		onClosing: () => { fileTransfer.cancel() }
	});

	// Get it and fix up the layout
	const toast = document.querySelector('.file-transfer');
	toast.classList.remove('file-transfer');

	const messageElement = toast.querySelector('p.iziToast-message');
	messageElement.style.width = 'auto';
	messageElement.parentNode.insertBefore(document.createElement('br'), messageElement);

	// Get progress bar
	const title = toast.querySelector('strong.iziToast-title');
	const progressBar = toast.querySelector('div.iziToast-progressbar > div');
	progressBar.style.width = '0%';

	window.a = toast;
	window.b = iziToast;

	// Perform file transmission
	let err = null
	try {
		const startTime = new Date();
		await fileTransfer.start(e => {
			const uploadSpeed = e.loaded / (((new Date()) - startTime) / 1000), progress = (e.loaded / e.total) * 100;
			title.textContent = i18n.t(`notification.${type}.title`, [fileTransfer.filename, formatSpeed(uploadSpeed), Math.round(progress)]);
			progressBar.style.width = progress.toFixed(1) + '%';
		});

		// Show success message
		if (showSuccess) {
			const secondsPassed = Math.round((new Date() - startTime) / 1000);
			makeNotification('success', i18n.t(`notification.${type}.success`, [fileTransfer.filename, formatTime(secondsPassed)]));
		}
	} catch (e) {
		// Show and report error message
		if (e && !(e instanceof FileTransmissionCancelledError) && showError) {
			makeNotification('error', i18n.t(`notification.${type}.error`, [fileTransfer.filename]), e.message);
		}
		err = e;
	}

	iziToast.hide({}, toast);
	if (err) {
		throw err;
	}
}

export default {
	makeNotification,
	makeFileTransferNotification,

	install(Vue) {
		Vue.prototype.$toast = {
			makeNotification,
			makeFileTransferNotification
		}
	},

	installStore(store) {
		// TODO: register for notification changes here
	}
}
