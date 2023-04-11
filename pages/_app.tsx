import type { AppProps } from "next/app"
import Head from "next/head"
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
        <Head>
          <title>Timer</title>
          <link rel="icon" href="/favicon.ico" />

          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black" />
          <meta name="apple-mobile-web-app-title" content="Timer" />
          <meta name="application-name" content="Timer" />
          <meta name="msapplication-TileColor" content="#000000" />
          <meta name="theme-color" content="#000000" />
        </Head>
        <Component {...pageProps} />
      </NextUIProvider>
    </NextThemesProvider>
  )
}
