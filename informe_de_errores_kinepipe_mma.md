# Informe Técnico de Diagnóstico y Resolución de Errores
**Proyecto:** KinePipe MMA (Markless Motion Analyser)  
**Dirección y Desarrollo:** Klgo. Felipe Vargas Ríos (`@kinepipe`)  
**Entorno de Ejecución:** Windows (x86_64) | Python 3.10 (gestionado con `uv`) | FastAPI + Uvicorn + Vite Frontend  
**Fecha del Informe:** 21 de octubre de 2026  

---

## 1. Resumen Ejecutivo

Durante la ejecución de **KinePipe MMA** tanto en su modalidad de ventana nativa de escritorio como mediante el servidor web local (`http://127.0.0.1:8000`), se identificaron dos eventos de error en la consola de salida. 

El análisis de las trazas confirma que **el servidor backend (Uvicorn) y la carga de la interfaz gráfica operan correctamente**, pero existen dos situaciones independientes con distinto nivel de criticidad:

| ID | Error Detectado | Componente | Severidad | Impacto en la Aplicación |
| :--- | :--- | :--- | :--- | :--- |
| **INC-01** | `ModuleNotFoundError: No module named 'ultralytics'` | `Sports2DAdapter` (`/api/tracking/run`) | **ALTA (Bloqueante)** | Impide la ejecución del análisis biomecánico y tracking de pose con YOLOv8-pose. |
| **INC-02** | `ConnectionResetError: [WinError 10054]` en `_ProactorBasePipeTransport` | `asyncio` / Streaming de Video (`206 Partial Content`) | **BAJA (Cosmético)** | No interrumpe el funcionamiento ni el video; únicamente contamina los registros (logs) de la consola en Windows. |

---

## 2. Análisis Detallado de Incidentes

### INC-01: Falta de dependencia `ultralytics` en el motor de Tracking (Crítico)

#### Evidencia en consola
```text
[Sports2DAdapter] Error loading YOLOv8-pose: No module named 'ultralytics'
INFO: 127.0.0.1:56918 - "POST /api/tracking/run HTTP/1.1" 200 OK
```

#### Causa Raíz
Cuando el usuario solicita procesar un video mediante el endpoint `POST /api/tracking/run`, el módulo `Sports2DAdapter` intenta importar el paquete `ultralytics` para inicializar el modelo de estimación de postura **YOLOv8-pose**. Dicho paquete no se encuentra instalado dentro del entorno virtual actual de Python 3.10 administrado por `uv`.  
*(Nota: El endpoint responde `200 OK` porque la excepción es capturada internamente por el adaptador, pero el procesamiento biomecánico se aborta).*

#### Solución Paso a Paso
1. Detener la ejecución actual del servidor en la terminal presionando `CTRL + C`.
2. Instalar la librería `ultralytics` dentro del entorno de `uv` ejecutando uno de los siguientes comandos en la raíz del proyecto:

```bash
# Opción recomendada si el proyecto cuenta con pyproject.toml:
uv add ultralytics

# Opción alternativa si se gestiona como entorno virtual estándar:
uv pip install ultralytics
```

3. **Verificación de aceleración por hardware (Opcional pero recomendado):**  
   Para que el inferenciado de YOLOv8-pose procese los fotogramas con fluidez, se recomienda verificar que `torch` (PyTorch) esté instalado con soporte para GPU (CUDA) si el equipo cuenta con tarjeta gráfica NVIDIA:
   ```bash
   uv run python -c "import torch; print('CUDA disponible:', torch.cuda.is_available())"
   ```

---

### INC-02: Interrupción de socket `[WinError 10054]` durante el Streaming de Video (Leve)

#### Evidencia en consola
```text
INFO: 127.0.0.1:53186 - "GET /api/video/ea67844b_WIN_20261021_15_00_08_Pro/stream HTTP/1.1" 206 Partial Content
Exception in callback _ProactorBasePipeTransport._call_connection_lost(None)
handle: <Handle _ProactorBasePipeTransport._call_connection_lost(None)>
Traceback (most recent call last):
  File "...\lib\asyncio\events.py", line 80, in _run
    self._context.run(self._callback, *self._args)
  File "...\lib\asyncio\proactor_events.py", line 165, in _call_connection_lost
    self._sock.shutdown(socket.SHUT_RDWR)
ConnectionResetError: [WinError 10054] Se ha forzado la interrupción de una conexión existente por el host remoto
```

#### Causa Raíz
1. **Peticiones por rangos (`206 Partial Content`):** El reproductor de video HTML5 del frontend solicita el archivo de video en fragmentos (*Byte-Range requests*) a través del endpoint `/api/video/{id}/stream`.
2. **Cancelación normal del navegador/WebView:** Cuando el reproductor llena su búfer temporal o cuando el usuario adelanta/retrocede en la línea de tiempo (*scrubbing*), el cliente cierra inmediatamente la conexión HTTP actual para abrir una nueva en otro punto del video.
3. **Comportamiento de `ProactorEventLoop` en Python 3.10 (Windows):** Al cerrarse la conexión desde el cliente, el bucle de eventos asíncrono de Windows intenta ejecutar `self._sock.shutdown(socket.SHUT_RDWR)` sobre un socket que ya fue desconectado, provocando que el sistema operativo arroje el código `WinError 10054`.

#### Solución (Parche en el punto de entrada de la aplicación)
Para evitar que este error inofensivo ensucie la consola de KinePipe MMA, se debe interceptar la excepción `ConnectionResetError` en el cierre de transporte de `asyncio`. 

Añadir el siguiente bloque al inicio del archivo principal que lanza la aplicación (por ejemplo, `main.py`, `run.py` o `app.py`), **antes** de iniciar `uvicorn.run(...)`:

```python
import sys
from functools import wraps
from asyncio.proactor_events import _ProactorBasePipeTransport

def configurar_parche_asyncio_windows():
    """
    Silencia el error inofensivo [WinError 10054] en Python 3.10 bajo Windows
    provocado cuando el reproductor de video HTML5 cancela peticiones 206 Partial Content.
    """
    if sys.platform == "win32":
        def _silenciar_reset_conexion(func):
            @wraps(func)
            def wrapper(self, *args, **kwargs):
                try:
                    return func(self, *args, **kwargs)
                except (ConnectionResetError, RuntimeError):
                    pass
            return wrapper

        _ProactorBasePipeTransport._call_connection_lost = _silenciar_reset_conexion(
            _ProactorBasePipeTransport._call_connection_lost
        )

# Ejecutar antes de levantar el servidor Uvicorn o la ventana nativa
configurar_parche_asyncio_windows()
```

---

## 3. Lista de Verificación Post-Implementación (Checklist)

- [ ] Ejecutar `uv add ultralytics` (o `uv pip install ultralytics`) en el entorno del proyecto.
- [ ] Incorporar la función `configurar_parche_asyncio_windows()` en el script de arranque de KinePipe MMA.
- [ ] Iniciar la aplicación y cargar el video de prueba (`ea67844b_WIN_20261021_15_00_08_Pro`).
- [ ] Desplazarse por la barra de tiempo del video y comprobar que la consola ya no muestra el *traceback* `WinError 10054`.
- [ ] Ejecutar el análisis (`POST /api/tracking/run`) y verificar que `Sports2DAdapter` descargue/cargue correctamente los pesos de **YOLOv8-pose** (`.pt`) sin errores de importación.