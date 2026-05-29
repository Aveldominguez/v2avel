import { Component, ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean }

const FLAG = 'chunk-reload-attempt';

const isChunkError = (err: unknown) => {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return /ChunkLoadError|Loading chunk|dynamically imported module|Importing a module script failed|Failed to fetch/i.test(msg);
};

export class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(err: unknown): State {
    if (isChunkError(err)) {
      try {
        if (!sessionStorage.getItem(FLAG)) {
          sessionStorage.setItem(FLAG, '1');
          window.location.reload();
          return { hasError: false };
        }
      } catch { /* ignore */ }
    }
    return { hasError: true };
  }

  componentDidCatch(err: unknown) {
    // eslint-disable-next-line no-console
    console.error('[ChunkErrorBoundary]', err);
  }

  handleRetry = () => {
    try { sessionStorage.removeItem(FLAG); } catch { /* ignore */ }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6 text-center gap-4">
          <h1 className="text-xl font-bold">No se pudo cargar la app</h1>
          <p className="text-sm text-muted-foreground max-w-sm">
            Hubo un problema al cargar los recursos. Pulsa reintentar.
          </p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-primary text-primary-foreground rounded font-semibold"
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
