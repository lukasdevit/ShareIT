import fs from 'fs';
import path from 'path';
import { DOMAIN } from '../../config/index.js';

const CERTS_DIR = path.join(process.cwd(), 'caddy', 'certs');

export async function saveCustomCertificate(cert: string, key: string): Promise<void> {
  if (!cert || !key) {
    throw Object.assign(new Error('Both cert and key PEM are required'), { statusCode: 400 });
  }
  if (!cert.includes('BEGIN CERTIFICATE') || !key.includes('BEGIN')) {
    throw Object.assign(
      new Error('Invalid PEM format. Must include BEGIN/END markers.'),
      { statusCode: 400 }
    );
  }

  fs.mkdirSync(CERTS_DIR, { recursive: true });
  fs.writeFileSync(path.join(CERTS_DIR, 'cert.pem'), cert.trim() + '\n');
  fs.writeFileSync(path.join(CERTS_DIR, 'key.pem'), key.trim() + '\n');
  fs.writeFileSync(
    path.join(CERTS_DIR, 'custom.caddy'),
    `tls /etc/caddy/certs/cert.pem /etc/caddy/certs/key.pem\n`
  );
}

export async function readSslStatus(proto: string): Promise<{
  domain: string;
  is_local: boolean;
  protocol: string;
  cert_valid: boolean;
  cert_expiry: string | null;
  managed_by: string;
  note: string;
}> {
  const domain = DOMAIN;
  const isLocal = domain === 'localhost';
  const sslActive = proto === 'https';

  let certExpiry: string | null = null;
  if (sslActive) {
    certExpiry = await tryReadCertExpiry(domain);
  }

  const managedBy = isLocal
    ? 'Caddy (self-signed, localhost)'
    : sslActive
      ? "Caddy + Let's Encrypt (auto-renewing)"
      : 'Caddy (no certificate detected)';

  const note = isLocal
    ? 'Caddy auto-generates a self-signed certificate for localhost. Browsers will show a security warning — this is normal for local development.'
    : sslActive
      ? 'Caddy automatically obtains and renews SSL certificates. No manual configuration needed.'
      : 'Caddy is configured but no SSL certificate was detected. Check that port 443 is reachable and DNS points to this server.';

  return { domain, is_local: isLocal, protocol: proto, cert_valid: sslActive, cert_expiry: certExpiry, managed_by: managedBy, note };
}

async function tryReadCertExpiry(domain: string): Promise<string | null> {
  try {
    const certPath = path.join(process.cwd(), 'caddy', 'certs', `${domain}.pem`);
    if (!fs.existsSync(certPath)) return null;
    // Best-effort: read the cert file and check expiry via openssl
    const { execSync } = await import('child_process');
    const output = execSync(
      `openssl x509 -enddate -noout -in "${certPath}"`,
      { stdio: 'pipe', timeout: 3000 }
    ).toString().trim();
    const match = output.match(/notAfter=(.+)/);
    return match ? (match[1] ?? null) : null;
  } catch {
    return null;
  }
}
