import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchBar from '../components/SearchBar';

describe('SearchBar', () => {
  it('should render with placeholder', () => {
    render(<SearchBar value="" onChange={() => {}} />);
    const input = screen.getByPlaceholderText('🔍 搜索...');
    expect(input).toBeInTheDocument();
  });

  it('should display the current value', () => {
    render(<SearchBar value="test query" onChange={() => {}} />);
    const input = screen.getByDisplayValue('test query');
    expect(input).toBeInTheDocument();
  });

  it('should call onChange when user types', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<SearchBar value="" onChange={handleChange} />);

    const input = screen.getByPlaceholderText('🔍 搜索...');
    await user.type(input, 'hello');

    expect(handleChange).toHaveBeenCalledTimes(5);
    // userEvent types character by character
    expect(handleChange).toHaveBeenNthCalledWith(1, 'h');
    expect(handleChange).toHaveBeenNthCalledWith(5, 'o');
  });

  it('should have correct styling classes', () => {
    render(<SearchBar value="" onChange={() => {}} />);
    const input = screen.getByPlaceholderText('🔍 搜索...');
    expect(input).toHaveClass('bg-gray-100/80');
    expect(input).toHaveClass('rounded-lg');
  });
});
