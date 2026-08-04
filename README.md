# ContaControl

Aplicación web progresiva (PWA) en español para el control financiero de un
contador o administrador independiente que trabaja en Portugal: clientes,
mensualidades, ingresos, gastos, pagos recurrentes, cuentas por cobrar e
informes.

El nombre "ContaControl" es el nombre inicial de la aplicación y puede
cambiarse en cualquier momento desde **Configuración**.

## Stack técnico

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS v4**
- Componentes de interfaz propios inspirados en shadcn/ui sobre **Radix UI**
- **Recharts** para los gráficos del panel de inicio e informes
- **Supabase** (Postgres + Auth + Storage) como backend, con Row Level
  Security en todas las tablas
- PWA instalable en ordenador, Android e iPhone (manifest + service worker)
- Exportación de datos a **Excel**, **CSV** y **PDF**

## Puesta en marcha

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

Mientras no se configure Supabase (ver más abajo), la aplicación funciona en
**modo de demostración**: toda la información se guarda en el navegador
(`localStorage`) con datos de ejemplo ya cargados, para poder explorar la
interfaz completa sin necesidad de backend.

## Conectar Supabase

1. Crea un proyecto gratuito en [supabase.com](https://supabase.com).
2. Abre el **SQL Editor** del proyecto y ejecuta el contenido de
   [`supabase/schema.sql`](./supabase/schema.sql). Este script crea todas las
   tablas, los índices, el bucket de almacenamiento para documentos y las
   políticas de **Row Level Security** que garantizan que cada usuario solo
   pueda ver y modificar sus propios datos (columna `user_id`).
3. Copia `.env.example` como `.env.local` y completa las variables con la
   URL y la `anon key` de tu proyecto (Project Settings → API):

   ```bash
   cp .env.example .env.local
   ```

4. Reinicia el servidor de desarrollo. Las pantallas de inicio de sesión,
   recuperación y cambio de contraseña (`/login`, `/recuperar-password`,
   `/restablecer-password`) pasarán a usar Supabase Auth automáticamente.

> **Estado actual de la integración:** el esquema, las políticas de RLS, el
> almacenamiento de documentos y las pantallas de autenticación (inicio de
> sesión, recuperación y cambio de contraseña) ya usan Supabase en cuanto se
> configuran las variables de entorno. La capa de datos de la interfaz
> (clientes, mensualidades, ingresos, gastos, pagos recurrentes…) sigue
> funcionando sobre `localStorage` a través de `src/lib/store.tsx`; ese
> archivo concentra toda la API de lectura/escritura (`crearCliente`,
> `registrarPago`, etc.) y es el siguiente paso a sustituir por consultas
> reales a Supabase usando el esquema ya creado, sin tener que tocar ninguna
> pantalla.

La aplicación se diseñó para un único propietario en su primera versión,
pero el modelo de datos ya está preparado para múltiples usuarios: cada fila
de cada tabla está asociada a `user_id` y protegida por RLS, por lo que basta
con invitar más usuarios desde Supabase Auth para escalar a un equipo.

### Estructura relevante

```
src/
  app/
    (auth)/           Inicio de sesión, recuperación y cambio de contraseña
    (app)/             Interfaz principal (barra lateral / navegación inferior)
  components/
    ui/                Componentes base (botones, tarjetas, diálogos, tablas…)
    layout/             Barra lateral, navegación móvil, botón "Nuevo movimiento"
    forms/               Formularios de creación/edición reutilizables
    dashboard/          Tarjetas y gráficos del panel de Inicio
    control-anual/      Rejilla y modal del control anual de pagos
  lib/
    types.ts            Tipos de dominio (clientes, mensualidades, gastos…)
    store.tsx            Estado de la aplicación (modo local) + API de datos
    supabase/            Clientes de Supabase (navegador y servidor)
supabase/
  schema.sql             Esquema completo + Row Level Security
```

## Scripts disponibles

```bash
npm run dev      # servidor de desarrollo
npm run build    # build de producción
npm run start    # servidor de producción
npm run lint     # ESLint
```
