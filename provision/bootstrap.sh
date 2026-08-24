#!/bin/sh
# Prepares a fresh Ubuntu/Debian machine to host both environments.
#
# Idempotent on purpose: it is the trace in the repository of how this machine
# came to be, so it has to be safe to run again when something is added to it.
# A machine whose configuration exists only in somebody's shell history is
# indistinguishable from an unconfigured one.
#
# Usage (from a workstation):  ssh root@HOST 'sh -s' < provision/bootstrap.sh
set -eu

SWAP_SIZE="${SWAP_SIZE:-2G}"

say() { printf '\n== %s\n' "$*"; }

say "packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl ufw >/dev/null

say "container runtime"
if command -v docker >/dev/null 2>&1; then
  echo "docker already present: $(docker --version)"
else
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker
docker --version

say "swap (${SWAP_SIZE})"
# Measured idle use of both environments is about 120 MiB, so this is not for
# steady state - it is a cushion for migration and deploy peaks on a 2 GB box,
# where the alternative to swapping is the OOM killer choosing for us.
if [ -f /swapfile ]; then
  echo "swapfile already present"
else
  fallocate -l "$SWAP_SIZE" /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
free -h | sed -n '1p;3p'

say "firewall"
# Order matters and is not cosmetic: allowing 22 before enabling ufw is what
# keeps this from ending the session that is running it.
ufw allow 22/tcp >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force default deny incoming >/dev/null
ufw --force default allow outgoing >/dev/null
ufw --force enable >/dev/null
ufw status verbose | head -8

say "ssh: keys only"
# Safe because this script is reached over a key-authenticated session.
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
sshd -t && systemctl reload ssh 2>/dev/null || systemctl reload sshd
grep -E '^(PasswordAuthentication|PermitRootLogin)' /etc/ssh/sshd_config

say "done"
echo "docker:  $(docker --version)"
echo "swap:    $(swapon --show=NAME,SIZE --noheadings | tr '\n' ' ')"
echo "address: $(curl -fsS https://api.ipify.org 2>/dev/null || echo unknown)"
