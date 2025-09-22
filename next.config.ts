/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true, // Ignora errores de TypeScript durante el build
  },
  eslint: {
    ignoreDuringBuilds: true, // Ignora ESLint durante el build
  },
  // Opcional: deshabilitar la generación del validador
  experimental: {
    typedRoutes: false,
  }
}

export default nextConfig
