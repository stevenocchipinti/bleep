import React, { useEffect, useState } from "react"

const useWakeLock = () => {
  const [wakeLockEnabled, setWakeLockEnabled] = useState<boolean>(false)
  const [wakeLockSupported, setWakeLockSupported] = useState<boolean | null>(
    null
  )

  const wakeLockSentinel = React.useRef<WakeLockSentinel | null>(null)

  const enableWakeLock = () => {
    if (!wakeLockSupported) return
    navigator.wakeLock
      .request("screen")
      .then(newWakeLock => {
        wakeLockSentinel.current = newWakeLock
        setWakeLockEnabled(true)
      })
      .catch(() => {
        console.error("Wake lock request failed")
      })
  }

  const disableWakeLock = () => {
    if (!wakeLockSentinel.current) return
    wakeLockSentinel.current?.release()
    setWakeLockEnabled(false)
  }

  const toggleWakeLock = () => {
    if (wakeLockEnabled) {
      disableWakeLock()
    } else {
      enableWakeLock()
    }
  }

  useEffect(() => {
    setWakeLockSupported("wakeLock" in navigator)
  }, [])

  return {
    wakeLockEnabled,
    wakeLockSupported,
    enableWakeLock,
    disableWakeLock,
    toggleWakeLock,
  }
}

export default useWakeLock
