const { execSync } = require("child_process")

const withPWA = require("next-pwa")({
  dest: "public",
})

// Identifies the running build, so an out of date PWA can be spotted
const commit = () => {
  if (process.env.VERCEL_GIT_COMMIT_SHA)
    return process.env.VERCEL_GIT_COMMIT_SHA
  try {
    return execSync("git rev-parse HEAD").toString().trim()
  } catch {
    return "unknown"
  }
}

module.exports = withPWA({
  env: {
    NEXT_PUBLIC_BUILD_COMMIT: commit().slice(0, 7),
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
})
