import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

test('renders the dashboard heading', () => {
  // "/" is the login page now, so start the router at /dashboard.
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <App />
    </MemoryRouter>
  );
  const heading = screen.getByRole('heading', { name: /dashboard/i, level: 1 });
  expect(heading).toBeInTheDocument();
});
