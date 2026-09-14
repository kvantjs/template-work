import type { PageModule } from '@kvantjs/ryvax.js';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App.tsx';
import { ThemeProvider } from '../src/theme/ThemeContext';

export const getStaticProps = async () => ({});

const page: PageModule = {
  default() {
    return (
      <html lang="pt-BR" className="dark">
        <head>
          <meta charSet="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>FluxFlow — Workflow Engine SaaS</title>
          <meta name="description" content="Plataforma SaaS de automação visual no-code/low-code com editor de workflows, runners em sandbox, proteção SSRF e histórico de execuções." />
          <meta property="og:title" content="FluxFlow — Workflow Engine SaaS" />
          <meta property="og:description" content="Plataforma visual de automação de workflows construída com Ryvax.js." />
          <meta property="og:type" content="website" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
          <link rel="stylesheet" href="./styles.css" />
        </head>
        <body className="dark bg-zinc-950 text-zinc-100 antialiased">
          <div id="root">
            <MemoryRouter>
              <ThemeProvider>
                <App />
              </ThemeProvider>
            </MemoryRouter>
          </div>
          <script type="module" src="./client.js"></script>
        </body>
      </html>
    );
  },
};

export default page.default;
