import { render, screen, waitFor } from '../../test/utils';
import { ApplicantDashboard } from './Dashboard';
import { vi, expect, it, describe, beforeEach } from 'vitest';
import api from '../../lib/axios';

// Mock axios
vi.mock('../../lib/axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

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

describe('Applicant Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders applications and summary data correctly', async () => {
    const mockApps = [
      { id: 1, amount: 50000, tenureMonths: 12, status: 'APPROVED', createdAt: new Date().toISOString() },
      { id: 2, amount: 25000, tenureMonths: 6, status: 'PENDING', createdAt: new Date().toISOString() },
    ];
    const mockProfile = { isProfileComplete: true };

    (api.get as any).mockImplementation((url: string) => {
      if (url === '/applications/my') return Promise.resolve({ data: mockApps });
      if (url === '/auth/me') return Promise.resolve({ data: mockProfile });
      return Promise.reject(new Error('Unknown URL'));
    });

    render(<ApplicantDashboard />, { initialUser: mockUser });

    await waitFor(() => {
      expect(screen.getByText(/Total Requested Capital/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/75,000/)).toBeInTheDocument();
    expect(screen.getAllByText(/APPROVED/i).length).toBeGreaterThan(0);
  });

  it('shows profile completion alert when profile is incomplete', async () => {
    const mockApps: any[] = [];
    const mockProfile = { isProfileComplete: false };

    (api.get as any).mockImplementation((url: string) => {
      if (url === '/applications/my') return Promise.resolve({ data: mockApps });
      if (url === '/auth/me') return Promise.resolve({ data: mockProfile });
      return Promise.reject(new Error('Unknown URL'));
    });

    render(<ApplicantDashboard />, { initialUser: mockUser });

    await waitFor(() => {
      expect(screen.getByText(/Finish Setup Required/i)).toBeInTheDocument();
    });
  });
});
