# Mejoras visuales: tema azul marino y modo claro/oscuro

## Objetivo
Actualizar la interfaz de Enmask para que tenga una identidad visual más profesional, usando una paleta principal azul marino y permitiendo alternar entre modo oscuro y modo claro.

## Cambios aplicados

- Se reemplazó la paleta morada anterior por una paleta azul marino.
- Se agregó soporte de tema mediante variables CSS globales.
- Se implementó `ThemeProvider` para guardar la preferencia del usuario en `localStorage`.
- Se agregó el componente `ThemeToggle` reutilizable.
- El botón de tema aparece en:
  - Login.
  - Barra superior del sistema autenticado.
- Se ajustaron tarjetas, modales, formularios, sidebar, topbar, tablas, dashboard y estados visuales para ambos modos.

## Archivos principales modificados

- `frontend/src/index.css`
- `frontend/src/App.tsx`
- `frontend/src/pages/Login.tsx`
- `frontend/src/components/ThemeToggle.tsx`
- `frontend/src/hooks/useTheme.tsx`

## Comportamiento

- Modo oscuro: azul marino profundo, superficies oscuras y acentos celestes.
- Modo claro: fondo limpio, tarjetas blancas, bordes suaves y texto azul oscuro.
- La preferencia se conserva aunque se recargue la página.
