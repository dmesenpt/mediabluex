import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigurado = Boolean(URL && ANON_KEY);

/** Devuelve el cliente de Supabase en el servidor (Server Components / Route Handlers), o null si no está configurado. */
export async function getSupabaseServerClient() {
  if (!supabaseConfigurado) return null;
  const cookieStore = await cookies();
  return createServerClient(URL!, ANON_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // se ignora: ocurre cuando se llama desde un Server Component sin posibilidad de escribir cookies
        }
      },
    },
  });
}
