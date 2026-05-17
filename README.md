# Listas de Compras

Gestor web para listas de compras con usuarios, plantillas, PostgreSQL y Auth.js.

## Requisitos

- Node.js 20+
- PostgreSQL

## Configuración

1. Copia `.env.example` a `.env`.
2. Ajusta `DATABASE_URL`, `AUTH_SECRET` y `AUTH_URL`.
3. Instala dependencias.
4. Ejecuta Prisma.

```bash
npm install
npx prisma db push
npm run dev
```

## Despliegue

- Frontend: Vercel
- Base de datos: Neon, Supabase o Railway

## Funciones

- Registro e inicio de sesión
- Crear listas y productos
- Calcular cuánto comprar
- Crear plantillas reutilizables
- Guardar autor, fecha y hora de creación
