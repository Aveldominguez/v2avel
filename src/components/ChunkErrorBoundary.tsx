import { Component, ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean }

const CHUNK_FLAG = 'chunk-reload-attempt';
const GENERIC_FLAG = 'app-reload-attempt';

const isChunkError = (err: unknown) => {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return /ChunkLoadError|Loading chunk|dynamically imported module|Importing a module script failed|Failed to fetch/i.test(msg);
};

/**
 * Catches both chunk-load errors (typical after SW updates or iOS PWA resume)
 * AND generic render errors. On the first failure it tries a single reload to
 * recover; if it fails again it shows a Retry UI instead of a blank screen so
 * the user never loses access to the app.
 */
export class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(err: unknown): State {
    const flag = isChunkError(err) ? CHUNK_FLAG : GENERIC_FLAG;
    try {
      if (!sessionStorage.getItem(flag)) {
        sessionStorage.setItem(flag, '1');
        // Defer the reload so React can finish committing the error state,
        // avoiding loops where reload happens before the SW serves new chunks.
        setTimeout(() => { window.location.reload(); }, 50);
        return { hasError: false };
      }
    } catch { /* ignore */ }
    return { hasError: true };
  }

  componentDidCatch(err: unknown) {
    // eslint-disable-next-line no-console
    console.error('[ChunkErrorBoundary]', err);
  }

  handleRetry = () => {
    try {
      sessionStorage.removeItem(CHUNK_FLAG);
      sessionStorage.removeItem(GENERIC_FLAG);
    } catch { /* ignore */ }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6 text-center gap-4">
          <h1 className="text-xl font-bold">No se pudo cargar la app</h1>
          <p className="text-sm text-muted-foreground max-w-sm">
            Hubo un problema al cargar la aplicación. Tus datos guardados localmente están a salvo. Pulsa reintentar.
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
