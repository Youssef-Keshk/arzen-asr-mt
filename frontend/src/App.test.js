import { render, screen } from '@testing-library/react';
import App from './App';

test('renders VoiceBridge header', () => {
  render(<App />);
  const header = screen.getByText(/VoiceBridge/i);
  expect(header).toBeInTheDocument();
});
