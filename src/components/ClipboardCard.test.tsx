import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClipboardCard from '../components/ClipboardCard';
import { ClipboardItem } from '../types';

// Mock @dnd-kit/core
vi.mock('@dnd-kit/core', () => ({
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false,
  }),
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('ClipboardCard', () => {
  const mockTextItem: ClipboardItem = {
    id: 'test-id-1',
    kind: { Text: { content: 'Hello, this is a test clipboard item!' } },
    timestamp: Date.now() - 5 * 60 * 1000,
    preview: 'Hello, this is a test clipboard item!',
    pinned: false,
  };

  const mockImageItem: ClipboardItem = {
    id: 'test-id-2',
    kind: { Image: { path: '/test/path.png', width: 1920, height: 1080 } },
    timestamp: Date.now() - 10 * 60 * 1000,
    preview: '图片 1920x1080',
    pinned: false,
  };

  const mockOnCopy = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render text item with preview', () => {
    render(<ClipboardCard item={mockTextItem} onCopy={mockOnCopy} />);

    expect(screen.getByText('Hello, this is a test clipboard item!')).toBeInTheDocument();
  });

  it('should show relative time', () => {
    render(<ClipboardCard item={mockTextItem} onCopy={mockOnCopy} />);

    expect(screen.getByText('5 分钟前')).toBeInTheDocument();
  });

  it('should render copy button', () => {
    render(<ClipboardCard item={mockTextItem} onCopy={mockOnCopy} />);

    expect(screen.getByText('📋 复制')).toBeInTheDocument();
  });

  it('should call onCopy when copy button clicked', async () => {
    const user = userEvent.setup();
    render(<ClipboardCard item={mockTextItem} onCopy={mockOnCopy} />);

    const copyButton = screen.getByText('📋 复制');
    await user.click(copyButton);

    expect(mockOnCopy).toHaveBeenCalledWith('Hello, this is a test clipboard item!');
  });

  it('should not render for image items', () => {
    const { container } = render(<ClipboardCard item={mockImageItem} onCopy={mockOnCopy} />);

    expect(container.firstChild).toBeNull();
  });

  it('should have grab cursor styling', () => {
    render(<ClipboardCard item={mockTextItem} onCopy={mockOnCopy} />);

    // The outer div has the cursor-grab class
    const card = screen.getByText('Hello, this is a test clipboard item!').closest('[class*="cursor-grab"]');
    expect(card).toBeInTheDocument();
  });
});
