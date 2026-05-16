import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://picklehub-sigma.vercel.app',
      lastModified: new Date(),
    },
  ]
}