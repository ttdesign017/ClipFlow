import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Settings from '../components/Settings';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';

const mockInvoke = invoke as ReturnType<typeof vi.fn>;

describe('Settings', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render settings panel with title', () => {
    mockInvoke.mockResolvedValue({ max_items: 50, auto_start: false });
    render(<Settings onClose={mockOnClose} />);

    expect(screen.getByText('设置')).toBeInTheDocument();
  });

  it('should load settings on mount', async () => {
    mockInvoke.mockResolvedValue({ max_items: 100, auto_start: true });
    render(<Settings onClose={mockOnClose} />);

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('get_settings');
    });
  });

  it('should display max items slider with current value', async () => {
    mockInvoke.mockResolvedValue({ max_items: 75, auto_start: false });
    render(<Settings onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('75 条')).toBeInTheDocument();
    });
  });

  it('should call update_settings when slider changes', async () => {
    mockInvoke.mockResolvedValue({ max_items: 50, auto_start: false });
    render(<Settings onClose={mockOnClose} />);

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('get_settings');
    });

    // Clear mocks after initial load
    vi.clearAllMocks();

    // Use fireEvent.change which properly triggers React's onChange
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '75' } });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('update_settings', { maxItems: 75 });
    });
  });

  it('should call set_auto_start when toggle clicked', async () => {
    mockInvoke.mockResolvedValue({ max_items: 50, auto_start: false });
    const user = userEvent.setup();
    render(<Settings onClose={mockOnClose} />);

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('get_settings');
    });

    vi.clearAllMocks();

    // Find the toggle button by its styling (the one with h-6 w-11 classes)
    const allButtons = screen.getAllByRole('button');
    const toggleButton = allButtons.find(btn => 
      btn.className.includes('h-6 w-11')
    ) || allButtons[1];
    
    await user.click(toggleButton);

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('set_auto_start', { enable: true });
    });
  });

  it('should call onClose when close button clicked', async () => {
    mockInvoke.mockResolvedValue({ max_items: 50, auto_start: false });
    const user = userEvent.setup();
    render(<Settings onClose={mockOnClose} />);

    const closeButton = screen.getByText('✕');
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should handle load settings error gracefully', async () => {
    mockInvoke.mockRejectedValue(new Error('Network error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<Settings onClose={mockOnClose} />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load settings:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });
});
