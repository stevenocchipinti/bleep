import React, { useEffect, useState } from "react"

const useWakeLock = () => {
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null)
  const [wakeLockSupported, setWakeLockSupported] = useState<boolean | null>(
    null
  )

  const enableWakeLock = () => {
    if (!wakeLockSupported) return
    navigator.wakeLock
      .request("screen")
      .then(newWakeLock => setWakeLock(newWakeLock))
      .catch(() => {
        console.error("Wake lock request failed")
      })
  }

  const disableWakeLock = () => {
    wakeLock?.release()
    setWakeLock(null)
  }

  const toggleWakeLock = () => {
    if (wakeLock) {
      disableWakeLock()
    } else {
      enableWakeLock()
    }
  }

  useEffect(() => {
    setWakeLockSupported("wakeLock" in navigator)
  }, [])

  return {
    wakeLock,
    wakeLockSupported,
    enableWakeLock,
    disableWakeLock,
    toggleWakeLock,
  }
}

export default useWakeLock
