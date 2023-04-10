function playTone(frequency: number, duration: number): void {
  const rampTime = 0.02
  const audioContext = new AudioContext()
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.frequency.value = frequency
  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  gainNode.gain.setValueAtTime(0, audioContext.currentTime)
  gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + rampTime)

  // Hold the gain for the specified duration
  oscillator.start()
  oscillator.stop(audioContext.currentTime + duration)

  // Gradually ramp down the gain for 0.02 seconds after the specified duration
  gainNode.gain.setValueAtTime(1, audioContext.currentTime + duration)
  gainNode.gain.linearRampToValueAtTime(
    0,
    audioContext.currentTime + duration + rampTime
  )
}

const speak = (text: string) => {
  const utterance = new SpeechSynthesisUtterance(text)
  console.log(speechSynthesis.getVoices())
  utterance.voice = speechSynthesis.getVoices()[0]
  utterance.onerror = e => console.error(e)
  speechSynthesis.speak(utterance)
}

export { playTone, speak }
