import { render, screen, fireEvent, waitFor } from '../test/utils';
import { ChatBot } from './ChatBot';
import { vi, expect, it, describe, beforeEach } from 'vitest';
import api from '../lib/axios';

// Mock axios
vi.mock('../lib/axios', () => ({
  default: {
    post: vi.fn(),
  },
}));

// Mock ReactMarkdown
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

const mockUser = {
  userId: 1,
  name: 'Test User',
  email: 'test@example.com',
  role: 'APPLICANT' as const
};

describe('ChatBot Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders trigger button initially', () => {
    render(<ChatBot />, { initialUser: mockUser });
    expect(screen.getByLabelText(/Open AI Assistant/i)).toBeInTheDocument();
  });

  it('toggles chat window when trigger is clicked', async () => {
    render(<ChatBot />, { initialUser: mockUser });
    const trigger = screen.getByLabelText(/Open AI Assistant/i);
    
    fireEvent.click(trigger);
    
    expect(await screen.findByText(/AI Assistant/i)).toBeInTheDocument();
    expect(screen.getByText(/Hi! I'm the CapFinLoan Assistant/i)).toBeInTheDocument();
  });

  it('handles sending a message and receiving a reply', async () => {
    const mockReply = "I can help with that. Your application is under review.";
    (api.post as any).mockResolvedValueOnce({ data: { reply: mockReply } });

    render(<ChatBot />, { initialUser: mockUser });
    fireEvent.click(screen.getByLabelText(/Open AI Assistant/i));

    const input = await screen.findByPlaceholderText(/Ask anything about your loan/i);

    fireEvent.change(input, { target: { value: 'What is my status?' } });

    // Wait for the send button to become enabled after input change
    const sendButton = await screen.findByRole('button', { name: /send/i });
    fireEvent.click(sendButton);

    // User message appears in the chat
    await waitFor(() => {
      expect(screen.getByText('What is my status?')).toBeInTheDocument();
    });

    // Bot reply appears (rendered inside ReactMarkdown mock as data-testid="markdown")
    await waitFor(() => {
      const markdownDivs = screen.getAllByTestId('markdown');
      const replyDiv = markdownDivs[markdownDivs.length - 1];
      expect(replyDiv).toHaveTextContent(mockReply);
    });
  });

  it('handles API failure gracefully', async () => {
    (api.post as any).mockRejectedValueOnce(new Error('Network Error'));

    render(<ChatBot />, { initialUser: mockUser });
    fireEvent.click(screen.getByLabelText(/Open AI Assistant/i));

    const input = await screen.findByPlaceholderText(/Ask anything about your loan/i);
    fireEvent.change(input, { target: { value: 'Help' } });

    const sendButton = await screen.findByRole('button', { name: /send/i });
    fireEvent.click(sendButton);

    // Error message is rendered inside ReactMarkdown mock
    await waitFor(() => {
      const markdownDivs = screen.getAllByTestId('markdown');
      const errorDiv = markdownDivs.find(el =>
        el.textContent?.includes('AI assistant is temporarily unavailable')
      );
      expect(errorDiv).toBeTruthy();
    });
  });
});
