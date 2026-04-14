import { render, screen } from '@testing-library/react';
import ImageGrid from '../components/ImageGrid';
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
}));

// Mock Tauri convertFileSrc
vi.mock('@tauri-apps/api/core', () => ({
  convertFileSrc: (path: string) => `asset://${path}`,
}));

describe('ImageGrid', () => {
  const mockImageItems: ClipboardItem[] = [
    {
      id: 'img-1',
      kind: { Image: { path: '/temp/ClipFlow/images/img-1.png', width: 1920, height: 1080 } },
      timestamp: Date.now() - 5 * 60 * 1000,
      preview: '图片 1920x1080',
    },
    {
      id: 'img-2',
      kind: { Image: { path: '/temp/ClipFlow/images/img-2.png', width: 800, height: 600 } },
      timestamp: Date.now() - 10 * 60 * 1000,
      preview: '图片 800x600',
    },
  ];

  it('should render empty state when no images', () => {
    render(<ImageGrid items={[]} />);

    expect(screen.getByText('暂无图片历史')).toBeInTheDocument();
  });

  it('should render image cards with dimensions', () => {
    render(<ImageGrid items={mockImageItems} />);

    // Use getAllByText since dimensions appear in both thumbnail and preview
    expect(screen.getAllByText('1920x1080')).toHaveLength(2);
    expect(screen.getAllByText('800x600')).toHaveLength(2);
  });

  it('should render images with correct alt text', () => {
    render(<ImageGrid items={mockImageItems} />);

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(4); // 2 thumbnails + 2 previews

    // Check that alt text includes dimensions
    const firstImage = images[0];
    expect(firstImage).toHaveAttribute('alt', expect.stringMatching(/\d+x\d+/));
  });

  it('should render timestamp for each image', () => {
    render(<ImageGrid items={mockImageItems} />);

    expect(screen.getAllByText('5 分钟前')).toHaveLength(1);
    expect(screen.getAllByText('10 分钟前')).toHaveLength(1);
  });

  it('should apply grid layout', () => {
    render(<ImageGrid items={mockImageItems} />);

    // Get the first dimension text and find its closest grid parent
    const dimText = screen.getAllByText('1920x1080')[0];
    const grid = dimText.closest('.grid');
    expect(grid).toHaveClass('grid-cols-2');
  });

  it('should handle images with no path gracefully', () => {
    const imageWithNoPath: ClipboardItem = {
      id: 'img-3',
      kind: { Image: { path: '', width: 640, height: 480 } },
      timestamp: Date.now(),
      preview: '图片 640x480',
    };

    render(<ImageGrid items={[imageWithNoPath]} />);

    expect(screen.getAllByText('640x480')).toHaveLength(2);
    expect(screen.getByText('🖼️')).toBeInTheDocument();
  });
});
