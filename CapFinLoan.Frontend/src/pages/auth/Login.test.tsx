import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { Login } from './Login';
import { vi, expect, it, describe, beforeEach } from 'vitest';
import api from '../../lib/axios';

// Mock axios
vi.mock('../../lib/axios', () => ({
  default: {
    post: vi.fn(),
  },
}));

// Mock GoogleAuthButton
vi.mock('../../components/auth/GoogleAuthButton', () => ({
  GoogleAuthButton: () => <div data-testid="google-button">Google Sign In</div>,
}));

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form correctly', () => {
    render(<Login />);
    
    expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Secure Login$/i })).toBeInTheDocument();
    expect(screen.getByTestId('google-button')).toBeInTheDocument();
  });

  it('shows error for invalid email format', async () => {
    render(<Login />);
    
    const emailInput = screen.getByPlaceholderText(/Enter your email/i);

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.submit(screen.getByRole('form', { name: /login-form/i }));
    
    expect(await screen.findByText(/valid email address/i)).toBeInTheDocument();
  });

  it('handles successful login', async () => {
    const mockResponse = {
      data: {
        token: 'fake-token',
        userId: 1,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'APPLICANT'
      }
    };
    (api.post as any).mockResolvedValue(mockResponse);

    render(<Login />);
    
    fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /^Secure Login$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'john@example.com',
        password: 'password123'
      });
    });
  });

  it('handles login failure', async () => {
    const mockError = {
      response: {
        data: {
          title: 'Invalid credentials'
        }
      }
    };
    (api.post as any).mockRejectedValue(mockError);

    render(<Login />);
    
    fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), { target: { value: 'wrong@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /^Secure Login$/i }));

    expect(await screen.findByText(/Invalid credentials/i)).toBeInTheDocument();
  });
});
