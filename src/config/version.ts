// Auto-incremented on each publish (+0.1 per release)
export const APP_VERSION = '4.878';

// Changelog for the current version — update this with each meaningful change
export const APP_CHANGELOG: string[] = [
  "IMPORTANTE: quitar una foto de una escala ya no borra el archivo del servidor, sólo lo quita de la lista. Antes, si la protección antiborrado devolvía la foto a la escala —cosa que hace para que no se pierda nada—, el archivo ya no estaba y quedaba una foto rota que no se podía recuperar. Una hoja de carga no se repite.",
  "Arreglado: en una escala de sólo salida, la lista de escalas enseñaba únicamente las letras de la aerolínea («AD») y se comía el número del vuelo. Ahora sale el número de salida, que es el único que hay.",
];
