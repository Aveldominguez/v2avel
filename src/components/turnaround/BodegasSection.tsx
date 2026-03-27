import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScanBarcode, Flashlight, X, Package } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { toast } from '@/hooks/use-toast';

interface BodegasData {
  f1: string;
  f2: string;
  f3: string;
  a1: string;
  a2: string;
  a3: string;
}

interface BodegasSectionProps {
  data: BodegasData;
  onChange: (data: BodegasData) => void;
}

type BodegaKey = keyof BodegasData;

const BODEGAS_FWD: { key: BodegaKey; label: string }[] = [
  { key: 'f1', label: 'F1' },
  { key: 'f2', label: 'F2' },
  { key: 'f3', label: 'F3' },
];

const BODEGAS_AFT: { key: BodegaKey; label: string }[] = [
  { key: 'a1', label: 'A1' },
  { key: 'a2', label: 'A2' },
  { key: 'a3', label: 'A3' },
];

const BodegasSection: React.FC<BodegasSectionProps> = ({ data, onChange }) => {
  const [scanning, setScanning] = useState<BodegaKey | null>(null);
  const [flashOn, setFlashOn] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'bodegas-scanner';

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch { /* ignore */ }
      try {
        scannerRef.current.clear();
      } catch { /* ignore */ }
      scannerRef.current = null;
    }
    setScanning(null);
    setFlashOn(false);
  }, []);

  const startScanner = useCallback(async (key: BodegaKey) => {
    // Stop any existing scanner
    if (scannerRef.current) {
      await stopScanner();
    }

    setScanning(key);

    // Wait for DOM to render the container
    await new Promise(r => setTimeout(r, 100));

    try {
      const scanner = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.PDF_417,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.AZTEC,
        ],
        useBarCodeDetectorIfSupported: true,
        verbose: false,
      } as any);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: { width: 300, height: 200 },
          aspectRatio: 1.5,
        },
        (decodedText) => {
          // Append scanned text to the field
          const current = data[key];
          const newValue = current ? `${current}\n${decodedText}` : decodedText;
          onChange({ ...data, [key]: newValue });
          toast({ title: 'Código escaneado', description: decodedText });
        },
        () => { /* ignore errors during scanning */ }
      );
    } catch (err) {
      console.error('Scanner error:', err);
      toast({
        title: 'Error de cámara',
        description: 'No se pudo acceder a la cámara. Verifica los permisos.',
        variant: 'destructive',
      });
      setScanning(null);
    }
  }, [data, onChange, stopScanner]);

  const toggleFlash = useCallback(async () => {
    if (!scannerRef.current) return;
    const newFlash = !flashOn;
    try {
      // Method 1: Use applyVideoConstraints (most cross-browser compatible)
      try {
        await (scannerRef.current as any).applyVideoConstraints({
          advanced: [{ torch: newFlash } as any],
        } as MediaTrackConstraints);
        setFlashOn(newFlash);
        return;
      } catch { /* fallback to method 2 */ }

      // Method 2: Direct track constraint (works on many Android browsers)
      try {
        const settings = (scannerRef.current as any).getRunningTrackSettings?.();
        if (settings) {
          const videoElement = document.querySelector(`#${scannerContainerId} video`) as HTMLVideoElement | null;
          const track = videoElement?.srcObject instanceof MediaStream
            ? videoElement.srcObject.getVideoTracks()[0]
            : null;
          if (track) {
            await track.applyConstraints({ advanced: [{ torch: newFlash } as any] });
            setFlashOn(newFlash);
            return;
          }
        }
      } catch { /* fallback to method 3 */ }

      // Method 3: getRunningTrackCameraCapabilities (works on iOS Safari)
      try {
        const caps = (scannerRef.current as any).getRunningTrackCameraCapabilities?.();
        if (caps?.torchFeature?.().isSupported()) {
          await caps.torchFeature().apply(newFlash);
          setFlashOn(newFlash);
          return;
        }
      } catch { /* no more fallbacks */ }

      toast({ title: 'Flash no disponible', description: 'Este dispositivo o navegador no soporta flash.', variant: 'destructive' });
    } catch {
      toast({ title: 'Flash no disponible', description: 'No se pudo activar el flash.', variant: 'destructive' });
    }
  }, [flashOn]);

  const handleFieldChange = (key: BodegaKey, value: string) => {
    onChange({ ...data, [key]: value });
  };

  const renderBodegaBlock = (bodega: { key: BodegaKey; label: string }) => (
    <div key={bodega.key} className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-mono font-bold text-base text-foreground">{bodega.label}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => {
            if (scanning === bodega.key) {
              stopScanner();
            } else {
              startScanner(bodega.key);
            }
          }}
        >
          <ScanBarcode className="h-4 w-4" />
          {scanning === bodega.key ? 'Detener' : 'Escanear'}
        </Button>
      </div>

      {scanning === bodega.key && (
        <div className="relative rounded-lg overflow-hidden border border-border bg-black">
          <div id={scannerContainerId} className="w-full" />
          <div className="absolute top-2 right-2 flex gap-2">
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="h-8 w-8 bg-black/60 hover:bg-black/80 text-white"
              onClick={toggleFlash}
            >
              <Flashlight className={`h-4 w-4 ${flashOn ? 'text-yellow-400' : ''}`} />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="h-8 w-8 bg-black/60 hover:bg-black/80 text-white"
              onClick={stopScanner}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Textarea
        value={data[bodega.key]}
        onChange={(e) => handleFieldChange(bodega.key, e.target.value)}
        placeholder={`Datos ${bodega.label}...`}
        className="min-h-[80px] resize-y font-mono text-sm"
      />
    </div>
  );

  return (
    <Card className="card-operational">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-lg">
          <div className="p-2 rounded-lg bg-accent/20">
            <Package className="h-5 w-5 text-accent" />
          </div>
          Bodegas AFT y FWD
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* FWD Section */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">FWD (Forward)</h3>
          {BODEGAS_FWD.map(renderBodegaBlock)}
        </div>

        {/* Spacer */}
        <div className="h-[60px]" />

        {/* AFT Section */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">AFT (Aft)</h3>
          {BODEGAS_AFT.map(renderBodegaBlock)}
        </div>
      </CardContent>
    </Card>
  );
};

export default BodegasSection;
