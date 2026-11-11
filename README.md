# Sommelier virtual Siñeriz

Aplicación local para tótem táctil, construida con Node.js sin dependencias npm. La experiencia está en español y está diseñada para una pantalla vertical de 1080 × 1920. Incluye carrusel automático de botellas, ayuda para elegir, catálogo con filtros y fichas con precio.

## Catálogo e imágenes

El catálogo se importó desde `vinos02.11.xlsx`: 633 vinos; los campos ausentes quedan vacíos y no se completan por inferencia. Las fotos se asocian mediante el nombre de archivo indicado en la columna AA. Se encontraron 383 códigos exactos entre `WEB PRODUCTS` y `FOTOS WEB`; 250 códigos no tienen un archivo coincidente en esas carpetas. La lista está en `fotos-faltantes-sineriz.csv`.

El sistema conserva el catálogo local en `data/catalog.json` y el estado en `data/state.json`. Las fotos del catálogo instaladas en `public/images` se sirven desde el equipo. La disponibilidad de stock debe confirmarse en tienda.

## Ejecutar

Requiere Node.js 20 o posterior.

```powershell
$env:ADMIN_PASSWORD = 'una-clave-larga'
$env:PORT = '4173'
node .\server.js
```

Abrí `http://localhost:4173`. En Windows, `Iniciar-Sommelier.bat` inicia el servidor y abre la aplicación. `Iniciar-Totem.bat` inicia la app en Edge a pantalla completa en modo kiosco. El paquete no cambia políticas ni ajustes de Edge ni de otros navegadores.

## Instalar en varios tótems Windows

1. Instala Node.js 20 o posterior en cada equipo.
2. Copia el ZIP a una memoria USB y extráelo en cada tótem.
3. Ejecuta `Instalar-Sommelier.bat` bajo el usuario de Windows del tótem.
4. El instalador copia la app en `%LOCALAPPDATA%\Sineriz\Sommelier` y crea accesos directos en el Escritorio y en el inicio de Windows. El acceso directo inicia `Iniciar-Totem.bat` a pantalla completa.

Para actualizar, extrae el nuevo ZIP y vuelve a ejecutar el instalador. Actualiza código y catálogo del paquete, y conserva `data/state.json`. Repite en cada tótem.

## Administración

Cinco toques sobre el logo abren la sección administrativa. Configura `ADMIN_PASSWORD` antes de iniciar el servidor. El panel permite revisar el estado del catálogo, sincronizar el listado del sitio de Siñeriz y ajustar el reinicio por inactividad. Para configurar la clave temporalmente desde PowerShell:

```powershell
$env:ADMIN_PASSWORD = 'una-clave-larga'
.\Iniciar-Sommelier.bat
```

La variable solo dura mientras siga abierta esa sesión de PowerShell. La API administrativa valida la clave en el servidor.

## Limitaciones

- La sincronización web es parcial; el Excel local es la fuente de catálogo instalada.
- No hay inventario en tiempo real; precios y disponibilidad se confirman en tienda.
- Para operación continua, usar una cuenta de Windows dedicada y configurar el inicio de la aplicación al encender el equipo.

## Buscador del sommelier

La búsqueda inteligente y las preguntas frecuentes funcionan dentro del equipo, con los datos guardados en `data/catalog.json`; no usan IA externa ni hacen consultas de puntuaciones. Reconocen nombres, bodegas, países, uvas, estilos y presupuestos en español y portugués. También permiten continuar una búsqueda con filtros previos o encontrar vinos de menor precio con uva o estilo coincidente desde una ficha.

Los límites «menos de» son estrictos y «hasta» incluye el importe indicado. Los vinos sin precio no se muestran como opciones para un presupuesto ni participan en los extremos de precio. El catálogo no contiene descriptores suficientes para clasificar de forma fiable suavidad, intensidad o maridajes; cuando se pregunta por ello, la interfaz lo indica y no los atribuye como datos del productor. Para consultas de asado se muestran tintos como punto de partida, explicitando que el catálogo no publica maridajes. Ninguna ficha implica confirmación de stock.

Las preguntas frecuentes son atajos al mismo buscador, no respuestas precargadas. Para ejecutar las pruebas esenciales del motor local:

```powershell
node --test
```
