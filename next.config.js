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
        source: '/uploads/crop-images/:filename',
        destination: '/api/serve-image?file=:filename',
      },
    ]
  },
}

module.exports = nextConfig