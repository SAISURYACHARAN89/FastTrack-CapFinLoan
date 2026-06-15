import { render, type RenderOptions } from '@testing-library/react';
import { type ReactElement, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, type User } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { MotionConfig } from 'framer-motion';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialUser?: User | null;
  initialRoute?: string;
}

const customRender = (
  ui: ReactElement,
  { initialUser = null, initialRoute = '/', ...options }: CustomRenderOptions = {}
) => {
  if (initialUser) {
    localStorage.setItem('capfinloan_user', JSON.stringify(initialUser));
    localStorage.setItem('capfinloan_token', 'mock-token');
  } else {
    localStorage.removeItem('capfinloan_user');
    localStorage.removeItem('capfinloan_token');
  }

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <ThemeProvider>
      <AuthProvider>
        <MotionConfig transition={{ duration: 0 }}>
          <MemoryRouter initialEntries={[initialRoute]}>
            {children}
          </MemoryRouter>
        </MotionConfig>
      </AuthProvider>
    </ThemeProvider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};

export * from '@testing-library/react';
export { customRender as render };
