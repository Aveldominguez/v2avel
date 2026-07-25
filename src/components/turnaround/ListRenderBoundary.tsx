import { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props { children: ReactNode }
interface State { hasError: boolean }

/**
 * Red de seguridad local para la lista de escalas: si algo falla al
 * renderizar las filas (dato inesperado, etc.), muestra un aviso con
 * botón de reintentar en vez de dejar la sección en blanco sin explicación.
 */
export class ListRenderBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(err: unknown) {
    // eslint-disable-next-line no-console
    console.error('[ListRenderBoundary]', err);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground max-w-xs">
            No se pudo mostrar la lista de escalas. Tus datos no se han perdido.
          </p>
          <button
            onClick={this.handleRetry}
            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-semibold"
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
