import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { AdminDashboard } from './Dashboard';
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
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="admin-layout">{children}</div>,
}));

const mockUser = {
  userId: 999,
  name: 'Admin User',
  email: 'admin@capfinloan.com',
  role: 'ADMIN' as const
};

describe('Admin Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders summary statistics and application queue', async () => {
    const mockSummary = {
      totalRequestedAmount: 15000000, // 1.5 Cr
      totalApplications: 10,
      approvedCount: 5,
      rejectedCount: 2
    };

    const mockApps = [
      { id: 101, userId: 1, amount: 500000, tenureMonths: 24, status: 'UNDER_REVIEW', createdAt: new Date().toISOString() },
      { id: 102, userId: 2, amount: 100000, tenureMonths: 12, status: 'APPROVED', createdAt: new Date().toISOString() },
    ];

    const mockIdentifiers = [
      { userId: 1, name: 'John Applicant' },
      { userId: 2, name: 'Jane Applicant' }
    ];

    (api.get as any).mockImplementation((url: string) => {
      if (url === '/admin/reports/summary') return Promise.resolve({ data: mockSummary });
      if (url === '/admin/applications') return Promise.resolve({ data: mockApps });
      if (url.includes('/auth/users/identifiers')) return Promise.resolve({ data: mockIdentifiers });
      return Promise.reject(new Error('Unknown URL'));
    });

    render(<AdminDashboard />, { initialUser: mockUser });

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText(/1.5 Cr/i)).toBeInTheDocument();
    });

    // Check KPIs
    expect(screen.getByText('10')).toBeInTheDocument(); // Total Applications
    expect(screen.getByText('50.0%')).toBeInTheDocument(); // Approval Rate (5/10)

    // Check Queue table
    expect(screen.getByText(/John Applicant/i)).toBeInTheDocument();
    expect(screen.getByText(/Jane Applicant/i)).toBeInTheDocument();
    expect(screen.getByText(/UNDER REVIEW/i)).toBeInTheDocument();
    expect(screen.getByText(/APPROVED/i)).toBeInTheDocument();
  });

  it('filters application queue based on search term', async () => {
    const mockSummary = { totalRequestedAmount: 0, totalApplications: 2, approvedCount: 0, rejectedCount: 0 };
    const mockApps = [
      { id: 101, userId: 1, amount: 500000, tenureMonths: 24, status: 'UNDER_REVIEW', createdAt: new Date().toISOString() },
      { id: 102, userId: 2, amount: 100000, tenureMonths: 12, status: 'APPROVED', createdAt: new Date().toISOString() },
    ];
    const mockIdentifiers = [
      { userId: 1, name: 'John Applicant' },
      { userId: 2, name: 'Jane Applicant' }
    ];

    (api.get as any).mockImplementation((url: string) => {
      if (url === '/admin/reports/summary') return Promise.resolve({ data: mockSummary });
      if (url === '/admin/applications') return Promise.resolve({ data: mockApps });
      if (url.includes('/auth/users/identifiers')) return Promise.resolve({ data: mockIdentifiers });
      return Promise.reject(new Error('Unknown URL'));
    });

    render(<AdminDashboard />, { initialUser: mockUser });

    await screen.findByText(/John Applicant/i);

    const searchInput = screen.getByPlaceholderText(/Search applications/i);
    
    // Search for "Jane"
    fireEvent.change(searchInput, { target: { value: 'Jane' } });
    
    expect(screen.getByText(/Jane Applicant/i)).toBeInTheDocument();
    expect(screen.queryByText(/John Applicant/i)).not.toBeInTheDocument();

    // Search for non-existent
    fireEvent.change(searchInput, { target: { value: 'Zebra' } });
    expect(screen.getByText(/No applications match your search/i)).toBeInTheDocument();
  });
});
