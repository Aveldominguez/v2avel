import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BandaAvisos } from './BandaAvisos';
import { ConnectionStatus } from './ConnectionStatus';

/*
 * La píldora de conexión lee el estado global del vigilante de red. En una
 * prueba no hay red de verdad, así que se dice a mano qué debe creer.
 */
const estado = vi.hoisted(() => ({ connectivity: 'online' as 'online' | 'offline' | 'unreachable' }));
vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => estado,
}));

describe('BandaAvisos', () => {
  beforeEach(() => { estado.connectivity = 'online'; });

  it('con todo en orden no ocupa ni un píxel', () => {
    // Lo contrario sería una barra permanente diciendo «todo bien», robando
    // altura en un formulario que se usa con el avión delante.
    const { container } = render(<BandaAvisos isOnline pendingCount={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('cuenta los cambios por subir cuando hay cobertura', () => {
    render(<BandaAvisos isOnline pendingCount={3} />);
    expect(screen.getByText(/3 cambios por subir/)).toBeInTheDocument();
    expect(screen.getByText(/subiendo solos/)).toBeInTheDocument();
  });

  it('en singular no dice «1 cambios»', () => {
    render(<BandaAvisos isOnline pendingCount={1} />);
    expect(screen.getByText(/1 cambio por subir/)).toBeInTheDocument();
  });

  it('sin servidor avisa y dice que lo pendiente se enviará solo', () => {
    estado.connectivity = 'unreachable';
    render(<BandaAvisos isOnline={false} pendingCount={2} />);
    expect(screen.getByText(/Sin servidor/)).toBeInTheDocument();
    expect(screen.getByText(/se enviarán al volver la cobertura/)).toBeInTheDocument();
  });
});

describe('ConnectionStatus', () => {
  /*
   * Todo este componente existe por un fallo: cuando crecía al fallar la red,
   * empujaba el botón de Guardar fuera de la pantalla. O sea que el botón
   * desaparecía justo cuando más falta hacía. Su hueco no puede cambiar de
   * tamaño pase lo que pase.
   */
  const anchos = (ui: React.ReactElement) => {
    const { container } = render(ui);
    const caja = container.firstElementChild as HTMLElement;
    return caja.className;
  };

  it('ocupa siempre el mismo hueco, haya lo que haya', () => {
    const casos = [
      <ConnectionStatus key="a" isOnline syncing={false} pendingCount={0} lastSaved={null} />,
      <ConnectionStatus key="b" isOnline syncing pendingCount={0} lastSaved={null} />,
      <ConnectionStatus key="c" isOnline={false} syncing={false} pendingCount={9} lastSaved={null} />,
      <ConnectionStatus key="d" isOnline syncing={false} pendingCount={0} lastSaved={new Date()} />,
    ];
    for (const caso of casos) {
      const clases = anchos(caso);
      expect(clases).toContain('w-5');
      expect(clases).toContain('shrink-0');
    }
  });

  it('nunca pinta texto visible en la cabecera', () => {
    // El texto era lo que medía 110px y empujaba el botón. El detalle se
    // cuenta en la franja de abajo, que para eso tiene todo el ancho.
    const { container } = render(
      <ConnectionStatus isOnline={false} syncing={false} pendingCount={4} lastSaved={null} />,
    );
    const visible = Array.from(container.querySelectorAll('span'))
      .filter(s => !s.className.includes('sr-only'));
    expect(visible).toHaveLength(0);
  });

  it('sin servidor cuenta en el title lo que queda por subir', () => {
    const { container } = render(
      <ConnectionStatus isOnline={false} syncing={false} pendingCount={4} lastSaved={null} />,
    );
    expect((container.firstElementChild as HTMLElement).title).toMatch(/4 cambios por subir/);
  });
});
