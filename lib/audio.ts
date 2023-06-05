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

const speak = (text: string, voiceURI?: string) =>
  new Promise(resolve => {
    const allVoices = speechSynthesis.getVoices()
    const defaultVoice = allVoices.find(v => v.default) as SpeechSynthesisVoice

    const utterance = new SpeechSynthesisUtterance(text)
    const voice = voiceURI
      ? allVoices.find(v => v.voiceURI === voiceURI) || defaultVoice
      : defaultVoice

    utterance.voice = voice

    utterance.onend = resolve
    speechSynthesis.speak(utterance)
  })

// NOTE: Pretty sure this can't be cancelled
const speakCountdown = (seconds: number) =>
  new Promise<void>(async (resolve, reject) => {
    let secondsRemaining = seconds
    speak("Starting in").catch(reject)
    const interval = setInterval(() => {
      if (secondsRemaining === 0) {
        clearInterval(interval)
        resolve()
      } else {
        speak(`${secondsRemaining--}`).catch(reject)
      }
    }, 1000)
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

export { playTone, speak, speakCountdown, useVoices }
