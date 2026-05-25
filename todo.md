# Security TODO

## 🔴 Critical — implement immediately

- [ ] **SSH key auth only** — disable password login on VPS
  ```bash
  # On VPS:
  ssh-keygen -t ed25519
  # Copy your public key to ~/.ssh/authorized_keys
  sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
  sudo systemctl restart sshd
  ```

- [ ] **Firewall** — block everything except 22, 80, 443
  ```bash
  sudo ufw default deny incoming
  sudo ufw allow 22/tcp
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw enable
  ```

- [ ] **Docker rootless** — prevents container escape → host takeover
  ```bash
  dockerd-rootless-setuptool.sh install
  ```

- [ ] **fail2ban** — block IPs after repeated SSH failures
  ```bash
  sudo apt install fail2ban -y
  sudo systemctl enable fail2ban
  ```

## 🟡 Important — add soon

- [ ] **2FA / TOTP** — add to login page (speakeasy or otplib)
- [ ] **File type validation** — verify MIME with `file` command server-side, not just client header
- [ ] **SQLite not publicly accessible** — ensure DB file is outside web root and `.db` is blocked by Caddy
- [ ] **Audit log** — log all file uploads, deletes, admin actions to a `audit_log` table

## 🟢 Nice to have

- [ ] **Content Security Policy** — tighten CSP headers beyond current defaults
- [ ] **Rate limit by IP** on file serving — prevent hotlinking abuse
- [ ] **Expiring share links** — auto-delete files after X days
- [ ] **SRI hashes** on frontend assets
