import "@/styles/global.css"
import type { AppProps } from "next/app"
import { globalCss, createTheme, NextUIProvider } from "@nextui-org/react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

const lightTheme = createTheme({
  type: "light",
  theme: {
    colors: {
      background: "#eee",
      backgroundAlpha: "#dddddddd",
    },
  },
})

const darkTheme = createTheme({
  type: "dark",
})

const globalStyles = globalCss({
  "html, body, #__next, #__next > div": {
    height: "100%",
  },
})

export default function MyApp({ Component, pageProps }: AppProps) {
  globalStyles()

  return (
    <NextThemesProvider
      defaultTheme="system"
      attribute="class"
      value={{
        light: lightTheme.className,
        dark: darkTheme.className,
      }}
    >
      <NextUIProvider>
        <Component {...pageProps} />
      </NextUIProvider>
    </NextThemesProvider>
  )
}
