import { StrictMode, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from '@specter/ui';
import './styles.css';

/** Mounts a surface's root component with the global styles and an error boundary. */
export function mount(App: ComponentType): void {
  const root = document.getElementById('root');
  if (!root) return;
  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}
