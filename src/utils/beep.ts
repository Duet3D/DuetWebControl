/**
 * Generate a beep tone
 * @param frequency Frequency (in Hz)
 * @param duration Duration (in ms)
 * @param type Oscillator type
 */
export default function(frequency: number, duration: number, type: OscillatorType = "sine") {
	// This code is responsible for generating InvalidStateError messages in the console...
	const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)() as AudioContext;
	const oscillator = audioContext.createOscillator();
	oscillator.type = type;
	oscillator.frequency.value = frequency;
	oscillator.connect(audioContext.destination);
	oscillator.start();
	// ... beeps ...
	setTimeout(() => oscillator.disconnect(), duration);
}
