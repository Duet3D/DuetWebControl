'use strict'

let audioContext = new (window.AudioContext || window.webkitAudioContext)()

export default function(frequency, duration, type = 'sine') {
	let oscillator = audioContext.createOscillator();
	oscillator.type = type;
	oscillator.frequency.value = frequency;
	oscillator.connect(audioContext.destination);
	oscillator.start();
	// ... beeps ...
	setTimeout(() => oscillator.disconnect(), duration);
}
