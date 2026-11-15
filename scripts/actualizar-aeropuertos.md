# Actualizar la lista de aeropuertos

Los datos salen de **OurAirports**, de dominio público. Conviene rehacer el
fichero de vez en cuando; una vez al año sobra, porque los códigos IATA casi
no cambian.

```bash
curl -sL https://davidmegginson.github.io/ourairports-data/airports.csv -o /tmp/airports.csv
```

Y después, desde la raíz del proyecto:

```bash
python3 -I scripts/generar-aeropuertos.py /tmp/airports.csv
```

El CSV viene de fuera: se baja a /tmp, se lee con `python3 -I` (sin cargar
nada del directorio) y no se ejecuta nada de lo que venga dentro.
