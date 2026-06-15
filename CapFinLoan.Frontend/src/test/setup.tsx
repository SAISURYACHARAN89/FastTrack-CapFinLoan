import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock IntersectionObserver
class IntersectionObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
window.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver;

// Mock ResizeObserver
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

// Mock scrollIntoView as it's missing in jsdom
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Framer Motion mock — renders real HTML elements so aria-label, onClick, etc. are preserved
vi.mock('framer-motion', () => {
  const React = require('react');

  // Passthrough for wrapper components that don't map to an HTML tag
  const passthrough = ({ children }: { children?: unknown }) => children;

  // For motion.div, motion.button, motion.span etc. — render the real HTML element
  // and forward ALL props (aria-label, onClick, className, style, disabled, etc.)
  // but strip framer-specific props that would cause React warnings
  const FRAMER_PROPS = new Set([
    'animate', 'initial', 'exit', 'transition', 'variants',
    'whileHover', 'whileTap', 'whileFocus', 'whileDrag', 'whileInView',
    'layout', 'layoutId', 'drag', 'dragConstraints', 'dragElastic',
    'onAnimationStart', 'onAnimationComplete', 'onDragStart', 'onDragEnd',
  ]);

  const makeMotionComponent = (tag: string) =>
    ({ children, ...props }: Record<string, unknown>) => {
      const htmlProps: Record<string, unknown> = {};
      for (const key of Object.keys(props)) {
        if (!FRAMER_PROPS.has(key)) {
          htmlProps[key] = props[key];
        }
      }
      return React.createElement(tag, htmlProps, children);
    };

  const motionHandler: ProxyHandler<object> = {
    get: (_target, prop: string) => makeMotionComponent(prop),
  };

  return {
    motion: new Proxy({}, motionHandler),
    AnimatePresence: passthrough,
    MotionConfig: passthrough,
    LayoutGroup: passthrough,
    useAnimation: () => ({ start: vi.fn(), stop: vi.fn() }),
    useInView: () => [vi.fn(), true],
    useScroll: () => ({ scrollYProgress: { onChange: vi.fn() } }),
    useSpring: (val: unknown) => val,
    useTransform: (val: unknown) => val,
    useMotionValue: (initial: unknown) => ({ get: () => initial, set: vi.fn() }),
  };
});
