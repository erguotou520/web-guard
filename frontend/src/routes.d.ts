declare module '~react-pages' {
  import { ComponentType } from 'react'

  interface RouteMeta {
    title?: string
    requiresAuth?: boolean
    hideFromNav?: boolean
  }

  interface RouteRecord {
    path: string
    element: ComponentType
    meta?: RouteMeta
  }

  const routes: RouteRecord[]
  export default routes
}
