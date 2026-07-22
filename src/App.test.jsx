import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

test('renders the dashboard heading', () => {
  // App now uses <Routes>, so it needs a router context to render.
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );
  const heading = screen.getByRole('heading', { name: /dashboard/i, level: 1 });
  expect(heading).toBeInTheDocument();
});
