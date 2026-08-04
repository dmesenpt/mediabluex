"use client";

import { createBrowserClient } from "@supabase/ssr";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigurado = Boolean(URL && ANON_KEY);

let client: ReturnType<typeof createBrowserClient> | null = null;

/** Devuelve el cliente de Supabase en el navegador, o null si aún no se han configurado las variables de entorno. */
export function getSupabaseBrowserClient() {
  if (!supabaseConfigurado) return null;
  if (!client) {
    client = createBrowserClient(URL!, ANON_KEY!);
  }
  return client;
}
