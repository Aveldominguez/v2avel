"""Convierte el CSV de OurAirports en src/data/aeropuertos.txt.

Una línea por aeropuerto: IATA|OACI|nombre|ciudad|país. En texto plano y no
en JSON porque son 9.000 entradas y las comillas costarían 100 KB de nada.
"""
import csv, io, sys

if len(sys.argv) < 2:
    sys.exit('uso: python3 -I scripts/generar-aeropuertos.py <airports.csv>')

filas = []
with io.open(sys.argv[1], encoding='utf-8', newline='') as f:
    for r in csv.DictReader(f):
        iata = (r.get('iata_code') or '').strip().upper()
        if len(iata) != 3 or not iata.isalpha() or r.get('type') == 'closed':
            continue
        icao = (r.get('icao_code') or r.get('ident') or '').strip().upper()
        if len(icao) != 4 or not icao.isalnum():
            icao = ''
        nombre = (r.get('name') or '').strip().replace('|', '/')
        if not nombre:
            continue
        ciudad = (r.get('municipality') or '').strip().replace('|', '/')
        pais = (r.get('iso_country') or '').strip().upper()
        filas.append(f"{iata}|{icao}|{nombre}|{ciudad}|{pais}")

io.open('src/data/aeropuertos.txt', 'w', encoding='utf-8').write('\n'.join(sorted(filas)))
print(len(filas), 'aeropuertos')
