#!/usr/bin/env bash
#
# Upload the generated crosswalk content package to the AEM author instance.
#
# Auth: provide a token via env var (first match wins):
#   AEM_TOKEN | AEM_DEV_TOKEN | AEM_ACCESS_TOKEN   -> sent as "Authorization: Bearer <token>"
# Optionally, basic auth instead of a bearer token:
#   AEM_USER + AEM_PASSWORD                         -> sent as -u user:password
#
# Override defaults if needed:
#   AEM_AUTHOR_URL  (default: https://author-p121857-e1908603.adobeaemcloud.com)
#   AEM_PACKAGE     (default: migration-work/kotak-content-package.zip)
#
set -euo pipefail

AUTHOR_URL="${AEM_AUTHOR_URL:-https://author-p121857-e1908603.adobeaemcloud.com}"
PACKAGE="${AEM_PACKAGE:-migration-work/kotak-content-package.zip}"
PKG_NAME="kotak-content"

# Resolve repo root relative to this script so it runs from anywhere.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${REPO_ROOT}"

if [[ ! -f "${PACKAGE}" ]]; then
  echo "❌ Package not found: ${PACKAGE}" >&2
  echo "   Run the JCR generation + packaging step first." >&2
  exit 1
fi

# Determine auth mode.
TOKEN="${AEM_TOKEN:-${AEM_DEV_TOKEN:-${AEM_ACCESS_TOKEN:-}}}"
AUTH_ARGS=()
if [[ -n "${TOKEN}" ]]; then
  AUTH_ARGS=(-H "Authorization: Bearer ${TOKEN}")
  echo "🔑 Using bearer token auth"
elif [[ -n "${AEM_USER:-}" && -n "${AEM_PASSWORD:-}" ]]; then
  AUTH_ARGS=(-u "${AEM_USER}:${AEM_PASSWORD}")
  echo "🔑 Using basic auth (${AEM_USER})"
else
  echo "❌ No AEM credentials found in environment." >&2
  echo "   Set one of: AEM_TOKEN / AEM_DEV_TOKEN / AEM_ACCESS_TOKEN (bearer)," >&2
  echo "   or AEM_USER + AEM_PASSWORD (basic), then re-run this script." >&2
  exit 2
fi

ENDPOINT="${AUTHOR_URL%/}/crx/packmgr/service.jsp"
echo "⬆️  Uploading ${PACKAGE} -> ${ENDPOINT}"

RESPONSE="$(curl -sS -w $'\n%{http_code}' \
  "${AUTH_ARGS[@]}" \
  -F "file=@${PACKAGE}" \
  -F "name=${PKG_NAME}" \
  -F "force=true" \
  -F "install=true" \
  "${ENDPOINT}")"

HTTP_CODE="$(echo "${RESPONSE}" | tail -n1)"
BODY="$(echo "${RESPONSE}" | sed '$d')"

echo "HTTP ${HTTP_CODE}"
echo "${BODY}" | head -40

if [[ "${HTTP_CODE}" != "200" ]]; then
  echo "❌ Upload failed (HTTP ${HTTP_CODE})." >&2
  exit 3
fi

# Package Manager returns text/xml; a successful install contains code="200" / "Package installed".
if echo "${BODY}" | grep -qiE 'code="200"|Package installed|successful'; then
  echo "✅ Package uploaded and installed to ${AUTHOR_URL} under /content/ema-kmb-ue-test"
else
  echo "⚠️  Upload returned HTTP 200 but install status is unclear — review the response above." >&2
  exit 4
fi
