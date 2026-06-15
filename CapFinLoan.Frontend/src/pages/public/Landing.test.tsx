import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Landing } from './Landing';
import { vi, expect, it, describe } from 'vitest';

// Mock Three.js and related fiber/drei components as jsdom doesn't support WebGL
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="canvas">{children}</div>,
  useFrame: () => {},
}));

vi.mock('@react-three/drei', () => ({
  Environment: () => <div data-testid="environment" />,
  Float: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  MeshDistortMaterial: () => <div data-testid="material" />,
}));

describe('Landing Page', () => {
  it('renders the hero title correctly', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );

    expect(screen.getByText(/Your Streamlined/i)).toBeInTheDocument();
    expect(screen.getByText(/Path to Capital/i)).toBeInTheDocument();
  });

  it('renders navigation buttons', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  it('renders the 3D canvas container', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );

    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });

  it('renders features section', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );

    expect(screen.getByText(/Designed for speed & transparency/i)).toBeInTheDocument();
    expect(screen.getByText(/Instant Decisions/i)).toBeInTheDocument();
  });
});
