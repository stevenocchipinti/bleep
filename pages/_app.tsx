import type { AppProps } from "next/app"
import Head from "next/head"
import {
  ChakraProvider,
  StyleFunctionProps,
  extendTheme,
  theme as defaultTheme,
} from "@chakra-ui/react"

import { TimerProvider } from "lib/useTimerMachine"

import "@fontsource/dancing-script"
import "@fontsource/commissioner"

const defaultButtonStyles = defaultTheme.components.Button

export const theme = extendTheme({
  config: {
    initialColorMode: "dark",
    useSystemColorMode: false,
  },
  styles: {
    global: {
      "*": {
        WebkitTapHighlightColor: "transparent",
      },
      "html, body, #__next, #__next > div": {
        height: "100%",
      },
    },
  },
  fonts: {
    heading: "'Commissioner', sans-serif",
    body: "'Commissioner', sans-serif",
  },

  // Sticky hover fix for all buttons
  // https://github.com/chakra-ui/chakra-ui/issues/6173
  components: {
    Button: {
      variants: {
        brand: (props: StyleFunctionProps) => ({
          color: "gray.800",
          bgGradient: "linear-gradient(to-br, teal.200, green.200)",
          _disabled: {
            bgGradient: "linear-gradient(to-br, teal.200, green.200)",
          },
          _hover: {
            bgGradient: "linear-gradient(to-tr, teal.200, green.200)",
            _disabled: {
              bgGradient: "linear-gradient(to-br, teal.200, green.200)",
            },
          },
          "@media(hover: none)": {
            _hover: {
              bgGradient: "linear-gradient(to-br, teal.200, green.200)",
            },
            _active: {
              bgGradient: "linear-gradient(to-tr, teal.200, green.200)",
            },
          },
        }),
        solid: (props: StyleFunctionProps) => ({
          "@media(hover: none)": {
            _hover: { bg: "transparent" },
            _active: {
              bg: defaultButtonStyles.variants?.solid(props)._hover.bg,
            },
          },
        }),
        outline: (props: StyleFunctionProps) => ({
          "@media(hover: none)": {
            _hover: { bg: "transparent" },
            _active: {
              bg: defaultButtonStyles.variants?.outline(props)._hover.bg,
            },
          },
        }),
        ghost: (props: StyleFunctionProps) => ({
          "@media(hover: none)": {
            _hover: { bg: "transparent" },
            _active: {
              bg: defaultButtonStyles.variants?.ghost(props)._hover.bg,
            },
          },
        }),
      },
    },
    IconButton: {
      variants: {
        solid: (props: StyleFunctionProps) => ({
          "@media(hover: none)": {
            _hover: { bg: "transparent" },
            _active: {
              bg: defaultButtonStyles.variants?.solid(props)._hover.bg,
            },
          },
        }),
        outline: (props: StyleFunctionProps) => ({
          "@media(hover: none)": {
            _hover: { bg: "transparent" },
            _active: {
              bg: defaultButtonStyles.variants?.outline(props)._hover.bg,
            },
          },
        }),
        ghost: (props: StyleFunctionProps) => ({
          "@media(hover: none)": {
            _hover: { bg: "transparent" },
            _active: {
              bg: defaultButtonStyles.variants?.ghost(props)._hover.bg,
            },
          },
        }),
      },
    },
  },
})

export default function App({ Component, pageProps }: AppProps) {
  return (
    <TimerProvider>
      <ChakraProvider theme={theme}>
        <Head>
          <title>Timer</title>
          <meta
            name="viewport"
            content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, user-scalable=no, viewport-fit=cover"
          />

          <link
            rel="apple-touch-icon"
            sizes="180x180"
            href="/apple-touch-icon.png"
          />
          <link
            rel="icon"
            type="image/png"
            sizes="32x32"
            href="/favicon-32x32.png"
          />
          <link
            rel="icon"
            type="image/png"
            sizes="16x16"
            href="/favicon-16x16.png"
          />
          <link rel="manifest" href="/site.webmanifest" />
          <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#4fd1c5" />

          <meta name="application-name" content="Bleep" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta
            name="apple-mobile-web-app-status-bar-style"
            content="default"
          />
          <meta name="apple-mobile-web-app-title" content="Bleep" />
          <meta
            name="description"
            content="An exercise timer that goes bleep!"
          />
          <meta name="format-detection" content="telephone=no" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta
            name="msapplication-config"
            content="/icons/browserconfig.xml"
          />
          <meta name="msapplication-TileColor" content="#4fd1c5" />
          <meta name="msapplication-tap-highlight" content="no" />
          <meta name="theme-color" content="#1a202c" />
        </Head>
        <Component {...pageProps} />
      </ChakraProvider>
    </TimerProvider>
  )
}
