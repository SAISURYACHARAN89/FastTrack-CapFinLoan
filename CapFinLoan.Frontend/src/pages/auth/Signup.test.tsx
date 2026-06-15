import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { Signup } from './Signup';
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
  GoogleAuthButton: () => <div data-testid="google-button">Google Sign Up</div>,
}));

describe('Signup Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders signup form correctly', () => {
    render(<Signup />);
    
    expect(screen.getByText(/Create Account/i)).toBeInTheDocument();
    expect(screen.getByText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Verify Email$/i })).toBeInTheDocument();
  });

  it('handles OTP request and verification flow', async () => {
    (api.post as any).mockResolvedValueOnce({}); // Request OTP success
    (api.post as any).mockResolvedValueOnce({ data: { verificationToken: 'v-token' } }); // Verify OTP success

    render(<Signup />);
    
    // 1. Enter email and request OTP
    fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /^Verify Email$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/signup/request-otp', { email: 'test@example.com' });
      expect(screen.getByText(/OTP sent to your email/i)).toBeInTheDocument();
    });

    // 2. Enter OTP and confirm
    const otpInput = screen.getByPlaceholderText('000000');
    fireEvent.change(otpInput, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm OTP/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/signup/verify-otp', { email: 'test@example.com', otp: '123456' });
      expect(screen.getByText(/Email verified successfully/i)).toBeInTheDocument();
    });
  });

  it('handles complete signup after OTP verification', async () => {
    // Already verified state simulation (partial)
    (api.post as any).mockResolvedValueOnce({}); // Request OTP
    (api.post as any).mockResolvedValueOnce({ data: { verificationToken: 'v-token' } }); // Verify OTP
    (api.post as any).mockResolvedValueOnce({}); // Final Signup

    render(<Signup />);
    
    // Fill basic info
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByPlaceholderText(/Enter your email/i), { target: { value: 'jane@example.com' } });
    
    // Request OTP
    fireEvent.click(screen.getByRole('button', { name: /^Verify Email$/i }));
    await screen.findByText(/OTP sent to your email/i);

    // Verify OTP
    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm OTP/i }));
    await screen.findByText(/Email verified successfully/i);

    // Fill password and submit
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Complete Signup/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/signup', {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password123',
        otpVerificationToken: 'v-token'
      });
    });
  });
});
