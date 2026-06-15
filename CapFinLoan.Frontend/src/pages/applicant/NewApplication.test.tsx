import { render, screen, waitFor, fireEvent } from '../../test/utils';
import { NewApplication } from './NewApplication';
import { vi, expect, it, describe, beforeEach } from 'vitest';
import api from '../../lib/axios';

// Mock axios
vi.mock('../../lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual as any,
    useNavigate: () => mockNavigate,
  };
});

// Mock DashboardLayout
vi.mock('../../layouts/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="dashboard-layout">{children}</div>,
}));

const mockUser = {
  userId: 1,
  name: 'John Doe',
  email: 'john@example.com',
  role: 'APPLICANT' as const
};

describe('New Application Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders correctly and checks profile status', async () => {
    (api.get as any).mockResolvedValueOnce({ data: { isProfileComplete: true } });

    render(<NewApplication />, { initialUser: mockUser });

    expect(screen.getByText(/Configure Your Capital/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText(/Review & Draft Application/i)).toBeInTheDocument();
    });
  });

  it('updates amount display when slider is changed', async () => {
    (api.get as any).mockResolvedValueOnce({ data: { isProfileComplete: true } });

    render(<NewApplication />, { initialUser: mockUser });

    const amountSlider = await screen.findByLabelText(/Loan Amount/i);
    
    // Change amount to 50L (5,000,000)
    fireEvent.change(amountSlider, { target: { value: '5000000' } });
    
    await waitFor(() => {
      // Check for 50L formatted
      expect(screen.getByText(/50,00,000/)).toBeInTheDocument();
    });
  });

  it('redirects to profile if profile is incomplete', async () => {
    (api.get as any).mockResolvedValueOnce({ data: { isProfileComplete: false } });

    render(<NewApplication />, { initialUser: mockUser });

    await waitFor(() => {
      expect(screen.getByText(/Finish Setup Required/i)).toBeInTheDocument();
    });

    const submitButton = screen.getByText(/Complete Profile To Continue/i);
    expect(submitButton).toBeDisabled();
  });

  it('handles successful application creation', async () => {
    (api.get as any).mockResolvedValueOnce({ data: { isProfileComplete: true } });
    (api.post as any).mockResolvedValueOnce({ data: { id: 123 } });

    render(<NewApplication />, { initialUser: mockUser });

    await waitFor(() => {
      expect(screen.getByText(/Review & Draft Application/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Review & Draft Application/i));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/applications', {
        amount: 2500000,
        tenureMonths: 36
      });
      expect(mockNavigate).toHaveBeenCalledWith('/applications/123');
    });
  });
});
