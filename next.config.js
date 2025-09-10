/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  // Configurar para servir arquivos estáticos
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/serve-image?file=:path*',
      },
    ]
  },
}

module.exports = nextConfig