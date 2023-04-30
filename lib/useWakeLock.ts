import React, { useCallback, useEffect, useState } from "react"

const useWakeLock = () => {
  const [wakeLockEnabled, setWakeLockEnabled] = useState<boolean>(false)
  const [wakeLockSupported, setWakeLockSupported] = useState<boolean | null>(
    null
  )

  const wakeLockSentinel = React.useRef<WakeLockSentinel | null>(null)

  const enableWakeLock = useCallback(() => {
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
  }, [wakeLockSupported])

  const disableWakeLock = useCallback(() => {
    if (!wakeLockSentinel.current) return
    wakeLockSentinel.current?.release()
    setWakeLockEnabled(false)
  }, [])

  const toggleWakeLock = useCallback(() => {
    if (wakeLockEnabled) {
      disableWakeLock()
    } else {
      enableWakeLock()
    }
  }, [wakeLockEnabled, enableWakeLock, disableWakeLock])

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
