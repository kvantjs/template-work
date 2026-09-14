import { installHmr, mount } from '@kvantjs/ryvax.js/client';
import { MemoryRouter } from 'react-router-dom';
import App from './App.tsx';
import { ThemeProvider } from './theme/ThemeContext';

installHmr();

mount(
  <MemoryRouter>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </MemoryRouter>,
  '#root',
);
