'use strict'

export default function(frequency, duration, type = 'sine') {
	// This code is responsible for generating InvalidStateError messages in the console...
	const audioContext = new (window.AudioContext || window.webkitAudioContext)()
	const oscillator = audioContext.createOscillator();
	oscillator.type = type;
	oscillator.frequency.value = frequency;
	oscillator.connect(audioContext.destination);
	oscillator.start();
	// ... beeps ...
	setTimeout(() => oscillator.disconnect(), duration);
}
