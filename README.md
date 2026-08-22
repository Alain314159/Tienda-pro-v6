TIENDA PRO V6
POS y gestión para abastos y tiendas de barrio.
Offline-first con sincronización en la nube.

QUÉ ES
Aplicación de punto de venta y gestión que funciona sin internet
y sincroniza cuando hay conexión.
Cuentas por correo, varios dispositivos, varias tiendas
y modo de venta detal y mayorista.

FUNCIONES
Ventas con carrito, escáner de código de barras, cobro en efectivo o transferencia.
No permite vender sin stock.
Compras con lotes FIFO e historial editable.
Productos con unidad de peso o volumen, código, categoría y archivado seguro.
Inventario valorado por lotes, mermas con motivo y PIN.
Caja por dispositivo con arqueo y sobrante o faltante.
Patrimonio con disponible para retiro, retiros y aportes.
Cierre de período con historial.
Cuadre Total en PDF ultra completo, CSV y compartir por WhatsApp.
Auditoría de quién hizo qué y cuándo.
Multi-tienda con roles de dueño, empleado y lector.
Modo mayorista por tienda con precios y cantidades mínimas.
Respaldo automático en la nube y exportación a archivo.
Migración de datos desde la versión 5.2.

TECNOLOGÍA
Vue 3 + Vite + Pinia.
Tailwind CSS y PWA instalable.
Appwrite para cuentas, sincronización y respaldos.
IndexedDB con Dexie como base de datos local.
Compilado con GitHub Actions y publicado en GitHub Pages.

ESTRUCTURA
/
  .github/workflows/deploy.yml   Compila y publica
  public/                        Icono PWA
  src/
    main.js                      Arranque
    App.vue                      Login, menú y sync
    style.css                    Estilos base
    lib/                         appwrite, db, sync, auth, pdf, scanner, migrar, utils
    stores/                      estado (lógica de negocio) y ui (toasts y diálogos)
    modulos/                     Los 12 módulos auto-descubiertos
    componentes/Ui.vue           Toasts, confirmaciones y prompts

COMPILACIÓN
Cada push a main compila y publica solo.
No hay que instalar nada en el teléfono ni en el PC.

AUTOR
Alain
