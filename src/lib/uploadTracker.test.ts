import { describe, it, expect, beforeEach } from 'vitest';
import {
  uploadStarted, uploadFinished, getUploadsInFlight, subscribeUploads, __resetUploadTracker,
} from './uploadTracker';

beforeEach(() => __resetUploadTracker());

describe('contador de subidas en curso', () => {
  it('cuenta las que empiezan y descuenta las que acaban', () => {
    uploadStarted(); uploadStarted();
    expect(getUploadsInFlight()).toBe(2);
    uploadFinished();
    expect(getUploadsInFlight()).toBe(1);
    uploadFinished();
    expect(getUploadsInFlight()).toBe(0);
  });

  it('nunca baja de cero aunque se descuente de más', () => {
    // Si se quedara en negativo, Guardar creería que hay subidas fantasma y
    // se bloquearía para siempre.
    uploadFinished(); uploadFinished();
    expect(getUploadsInFlight()).toBe(0);
    uploadStarted();
    expect(getUploadsInFlight()).toBe(1);
  });

  it('avisa a quien escucha, incluido el valor actual al suscribirse', () => {
    uploadStarted();
    const vistos: number[] = [];
    const baja = subscribeUploads(n => vistos.push(n));
    uploadStarted();
    uploadFinished();
    baja();
    uploadStarted(); // ya no debería llegar
    expect(vistos).toEqual([1, 2, 1]);
  });
});
