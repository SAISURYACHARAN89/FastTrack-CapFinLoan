import { render, screen, waitFor, fireEvent } from '../../test/utils';
import { ApplicantProfile } from './Profile';
import { vi, expect, it, describe, beforeEach } from 'vitest';
import api from '../../lib/axios';

// Mock axios
vi.mock('../../lib/axios', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
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

describe('Applicant Profile Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders correctly and loads existing profile data', async () => {
    const mockProfile = {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      mobileNumber: '9876543210',
      address: '123 Street',
      dateOfBirth: '1990-01-01',
      employmentStatus: 'SALARIED',
      bankName: 'HDFC Bank',
      bankAccountNumber: '1234567890',
      ifscCode: 'HDFC0001234',
      annualIncome: 500000,
      profilePhotoDataUrl: 'data:image/png;base64,xxx',
      isProfileComplete: true
    };

    (api.get as any).mockResolvedValueOnce({ data: mockProfile });

    render(<ApplicantProfile />, { initialUser: mockUser });

    await waitFor(() => {
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('9876543210')).toBeInTheDocument();
    expect(screen.getByDisplayValue('123 Street')).toBeInTheDocument();
  });

  it('validates mobile number and IFSC code before saving', async () => {
    (api.get as any).mockResolvedValueOnce({ data: { name: 'John', email: 'j@e.com', isProfileComplete: false } });

    render(<ApplicantProfile />, { initialUser: mockUser });

    await waitFor(() => {
      expect(screen.getByText(/Complete Your Profile/i)).toBeInTheDocument();
    });

    const mobileInput = screen.getByPlaceholderText(/10-digit number/i);
    fireEvent.change(mobileInput, { target: { value: '123' } });
    
    const form = screen.getByTestId('profile-form');
    fireEvent.submit(form);

    expect(await screen.findByText(/Mobile number must be 10 digits/i)).toBeInTheDocument();

    fireEvent.change(mobileInput, { target: { value: '9876543210' } });
    
    const ifscInput = screen.getByPlaceholderText(/SBIN0001234/i);
    fireEvent.change(ifscInput, { target: { value: 'ABCD123' } });
    
    fireEvent.submit(form);
    expect(await screen.findByText(/Enter a valid IFSC code/i)).toBeInTheDocument();
  });

  it('handles successful profile update validation error for photo', async () => {
    (api.get as any).mockResolvedValueOnce({ data: { name: 'John', email: 'j@e.com', isProfileComplete: false } });

    render(<ApplicantProfile />, { initialUser: mockUser });

    await waitFor(() => {
      expect(screen.getByText(/Complete Your Profile/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/10-digit number/i), { target: { value: '9876543210' } });
    fireEvent.change(screen.getByPlaceholderText(/Residential address/i), { target: { value: '123 Test St' } });
    fireEvent.change(screen.getByLabelText(/Date of Birth/i), { target: { value: '1995-05-15' } });
    fireEvent.change(screen.getByPlaceholderText(/e.g. 850000/i), { target: { value: '600000' } });
    fireEvent.change(screen.getByPlaceholderText(/Digits only/i), { target: { value: '123456789012' } });
    fireEvent.change(screen.getByPlaceholderText(/SBIN0001234/i), { target: { value: 'HDFC0004567' } });
    
    fireEvent.change(screen.getByLabelText(/Employment Status/i), { target: { value: 'SALARIED' } });
    fireEvent.change(screen.getByLabelText(/Bank/i), { target: { value: 'HDFC Bank' } });

    const form = screen.getByTestId('profile-form');
    fireEvent.submit(form);

    expect(await screen.findByText(/Please upload your profile photo/i)).toBeInTheDocument();
  });
});
