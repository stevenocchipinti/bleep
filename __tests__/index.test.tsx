import { render, screen } from '@testing-library/react'
import { ChakraProvider } from '@chakra-ui/react'
import { TimerProvider } from 'lib/useTimerMachine'
import Home from '@/pages/index'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <TimerProvider celebration={() => {}}>
      <ChakraProvider>
        {children}
      </ChakraProvider>
    </TimerProvider>
  )
}

describe('Home', () => {
  it('renders a heading', () => {
    render(<Home />, { wrapper: AllTheProviders })

    const heading = screen.getByRole('heading', {
      name: /bleep!/i,
    })

    expect(heading).toBeInTheDocument()
  })
})
