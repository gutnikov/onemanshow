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
#
# Note what this does NOT protect. Docker writes its own iptables rules, and a
# published container port bypasses ufw entirely - a database published with
# -p 5432:5432 is reachable from the internet with the firewall showing "deny
# incoming". Container ports that are not meant to be public must therefore be
# bound to 127.0.0.1 explicitly; the firewall will not do it for them.
ufw allow 22/tcp >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force default deny incoming >/dev/null
ufw --force default allow outgoing >/dev/null
ufw --force enable >/dev/null
ufw status

say "ssh"
# Two things went wrong here the first time, and both are recorded rather than
# quietly fixed, because both are easy to repeat.
#
# 1. Editing /etc/ssh/sshd_config is not enough. Cloud images ship an Include of
#    /etc/ssh/sshd_config.d/*.conf near the top of that file, and sshd honours
#    the FIRST occurrence of a keyword - so a provider's 50-cloud-init.conf wins
#    over anything written below it. An override therefore has to live in that
#    directory under a name that sorts EARLIER, not later.
#
# 2. Disabling password authentication on a machine with no authorized key locks
#    everybody out of ssh, leaving only the provider's console. So it is now
#    conditional on a key actually being present.
KEYS="${HOME:-/root}/.ssh/authorized_keys"
if [ -s "$KEYS" ]; then
  mkdir -p /etc/ssh/sshd_config.d
  cat > /etc/ssh/sshd_config.d/00-onemanshow.conf <<'CONF'
# Sorts before any provider default, so these win.
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
CONF
  sshd -t && { systemctl reload ssh 2>/dev/null || systemctl reload sshd; }
  echo "password authentication disabled ($(grep -c . "$KEYS") key(s) present)"
  sshd -T 2>/dev/null | grep -E '^(passwordauthentication|permitrootlogin|kbdinteractiveauthentication)' || true
else
  rm -f /etc/ssh/sshd_config.d/00-onemanshow.conf
  sed -i 's/^PasswordAuthentication no/#PasswordAuthentication no/' /etc/ssh/sshd_config || true
  sshd -t && { systemctl reload ssh 2>/dev/null || systemctl reload sshd; }
  echo "NO authorized key found - leaving password authentication as it was."
  echo "Add a public key to $KEYS, then run this script again to lock it down."
fi

say "done"
echo "docker:  $(docker --version)"
echo "swap:    $(swapon --show=NAME,SIZE --noheadings | tr '\n' ' ')"
echo "address: $(curl -fsS https://api.ipify.org 2>/dev/null || echo unknown)"
