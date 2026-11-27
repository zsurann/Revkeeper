interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_VAPID_PUBLIC_KEY: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_OWNER_NAME?: string
  readonly VITE_CONTACT_EMAIL?: string
  readonly VITE_SENTRY_RELEASE?: string
  readonly VITE_SENTRY_ENVIRONMENT: 'production' | 'preview' | 'local'
}
