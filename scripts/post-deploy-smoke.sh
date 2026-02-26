#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-${BASE_URL:-https://baby-care.chuhaibox.com}}"

if ! command -v curl >/dev/null 2>&1; then
  echo "ERROR: curl is required" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node is required (used for JSON parsing)" >&2
  exit 1
fi

json_get() {
  local expr="$1"
  node -e "const fs=require('fs');const s=fs.readFileSync(0,'utf8');const j=JSON.parse(s||'{}');const v=${expr}; if (v===undefined) process.exit(2); process.stdout.write(String(v));"
}

rand_phone() {
  # Mainland phone format: 11 digits, starts with 1.
  local ts
  ts="$(date +%s)"
  echo "1$(printf '%010d' "$ts" | tail -c 11)"
}

say() {
  echo "==> $*"
}

require_non_empty() {
  local name="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    echo "ERROR: $name is empty" >&2
    exit 1
  fi
}

http_code() {
  curl -sS -o /dev/null -w "%{http_code}" "$@"
}

say "BASE_URL=$BASE_URL"

say "Check frontend index.html"
code="$(http_code -L "${BASE_URL}/")"
if [[ "$code" != "200" ]]; then
  echo "ERROR: GET / returned HTTP $code" >&2
  exit 1
fi

say "Check backend reverse proxy (/v1/auth/me should be 401 without token)"
me_401="$(curl -sS -D- "${BASE_URL}/v1/auth/me" -o /tmp/babycare_me_noauth.json | head -n 1 | awk '{print $2}')"
if [[ "${me_401:-}" != "401" ]]; then
  echo "ERROR: expected 401 from /v1/auth/me without token, got ${me_401:-?}" >&2
  cat /tmp/babycare_me_noauth.json >&2 || true
  exit 1
fi

PHONE="${SMOKE_PHONE:-$(rand_phone)}"
PASSWORD="${SMOKE_PASSWORD:-smoke-test-123456}"
NICKNAME="${SMOKE_NICKNAME:-冒烟用户}"
DEVICE_ID="${SMOKE_DEVICE_ID:-smoke-device}"

say "Register or login: phone=$PHONE"
register_resp="$(curl -sS -w $'\n%{http_code}' -X POST "${BASE_URL}/v1/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"phone\":\"$PHONE\",\"password\":\"$PASSWORD\",\"nickname\":\"$NICKNAME\"}" \
  || true)"
register_code="${register_resp##*$'\n'}"
register_body="${register_resp%$'\n'*}"

if [[ "$register_code" == "200" || "$register_code" == "201" ]]; then
  auth_json="$register_body"
else
  login_resp="$(curl -sS -w $'\n%{http_code}' -X POST "${BASE_URL}/v1/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"phone\":\"$PHONE\",\"password\":\"$PASSWORD\"}" \
    || true)"
  login_code="${login_resp##*$'\n'}"
  login_body="${login_resp%$'\n'*}"
  if [[ "$login_code" != "200" ]]; then
    echo "ERROR: register/login failed (register_http=$register_code login_http=$login_code)" >&2
    echo "register_body=$register_body" >&2
    echo "login_body=$login_body" >&2
    exit 1
  fi
  auth_json="$login_body"
fi

ACCESS_TOKEN="$(printf '%s' "$auth_json" | json_get "j.accessToken")"
REFRESH_TOKEN="$(printf '%s' "$auth_json" | json_get "j.refreshToken")"
USER_ID="$(printf '%s' "$auth_json" | json_get "j.user && j.user.id")"
CREATED_AT="$(printf '%s' "$auth_json" | json_get "j.user && j.user.createdAt")"

require_non_empty "ACCESS_TOKEN" "$ACCESS_TOKEN"
require_non_empty "REFRESH_TOKEN" "$REFRESH_TOKEN"
require_non_empty "USER_ID" "$USER_ID"
require_non_empty "CREATED_AT" "$CREATED_AT"

say "Verify /v1/auth/me returns createdAt and inviteBound"
me_json="$(curl -sS "${BASE_URL}/v1/auth/me" -H "Authorization: Bearer ${ACCESS_TOKEN}")"
invite_bound="$(printf '%s' "$me_json" | json_get "j.inviteBound")"
me_created_at="$(printf '%s' "$me_json" | json_get "j.createdAt")"
require_non_empty "me.createdAt" "$me_created_at"

if [[ "$invite_bound" == "true" ]]; then
  say "Invite already bound; skip admin invite creation"
else
  say "Create invite code via admin API"
  ADMIN_KEY="${ADMIN_KEY:-}"
  if [[ -z "$ADMIN_KEY" ]] && [[ -f "./apps/api/.env" ]]; then
    ADMIN_KEY="$(sed -n 's/^ADMIN_API_KEY=//p' ./apps/api/.env | head -n 1 | tr -d '\r')"
  fi
  if [[ -z "$ADMIN_KEY" ]] && [[ -f "/opt/baby-care/apps/api/.env" ]]; then
    ADMIN_KEY="$(sed -n 's/^ADMIN_API_KEY=//p' /opt/baby-care/apps/api/.env | head -n 1 | tr -d '\r')"
  fi
  require_non_empty "ADMIN_KEY (set ADMIN_KEY or ensure apps/api/.env exists)" "$ADMIN_KEY"

  invite_json="$(curl -sS -X POST "${BASE_URL}/v1/admin/invites" \
    -H "x-admin-key: ${ADMIN_KEY}" \
    -H 'Content-Type: application/json' \
    -d '{"count":1}')"
  INVITE_CODE="$(printf '%s' "$invite_json" | json_get "j.codes && j.codes[0]")"
  require_non_empty "INVITE_CODE" "$INVITE_CODE"

  say "Bind invite code"
  bind_json="$(curl -sS -X POST "${BASE_URL}/v1/invites/bind" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "x-device-id: ${DEVICE_ID}" \
    -H 'Content-Type: application/json' \
    -d "{\"code\":\"${INVITE_CODE}\"}")"
fi

say "Verify invite status"
status_json="$(curl -sS "${BASE_URL}/v1/invites/status" -H "Authorization: Bearer ${ACCESS_TOKEN}")"
status_bound="$(printf '%s' "$status_json" | json_get "j.inviteBound")"

if [[ "$status_bound" != "true" ]]; then
  echo "ERROR: expected inviteBound=true, got $status_bound" >&2
  echo "me_json=$me_json" >&2
  echo "status_json=$status_json" >&2
  exit 1
fi

say "Update nickname via PATCH /v1/auth/profile"
NEW_NICK="smoke-$(date +%H%M%S)"
profile_json="$(curl -sS -X PATCH "${BASE_URL}/v1/auth/profile" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "{\"nickname\":\"${NEW_NICK}\"}")"
updated_nick="$(printf '%s' "$profile_json" | json_get "j.nickname")"
if [[ "$updated_nick" != "$NEW_NICK" ]]; then
  echo "ERROR: nickname not updated, expected $NEW_NICK got $updated_nick" >&2
  echo "profile_json=$profile_json" >&2
  exit 1
fi

say "Logout"
curl -sS -X POST "${BASE_URL}/v1/auth/logout" -H "Authorization: Bearer ${ACCESS_TOKEN}" -o /dev/null || true

say "SMOKE OK"
