import type { AppProps } from "next/app"
import Head from "next/head"
import { ChakraProvider, extendTheme } from "@chakra-ui/react"

export const theme = extendTheme({
  config: {
    initialColorMode: "system",
    useSystemColorMode: true,
  },
  styles: {
    global: {
      "html, body, #__next, #__next > div": {
        height: "100%",
      },
    },
  },
})

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider theme={theme}>
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
    </ChakraProvider>
  )
}
