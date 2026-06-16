# Examen de Admisión a Bachillerato — App web (Next.js + Supabase)

Versión **con base de datos** del examen de admisión del Instituto Rembrandt de Querétaro. Los aspirantes presentan su examen desde cualquier dispositivo y la Coordinación ve **todos** los resultados en un solo lugar (en la nube, no en el navegador).

- Examen de admisión a Bachillerato: 5 materias (Matemáticas, Lectura y Redacción, Física, Química, Biología), 50 preguntas reales.
- **Calificación en el servidor**: las RPC `start_exam` / `submit_exam` califican en Postgres; la respuesta correcta nunca sale al cliente.
- **Seguridad RLS**: solo Coordinación (autenticada) puede leer resultados y aspirantes.

**Stack:** Next.js 16 · React 19 · Supabase (plan Free) · Vercel (plan Free).

## Desplegar en Vercel (1 clic)

> Antes de pulsar el botón crea tu proyecto Supabase (paso 1 de “Puesta en marcha”): necesitarás el **Project URL** y la **anon public key** para pegarlas cuando Vercel te las pida.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FBigTigerMX%2Fexamen-admision-rembrandt-web&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY&envDescription=Pega%20el%20Project%20URL%20y%20la%20anon%20public%20key%20de%20tu%20proyecto%20Supabase&envLink=https%3A%2F%2Fgithub.com%2FBigTigerMX%2Fexamen-admision-rembrandt-web%23puesta-en-marcha&project-name=examen-admision-rembrandt&repository-name=examen-admision-rembrandt-web)

El botón clona el repo en tu cuenta, te pide las dos variables de Supabase y publica la app con una URL lista para usar en cualquier dispositivo.

## Rutas
- `/` — inicio.
- `/examen` — aspirante: código de un solo uso → examen → "enviado".
- `/coordinacion` — login + Resultados (constancia imprimible), Aspirantes y códigos, Banco de preguntas, Configuración.

## Puesta en marcha
1. Crea un proyecto gratis en [supabase.com](https://supabase.com). En **SQL Editor** pega y ejecuta `supabase/migrations/0001_init.sql` (crea tablas, seguridad, RPC y siembra las 50 preguntas).
2. Crea el usuario de Coordinación en Supabase → **Authentication → Users → Add user** (correo + contraseña). Queda como `coordinator`.
3. Copia `.env.example` a `.env.local` con tus valores de Supabase → **Project Settings → API**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Local: `npm install && npm run dev` → http://localhost:3000
5. Producción: importa este repo en [Vercel](https://vercel.com) y define ahí las mismas 2 variables de entorno.

> Versión offline (sin base de datos, un solo archivo): https://bigtigermx.github.io/examen-admision-rembrandt/
