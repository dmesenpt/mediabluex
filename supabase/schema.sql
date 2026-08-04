-- ContaControl · esquema de base de datos para Supabase (PostgreSQL)
-- ---------------------------------------------------------------
-- Este script crea todas las tablas necesarias para la aplicación,
-- activa Row Level Security (RLS) en cada una de ellas y define
-- políticas para que cada usuario solo pueda leer y modificar sus
-- propios datos a través de la columna user_id (= auth.uid()).
--
-- La aplicación se diseñó inicialmente para un único propietario,
-- pero el modelo de datos ya queda preparado para múltiples usuarios:
-- basta con invitar más usuarios a Supabase Auth, cada uno tendrá
-- su propio espacio de datos aislado por RLS.
--
-- Cómo ejecutar este script:
--   1. Crea un proyecto en https://supabase.com
--   2. Abre el "SQL Editor" del proyecto
--   3. Pega el contenido completo de este archivo y ejecútalo
--   4. Copia la URL y la anon key del proyecto en tu archivo .env.local
--      (ver .env.example en la raíz del repositorio)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------
-- Función auxiliar para mantener updated_at siempre actualizado
-- ---------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------
-- Perfiles de usuario (metadatos adicionales sobre auth.users)
-- ---------------------------------------------------------------
create table if not exists public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre_completo text,
  creado_en timestamptz not null default now()
);

alter table public.perfiles enable row level security;

create policy "Los usuarios pueden ver su propio perfil"
  on public.perfiles for select
  using (auth.uid() = id);

create policy "Los usuarios pueden actualizar su propio perfil"
  on public.perfiles for update
  using (auth.uid() = id);

create policy "Los usuarios pueden crear su propio perfil"
  on public.perfiles for insert
  with check (auth.uid() = id);

-- ---------------------------------------------------------------
-- Configuración de la aplicación (una fila por usuario)
-- ---------------------------------------------------------------
create table if not exists public.configuracion (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nombre_app text not null default 'ContaControl',
  nombre_negocio text default '',
  nif text default '',
  direccion text default '',
  telefono text default '',
  email text default '',
  logo_url text,
  moneda text not null default 'EUR',
  idioma text not null default 'es',
  zona_horaria text not null default 'Europe/Lisbon',
  inicio_anio_fiscal smallint not null default 1 check (inicio_anio_fiscal between 1 and 12),
  metodos_pago_activos text[] not null default array['transferencia','efectivo','mbway','tarjeta','debito_directo','paypal','otro'],
  copia_seguridad_automatica boolean not null default false,
  notificaciones_activas boolean not null default true,
  dias_anticipacion_recordatorio smallint not null default 5,
  tema text not null default 'sistema' check (tema in ('claro','oscuro','sistema')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

alter table public.configuracion enable row level security;

create trigger trg_configuracion_updated_at
  before update on public.configuracion
  for each row execute function public.set_updated_at();

create policy "Cada usuario gestiona su configuración"
  on public.configuracion for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nombre text not null,
  tipo text not null check (tipo in ('particular', 'autonomo', 'empresa')),
  categoria text not null check (categoria in ('fijo', 'temporal')),
  nif text not null default '',
  persona_contacto text,
  telefono text,
  email text,
  direccion text,
  pais text not null default 'Portugal',
  servicio_contratado text default '',
  importe_mensual numeric(12, 2) not null default 0 check (importe_mensual >= 0),
  dia_vencimiento smallint not null default 10 check (dia_vencimiento between 1 and 31),
  fecha_inicio date not null default current_date,
  fecha_fin date,
  estado text not null default 'activo' check (estado in ('activo', 'pausado', 'inactivo')),
  notas text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists idx_clientes_user_id on public.clientes (user_id);

alter table public.clientes enable row level security;

create trigger trg_clientes_updated_at
  before update on public.clientes
  for each row execute function public.set_updated_at();

create policy "Cada usuario gestiona sus propios clientes"
  on public.clientes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- Mensualidades (control anual de pagos)
-- ---------------------------------------------------------------
create table if not exists public.mensualidades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  anio smallint not null,
  mes smallint not null check (mes between 1 and 12),
  importe_acordado numeric(12, 2) not null default 0 check (importe_acordado >= 0),
  fecha_vencimiento date not null,
  estado_manual text check (estado_manual in ('no_aplica')),
  numero_factura text,
  notas text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (cliente_id, anio, mes)
);

create index if not exists idx_mensualidades_user_id on public.mensualidades (user_id);
create index if not exists idx_mensualidades_cliente_id on public.mensualidades (cliente_id);
create index if not exists idx_mensualidades_anio_mes on public.mensualidades (anio, mes);

alter table public.mensualidades enable row level security;

create trigger trg_mensualidades_updated_at
  before update on public.mensualidades
  for each row execute function public.set_updated_at();

create policy "Cada usuario gestiona sus propias mensualidades"
  on public.mensualidades for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- Pagos de una mensualidad (permite pagos parciales múltiples)
-- ---------------------------------------------------------------
create table if not exists public.pagos_mensualidad (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mensualidad_id uuid not null references public.mensualidades (id) on delete cascade,
  fecha date not null default current_date,
  importe numeric(12, 2) not null check (importe > 0),
  metodo_pago text not null check (
    metodo_pago in ('transferencia', 'efectivo', 'mbway', 'tarjeta', 'debito_directo', 'paypal', 'otro')
  ),
  notas text,
  creado_en timestamptz not null default now()
);

create index if not exists idx_pagos_mensualidad_mensualidad_id on public.pagos_mensualidad (mensualidad_id);
create index if not exists idx_pagos_mensualidad_user_id on public.pagos_mensualidad (user_id);

alter table public.pagos_mensualidad enable row level security;

create policy "Cada usuario gestiona sus propios pagos de mensualidad"
  on public.pagos_mensualidad for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- Historial de cambios de una mensualidad (auditoría)
-- ---------------------------------------------------------------
create table if not exists public.historial_mensualidad (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mensualidad_id uuid not null references public.mensualidades (id) on delete cascade,
  fecha timestamptz not null default now(),
  descripcion text not null
);

create index if not exists idx_historial_mensualidad_mensualidad_id on public.historial_mensualidad (mensualidad_id);

alter table public.historial_mensualidad enable row level security;

create policy "Cada usuario gestiona su propio historial"
  on public.historial_mensualidad for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- Categorías de gasto (personalizables por el usuario)
-- ---------------------------------------------------------------
create table if not exists public.categorias_gasto (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nombre text not null,
  archivada boolean not null default false,
  predeterminada boolean not null default false,
  creado_en timestamptz not null default now(),
  unique (user_id, nombre)
);

create index if not exists idx_categorias_gasto_user_id on public.categorias_gasto (user_id);

alter table public.categorias_gasto enable row level security;

create policy "Cada usuario gestiona sus propias categorías de gasto"
  on public.categorias_gasto for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- Pagos recurrentes (alquiler, software, seguros, impuestos...)
-- ---------------------------------------------------------------
create table if not exists public.pagos_recurrentes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nombre text not null,
  categoria_id uuid references public.categorias_gasto (id) on delete set null,
  proveedor text,
  importe numeric(12, 2) not null default 0 check (importe >= 0),
  frecuencia text not null check (frecuencia in ('semanal', 'mensual', 'trimestral', 'semestral', 'anual')),
  proxima_fecha date not null,
  fecha_inicio date not null default current_date,
  fecha_fin date,
  metodo_pago text not null check (
    metodo_pago in ('transferencia', 'efectivo', 'mbway', 'tarjeta', 'debito_directo', 'paypal', 'otro')
  ),
  tipo text not null check (tipo in ('personal', 'profesional')),
  generar_gasto_automatico boolean not null default false,
  dias_aviso smallint not null default 5,
  activo boolean not null default true,
  notas text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists idx_pagos_recurrentes_user_id on public.pagos_recurrentes (user_id);

alter table public.pagos_recurrentes enable row level security;

create trigger trg_pagos_recurrentes_updated_at
  before update on public.pagos_recurrentes
  for each row execute function public.set_updated_at();

create policy "Cada usuario gestiona sus propios pagos recurrentes"
  on public.pagos_recurrentes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- Gastos
-- ---------------------------------------------------------------
create table if not exists public.gastos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  fecha date not null default current_date,
  descripcion text not null,
  categoria_id uuid references public.categorias_gasto (id) on delete set null,
  proveedor text,
  importe numeric(12, 2) not null default 0 check (importe >= 0),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'pagado')),
  fecha_vencimiento date,
  metodo_pago text not null check (
    metodo_pago in ('transferencia', 'efectivo', 'mbway', 'tarjeta', 'debito_directo', 'paypal', 'otro')
  ),
  tipo text not null check (tipo in ('personal', 'profesional')),
  recurrente boolean not null default false,
  pago_recurrente_id uuid references public.pagos_recurrentes (id) on delete set null,
  deducible text not null default 'revisar' check (deducible in ('si', 'no', 'revisar')),
  nif_proveedor text,
  numero_factura text,
  notas text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists idx_gastos_user_id on public.gastos (user_id);
create index if not exists idx_gastos_fecha on public.gastos (fecha);
create index if not exists idx_gastos_categoria_id on public.gastos (categoria_id);

alter table public.gastos enable row level security;

create trigger trg_gastos_updated_at
  before update on public.gastos
  for each row execute function public.set_updated_at();

create policy "Cada usuario gestiona sus propios gastos"
  on public.gastos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- Ingresos (pagos de clientes y otros ingresos)
-- ---------------------------------------------------------------
create table if not exists public.ingresos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('pago_cliente', 'otro')),
  cliente_id uuid references public.clientes (id) on delete set null,
  mensualidad_id uuid references public.mensualidades (id) on delete set null,
  fecha date not null default current_date,
  concepto text not null,
  categoria text default '',
  mes_correspondiente text not null,
  importe numeric(12, 2) not null check (importe > 0),
  metodo_pago text not null check (
    metodo_pago in ('transferencia', 'efectivo', 'mbway', 'tarjeta', 'debito_directo', 'paypal', 'otro')
  ),
  estado text not null default 'cobrado' check (estado in ('pendiente', 'parcial', 'cobrado')),
  numero_factura text,
  notas text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists idx_ingresos_user_id on public.ingresos (user_id);
create index if not exists idx_ingresos_cliente_id on public.ingresos (cliente_id);
create index if not exists idx_ingresos_mes_correspondiente on public.ingresos (mes_correspondiente);

alter table public.ingresos enable row level security;

create trigger trg_ingresos_updated_at
  before update on public.ingresos
  for each row execute function public.set_updated_at();

create policy "Cada usuario gestiona sus propios ingresos"
  on public.ingresos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- Documentos adjuntos (metadatos; el fichero se guarda en Storage)
-- ---------------------------------------------------------------
create table if not exists public.documentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entidad_tipo text not null check (entidad_tipo in ('cliente', 'mensualidad', 'gasto', 'ingreso')),
  entidad_id uuid not null,
  nombre text not null,
  ruta_storage text not null,
  tipo text,
  tamano bigint,
  creado_en timestamptz not null default now()
);

create index if not exists idx_documentos_entidad on public.documentos (entidad_tipo, entidad_id);
create index if not exists idx_documentos_user_id on public.documentos (user_id);

alter table public.documentos enable row level security;

create policy "Cada usuario gestiona sus propios documentos"
  on public.documentos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- Storage: bucket privado para los documentos adjuntos
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

create policy "Los usuarios leen solo sus propios documentos"
  on storage.objects for select
  using (bucket_id = 'documentos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Los usuarios suben documentos a su propia carpeta"
  on storage.objects for insert
  with check (bucket_id = 'documentos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Los usuarios actualizan sus propios documentos"
  on storage.objects for update
  using (bucket_id = 'documentos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Los usuarios eliminan sus propios documentos"
  on storage.objects for delete
  using (bucket_id = 'documentos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------
-- Trigger: crear perfil y configuración por defecto al registrarse
-- ---------------------------------------------------------------
create or replace function public.gestionar_nuevo_usuario()
returns trigger as $$
begin
  insert into public.perfiles (id, nombre_completo)
  values (new.id, new.raw_user_meta_data ->> 'nombre_completo')
  on conflict (id) do nothing;

  insert into public.configuracion (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_nuevo_usuario on auth.users;
create trigger trg_nuevo_usuario
  after insert on auth.users
  for each row execute function public.gestionar_nuevo_usuario();
