import { useState, useEffect } from "react"

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

// Roughly how long speech can take before we stop waiting for it. Some
// browsers never fire `end` (e.g. when no voices are installed), which would
// otherwise leave the timer stuck waiting on an announcement forever.
const speechTimeoutMs = (text: string) => 1500 + text.length * 120

const speak = (text: string, voiceURI?: string) =>
  new Promise(resolve => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      clearTimeout(timeout)
      resolve(undefined)
    }
    const timeout = setTimeout(finish, speechTimeoutMs(text))

    const allVoices = speechSynthesis.getVoices()
    const defaultVoice = allVoices.find(v => v.default) as SpeechSynthesisVoice

    const utterance = new SpeechSynthesisUtterance(text)
    const voice = voiceURI
      ? allVoices.find(v => v.voiceURI === voiceURI) || defaultVoice
      : defaultVoice

    utterance.voice = voice

    utterance.onend = finish
    utterance.onerror = finish
    speechSynthesis.speak(utterance)
  })

const useVoices = () => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  useEffect(() => {
    setVoices(speechSynthesis.getVoices())
    speechSynthesis.addEventListener("voiceschanged", () => {
      setVoices(speechSynthesis.getVoices())
    })
  }, [])

  return voices
}

export { playTone, speak, useVoices }
