/// <reference types="astro/client" />

interface AdminEnv {
  /** Base URL of the roammate Worker API, e.g. https://api.roammate.com */
  API_BASE_URL: string;
  /** Admin key sent as X-Admin-Key. A Pages SECRET, never a public var. */
  ADMIN_API_KEY: string;
  /** Cloudflare Access team domain, e.g. roammate.cloudflareaccess.com */
  ACCESS_TEAM_DOMAIN?: string;
  /** AUD tag of the Access application protecting this hostname. */
  ACCESS_AUD?: string;
  /** "1" skips Access verification. Local development only. */
  DEV_BYPASS_ACCESS?: string;
}

type Runtime = import('@astrojs/cloudflare').Runtime<AdminEnv>;

declare namespace App {
  interface Locals extends Runtime {
    /** Email of the operator, from the verified Access token. */
    operator: string;
  }
}
