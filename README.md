# 💸 ECONO — Control Financiero Inteligente

> Plataforma moderna de control de finanzas personales, gestión de presupuestos y seguimiento de gastos en tiempo real con estética dark mode, Three.js 3D y base de datos Supabase (PostgreSQL). Preparada como PWA (Progressive Web App) instalable en móviles y desktop.

---

## ✨ Características

- 📊 **Balance Neto en Tiempo Real**: Cálculo automático de ingresos, gastos, nivel de consumo y disponibilidad diaria proyectada para el resto del mes.
- ⚡ **Plantillas Frecuentes Personalizables**: Accesos rápidos por categorías con soporte para crear tus propias plantillas con montos habituales.
- ☁️ **Sincronización en la Nube con Supabase**: Base de datos PostgreSQL en la nube, con Row Level Security (RLS) para que cada usuario solo acceda a su información.
- 🔐 **Autenticación Flexible**:
  - Google OAuth.
  - Registro e inicio de sesión por correo electrónico y contraseña.
  - Modo invitado / local sin necesidad de registro previo.
- 📱 **PWA (Progressive Web App)**:
  - Instalable directamente en dispositivos Android (Chrome) e iOS (Safari).
  - Modo standalone sin barras de navegación del explorador.
  - Service Worker con soporte de almacenamiento en caché offline.
- 🎨 **Diseño Dark Fintech con Glassmorphism**: Fondo 3D interactivo con Three.js, efectos táctiles hápticos y tarjetas con perspectiva 3D tilt.
- 📥 **Exportación**: Descarga del historial completo en formato CSV listo para Excel o Google Sheets.

---

## 🛠️ Tecnologías

- **Frontend**: Vanilla JavaScript (ES Modules), HTML5 semántico, CSS3 modular (variables, glassmorphism, flexbox/grid).
- **Gráficos 3D**: Three.js.
- **Base de Datos y Auth**: Supabase (PostgreSQL + Realtime + Auth).
- **Herramienta de Construcción**: Vite.
- **PWA**: Web App Manifest v2 + Service Worker.

---

## 🚀 Instalación y Uso Local

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/selfxz/econo.git
   cd econo
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**:
   Copia `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```
   Rellena tus credenciales de Supabase:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key-publica
   ```

4. **Configurar la base de datos**:
   En el **SQL Editor** de tu panel de Supabase, ejecuta el script [`supabase-setup.sql`](supabase-setup.sql).

5. **Iniciar en modo desarrollo**:
   ```bash
   npm run dev
   ```

6. **Construir para producción**:
   ```bash
   npm run build
   ```

---

## 📄 Licencia

MIT License — Desarrollado para uso libre y personal.
