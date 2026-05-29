import { Component, ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean }

/**
 * Catches both chunk-load errors and generic render errors. It must never
 * auto-reload: on iOS PWA resume that created a reload loop and made the app
 * unusable. Showing a stable fallback keeps local data accessible.
 */
export class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(err: unknown) {
    // eslint-disable-next-line no-console
    console.error('[ChunkErrorBoundary]', err);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    window.dispatchEvent(new CustomEvent('app-resume'));
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
