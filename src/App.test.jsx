import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the dashboard heading', () => {
  render(<App />);
  const heading = screen.getByRole('heading', { name: /dashboard/i, level: 1 });
  expect(heading).toBeInTheDocument();
});
