import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

type E2ECredentials = {
  phone: string;
  pin: string;
};

function readCredentials(prefix: 'CUSTOMER' | 'ADMIN'): E2ECredentials | null {
  const phone = process.env[`E2E_${prefix}_PHONE`];
  const pin = process.env[`E2E_${prefix}_PIN`];

  if (!phone || !pin) {
    return null;
  }

  return { phone, pin };
}

export function getCustomerCredentials() {
  return readCredentials('CUSTOMER');
}

export function getAdminCredentials() {
  return readCredentials('ADMIN');
}
