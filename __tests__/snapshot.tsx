import { render } from '@testing-library/react'
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

it('renders homepage unchanged', () => {
  const { container } = render(<Home />, { wrapper: AllTheProviders })
  expect(container).toMatchSnapshot()
})
