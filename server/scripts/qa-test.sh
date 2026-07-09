#!/usr/bin/env sh
# =============================================================================
# Kitten-EHR API QA Test Suite
# Usage: sh server/scripts/qa-test.sh [BASE_URL]
# Env:   ADMIN_EMAIL, ADMIN_PASSWORD
# =============================================================================

BASE_URL="${1:-http://localhost:5000}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@pawsitivetransformations.org}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin123!}"

# ---------------------------------------------------------------------------
# Dependency guard
# ---------------------------------------------------------------------------
for cmd in curl jq; do
  if ! command -v "$cmd" > /dev/null 2>&1; then
    echo "ERROR: '$cmd' is required but not installed." >&2
    exit 1
  fi
done

# ---------------------------------------------------------------------------
# Counters
# ---------------------------------------------------------------------------
PASS=0
FAIL=0

# ---------------------------------------------------------------------------
# Fixture ID variables (populated during test run)
# ---------------------------------------------------------------------------
TOKEN=""
QA_KITTEN_ID=""
QA_LITTER_ID=""
QA_FOSTER_ID=""
QA_CONTRACT_ID=""
QA_CONTRACT_DELETE_ID=""
QA_TX_ID=""
QA_CONTENT_ID=""
QA_EVENT_ID=""
QA_TEMPLATE_ID=""
QA_WISHLIST_ID=""
QA_ONBOARDING_ID=""
QA_PROTOCOL_ID=""
QA_UPDATE_ID=""

# ---------------------------------------------------------------------------
# Helper: run_test NAME EXPECTED ACTUAL
# ---------------------------------------------------------------------------
run_test() {
  _rt_name="$1"
  _rt_expected="$2"
  _rt_actual="$3"
  if [ "$_rt_actual" = "$_rt_expected" ]; then
    PASS=$((PASS + 1))
    echo "PASS  $_rt_name"
  else
    FAIL=$((FAIL + 1))
    echo "FAIL  $_rt_name: expected $_rt_expected got $_rt_actual"
  fi
}

# ---------------------------------------------------------------------------
# Helper: assert_field NAME BODY JQ_PATH EXPECTED
# ---------------------------------------------------------------------------
assert_field() {
  _af_name="$1"
  _af_body="$2"
  _af_path="$3"
  _af_expected="$4"
  _af_actual=$(echo "$_af_body" | jq -r "$_af_path" 2>/dev/null)
  _af_jq_exit=$?
  if [ $_af_jq_exit -ne 0 ]; then
    FAIL=$((FAIL + 1))
    echo "FAIL  $_af_name: jq parse error"
    return
  fi
  if [ "$_af_actual" = "$_af_expected" ]; then
    PASS=$((PASS + 1))
    echo "PASS  $_af_name"
  else
    FAIL=$((FAIL + 1))
    echo "FAIL  $_af_name: expected '$_af_expected' got '$_af_actual'"
  fi
}

# ---------------------------------------------------------------------------
# Helper: assert_array NAME BODY JQ_PATH
# ---------------------------------------------------------------------------
assert_array() {
  _aa_name="$1"
  _aa_body="$2"
  _aa_path="$3"
  _aa_type=$(echo "$_aa_body" | jq -r "${_aa_path} | type" 2>/dev/null)
  _aa_jq_exit=$?
  if [ $_aa_jq_exit -ne 0 ]; then
    FAIL=$((FAIL + 1))
    echo "FAIL  $_aa_name: jq parse error"
    return
  fi
  if [ "$_aa_type" = "array" ]; then
    PASS=$((PASS + 1))
    echo "PASS  $_aa_name"
  else
    FAIL=$((FAIL + 1))
    echo "FAIL  $_aa_name: expected array got $_aa_type"
  fi
}

# ---------------------------------------------------------------------------
# Cleanup function — always runs via trap
# ---------------------------------------------------------------------------
cleanup() {
  echo ""
  echo "--- Cleanup ---"

  if [ -n "$QA_TX_ID" ]; then
    STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
      -X DELETE \
      -H "Authorization: Bearer $TOKEN" \
      "$BASE_URL/api/transactions/$QA_TX_ID")
    run_test "cleanup-transaction" "204" "$STATUS"
  else
    echo "SKIP  cleanup-transaction (no ID)"
  fi

  if [ -n "$QA_TEMPLATE_ID" ]; then
    STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
      -X DELETE \
      -H "Authorization: Bearer $TOKEN" \
      "$BASE_URL/api/email-templates/$QA_TEMPLATE_ID")
    run_test "cleanup-email-template" "204" "$STATUS"
  else
    echo "SKIP  cleanup-email-template (no ID)"
  fi

  if [ -n "$QA_WISHLIST_ID" ]; then
    STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
      -X DELETE \
      -H "Authorization: Bearer $TOKEN" \
      "$BASE_URL/api/wishlists/$QA_WISHLIST_ID")
    run_test "cleanup-wishlist" "204" "$STATUS"
  else
    echo "SKIP  cleanup-wishlist (no ID)"
  fi

  if [ -n "$QA_CONTENT_ID" ]; then
    STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
      -X DELETE \
      -H "Authorization: Bearer $TOKEN" \
      "$BASE_URL/api/content/$QA_CONTENT_ID")
    run_test "cleanup-content" "204" "$STATUS"
  else
    echo "SKIP  cleanup-content (no ID)"
  fi

  if [ -n "$QA_EVENT_ID" ]; then
    STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
      -X DELETE \
      -H "Authorization: Bearer $TOKEN" \
      "$BASE_URL/api/events/$QA_EVENT_ID")
    run_test "cleanup-event" "204" "$STATUS"
  else
    echo "SKIP  cleanup-event (no ID)"
  fi

  # Delete the second contract (the SENT one kept for cleanup)
  if [ -n "$QA_CONTRACT_DELETE_ID" ]; then
    STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
      -X DELETE \
      -H "Authorization: Bearer $TOKEN" \
      "$BASE_URL/api/contracts/$QA_CONTRACT_DELETE_ID")
    run_test "cleanup-contract" "204" "$STATUS"
  else
    echo "SKIP  cleanup-contract (no ID)"
  fi

  # Fosters — try delete, skip gracefully if 404/405
  if [ -n "$QA_FOSTER_ID" ]; then
    STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
      -X DELETE \
      -H "Authorization: Bearer $TOKEN" \
      "$BASE_URL/api/fosters/$QA_FOSTER_ID")
    if [ "$STATUS" = "204" ] || [ "$STATUS" = "200" ]; then
      PASS=$((PASS + 1))
      echo "PASS  cleanup-foster"
    elif [ "$STATUS" = "404" ] || [ "$STATUS" = "405" ] || [ "$STATUS" = "400" ]; then
      echo "SKIP  cleanup-foster (no DELETE route or already gone)"
    else
      run_test "cleanup-foster" "204" "$STATUS"
    fi
  else
    echo "SKIP  cleanup-foster (no ID)"
  fi

  # Litters — try delete, skip gracefully if 404/405
  if [ -n "$QA_LITTER_ID" ]; then
    STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
      -X DELETE \
      -H "Authorization: Bearer $TOKEN" \
      "$BASE_URL/api/litters/$QA_LITTER_ID")
    if [ "$STATUS" = "204" ] || [ "$STATUS" = "200" ]; then
      PASS=$((PASS + 1))
      echo "PASS  cleanup-litter"
    elif [ "$STATUS" = "404" ] || [ "$STATUS" = "405" ] || [ "$STATUS" = "400" ]; then
      echo "SKIP  cleanup-litter (no DELETE route or already gone)"
    else
      run_test "cleanup-litter" "204" "$STATUS"
    fi
  else
    echo "SKIP  cleanup-litter (no ID)"
  fi

  # Kitten last — cascades sub-resources
  if [ -n "$QA_KITTEN_ID" ]; then
    STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
      -X DELETE \
      -H "Authorization: Bearer $TOKEN" \
      "$BASE_URL/api/kittens/$QA_KITTEN_ID")
    run_test "cleanup-kitten" "204" "$STATUS"
  else
    echo "SKIP  cleanup-kitten (no ID)"
  fi

  # Print summary
  echo ""
  echo "QA Summary: $PASS/$((PASS + FAIL)) passed"
}

trap cleanup EXIT

# =============================================================================
# START TESTS
# =============================================================================
echo ""
echo "Kitten-EHR QA — $BASE_URL"
echo ""

# ---------------------------------------------------------------------------
# PRE-AUTH 401 PROBES (must run before login so they are token-independent)
# ---------------------------------------------------------------------------
echo "--- Pre-auth 401 probes ---"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  "$BASE_URL/api/kittens")
run_test "pre-auth-kittens-401" "401" "$STATUS"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  "$BASE_URL/api/dashboard/metrics")
run_test "pre-auth-dashboard-401" "401" "$STATUS"

# ---------------------------------------------------------------------------
# SECTION: Authentication
# ---------------------------------------------------------------------------
echo ""
echo "--- Authentication ---"

# Invalid login → 401
STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"bad@example.com","password":"wrong"}' \
  "$BASE_URL/api/auth/login")
run_test "auth-invalid-login-401" "401" "$STATUS"

# Valid login → 200 + token
STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  "$BASE_URL/api/auth/login")
BODY=$(cat /tmp/qa_body.json)
run_test "auth-valid-login-200" "200" "$STATUS"

TOKEN=$(echo "$BODY" | jq -r '.token' 2>/dev/null)
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "FATAL: Failed to obtain admin token. Cannot continue." >&2
  exit 1
fi

# GET /api/auth/me with token → 200 + email matches
STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/auth/me")
BODY=$(cat /tmp/qa_body.json)
run_test "auth-me-200" "200" "$STATUS"
assert_field "auth-me-email" "$BODY" ".email" "$ADMIN_EMAIL"

# GET /api/auth/me without token → 401
STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  "$BASE_URL/api/auth/me")
run_test "auth-me-no-token-401" "401" "$STATUS"

# ---------------------------------------------------------------------------
# SECTION: Health
# ---------------------------------------------------------------------------
echo ""
echo "--- Health ---"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  "$BASE_URL/api/health")
BODY=$(cat /tmp/qa_body.json)
run_test "health-200" "200" "$STATUS"
assert_field "health-status-ok" "$BODY" ".status" "ok"

# ---------------------------------------------------------------------------
# SECTION: Public Endpoints
# ---------------------------------------------------------------------------
echo ""
echo "--- Public Endpoints ---"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  "$BASE_URL/api/public/kittens")
BODY=$(cat /tmp/qa_body.json)
run_test "public-kittens-200" "200" "$STATUS"
assert_array "public-kittens-is-array" "$BODY" "."

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  "$BASE_URL/api/public/stats")
run_test "public-stats-200" "200" "$STATUS"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  "$BASE_URL/api/public/settings")
run_test "public-settings-200" "200" "$STATUS"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  "$BASE_URL/api/public/content")
BODY=$(cat /tmp/qa_body.json)
run_test "public-content-200" "200" "$STATUS"
assert_array "public-content-is-array" "$BODY" "."

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  "$BASE_URL/api/public/events")
run_test "public-events-200" "200" "$STATUS"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"type":"FOSTER","formData":{"name":"QA Applicant","email":"qa@test.com"}}' \
  "$BASE_URL/api/public/applications")
run_test "public-applications-post-201" "201" "$STATUS"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"amount":1,"donorName":"QA Donor","donorEmail":"qa-donor@test.com","message":"QA"}' \
  "$BASE_URL/api/public/donations")
run_test "public-donations-post-201" "201" "$STATUS"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  "$BASE_URL/api/public/wishlists")
run_test "public-wishlists-200" "200" "$STATUS"

# ---------------------------------------------------------------------------
# SECTION: Settings
# ---------------------------------------------------------------------------
echo ""
echo "--- Settings ---"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/settings")
BODY=$(cat /tmp/qa_body.json)
run_test "settings-get-200" "200" "$STATUS"
# orgName should be a non-empty string
_orgName=$(echo "$BODY" | jq -r '.orgName // empty' 2>/dev/null)
if [ -n "$_orgName" ] && [ "$_orgName" != "null" ]; then
  PASS=$((PASS + 1))
  echo "PASS  settings-orgName-present"
else
  FAIL=$((FAIL + 1))
  echo "FAIL  settings-orgName-present: orgName missing or empty"
fi

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stripeLink":"https://buy.stripe.com/test"}' \
  "$BASE_URL/api/settings")
BODY=$(cat /tmp/qa_body.json)
run_test "settings-patch-200" "200" "$STATUS"
assert_field "settings-patch-stripeLink" "$BODY" ".stripeLink" "https://buy.stripe.com/test"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"orgName":""}' \
  "$BASE_URL/api/settings")
run_test "settings-patch-empty-orgName-400" "400" "$STATUS"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  "$BASE_URL/api/settings")
run_test "settings-no-token-401" "401" "$STATUS"

# ---------------------------------------------------------------------------
# SECTION: Kittens — CRUD + stats
# ---------------------------------------------------------------------------
echo ""
echo "--- Kittens ---"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/kittens")
BODY=$(cat /tmp/qa_body.json)
run_test "kittens-list-200" "200" "$STATUS"
assert_array "kittens-list-is-array" "$BODY" "."

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"QA-Kitten","breed":"Domestic Shorthair","status":"In Foster Care"}' \
  "$BASE_URL/api/kittens")
BODY=$(cat /tmp/qa_body.json)
run_test "kittens-create-201" "201" "$STATUS"
QA_KITTEN_ID=$(echo "$BODY" | jq -r '.id // empty' 2>/dev/null)
if [ -z "$QA_KITTEN_ID" ] || [ "$QA_KITTEN_ID" = "null" ]; then
  FAIL=$((FAIL + 1))
  echo "FAIL  kittens-create-id-extract: id missing from response"
else
  PASS=$((PASS + 1))
  echo "PASS  kittens-create-id-extract"
fi

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/kittens/$QA_KITTEN_ID")
BODY=$(cat /tmp/qa_body.json)
run_test "kittens-get-200" "200" "$STATUS"
assert_field "kittens-get-id" "$BODY" ".id" "$QA_KITTEN_ID"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"QA-Kitten-Updated"}' \
  "$BASE_URL/api/kittens/$QA_KITTEN_ID")
BODY=$(cat /tmp/qa_body.json)
run_test "kittens-patch-200" "200" "$STATUS"
assert_field "kittens-patch-name" "$BODY" ".name" "QA-Kitten-Updated"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/kittens/dashboard/stats")
BODY=$(cat /tmp/qa_body.json)
run_test "kittens-dashboard-stats-200" "200" "$STATUS"
_activeKittens=$(echo "$BODY" | jq -r '.activeKittens' 2>/dev/null)
case "$_activeKittens" in
  ''|null) FAIL=$((FAIL + 1)); echo "FAIL  kittens-dashboard-activeKittens-numeric: got null/empty" ;;
  *[!0-9]*) FAIL=$((FAIL + 1)); echo "FAIL  kittens-dashboard-activeKittens-numeric: not a number: $_activeKittens" ;;
  *) PASS=$((PASS + 1)); echo "PASS  kittens-dashboard-activeKittens-numeric" ;;
esac

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/kittens/$QA_KITTEN_ID/placements")
BODY=$(cat /tmp/qa_body.json)
run_test "kittens-placements-200" "200" "$STATUS"
assert_array "kittens-placements-is-array" "$BODY" "."

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/kittens/$QA_KITTEN_ID/wishlists")
run_test "kittens-wishlists-200" "200" "$STATUS"

# ---------------------------------------------------------------------------
# SECTION: Kitten sub-resources (updates, sponsorships, documents, protocols)
# ---------------------------------------------------------------------------
echo ""
echo "--- Kitten Sub-resources ---"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/kittens/$QA_KITTEN_ID/updates")
BODY=$(cat /tmp/qa_body.json)
run_test "kitten-updates-list-200" "200" "$STATUS"
assert_array "kitten-updates-is-array" "$BODY" "."

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"QA update content","isPublic":false}' \
  "$BASE_URL/api/kittens/$QA_KITTEN_ID/updates")
BODY=$(cat /tmp/qa_body.json)
run_test "kitten-update-create-201" "201" "$STATUS"
QA_UPDATE_ID=$(echo "$BODY" | jq -r '.id // empty' 2>/dev/null)

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"QA updated content"}' \
  "$BASE_URL/api/kittens/$QA_KITTEN_ID/updates/$QA_UPDATE_ID")
run_test "kitten-update-patch-200" "200" "$STATUS"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/kittens/$QA_KITTEN_ID/updates/$QA_UPDATE_ID")
run_test "kitten-update-delete-204" "204" "$STATUS"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/kittens/$QA_KITTEN_ID/sponsorships")
BODY=$(cat /tmp/qa_body.json)
run_test "kitten-sponsorships-list-200" "200" "$STATUS"
assert_array "kitten-sponsorships-is-array" "$BODY" "."

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sponsorName":"QA Sponsor","amount":10.00,"tier":"Bronze"}' \
  "$BASE_URL/api/kittens/$QA_KITTEN_ID/sponsorships")
run_test "kitten-sponsorship-create-201" "201" "$STATUS"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/kittens/$QA_KITTEN_ID/documents")
BODY=$(cat /tmp/qa_body.json)
run_test "kitten-documents-list-200" "200" "$STATUS"
assert_array "kitten-documents-is-array" "$BODY" "."

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/kittens/$QA_KITTEN_ID/documents/photos")
BODY=$(cat /tmp/qa_body.json)
run_test "kitten-documents-photos-200" "200" "$STATUS"
assert_array "kitten-documents-photos-array" "$BODY" ".photos"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/kittens/$QA_KITTEN_ID/protocols")
run_test "kitten-protocols-200" "200" "$STATUS"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/kittens/$QA_KITTEN_ID/protocols/doses")
run_test "kitten-protocols-doses-200" "200" "$STATUS"

# ---------------------------------------------------------------------------
# SECTION: Litters
# ---------------------------------------------------------------------------
echo ""
echo "--- Litters ---"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/litters")
BODY=$(cat /tmp/qa_body.json)
run_test "litters-list-200" "200" "$STATUS"
assert_array "litters-list-is-array" "$BODY" "."

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"QA-Litter","intakeDate":"2026-07-09"}' \
  "$BASE_URL/api/litters")
BODY=$(cat /tmp/qa_body.json)
run_test "litters-create-201" "201" "$STATUS"
QA_LITTER_ID=$(echo "$BODY" | jq -r '.id // empty' 2>/dev/null)

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/litters/$QA_LITTER_ID")
BODY=$(cat /tmp/qa_body.json)
run_test "litters-get-200" "200" "$STATUS"
assert_field "litters-get-id" "$BODY" ".id" "$QA_LITTER_ID"

# ---------------------------------------------------------------------------
# SECTION: Fosters
# ---------------------------------------------------------------------------
echo ""
echo "--- Fosters ---"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/fosters")
BODY=$(cat /tmp/qa_body.json)
run_test "fosters-list-200" "200" "$STATUS"
assert_array "fosters-list-is-array" "$BODY" "."

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"QA Foster","phone":"555-9999","email":"qa-foster@test.com","address":"123 QA St"}' \
  "$BASE_URL/api/fosters")
BODY=$(cat /tmp/qa_body.json)
run_test "fosters-create-201" "201" "$STATUS"
QA_FOSTER_ID=$(echo "$BODY" | jq -r '.id // empty' 2>/dev/null)

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/fosters/$QA_FOSTER_ID")
run_test "fosters-get-200" "200" "$STATUS"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/fosters/$QA_FOSTER_ID/placements")
BODY=$(cat /tmp/qa_body.json)
run_test "fosters-placements-200" "200" "$STATUS"
assert_array "fosters-placements-is-array" "$BODY" "."

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/fosters/$QA_FOSTER_ID/wishlists")
run_test "fosters-wishlists-200" "200" "$STATUS"

# ---------------------------------------------------------------------------
# SECTION: Medical Records
# ---------------------------------------------------------------------------
echo ""
echo "--- Medical Records ---"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/medical/kitten/$QA_KITTEN_ID")
run_test "medical-get-kitten-200" "200" "$STATUS"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"kittenId\":$QA_KITTEN_ID,\"type\":\"FVRCP\",\"dateGiven\":\"2026-07-09\"}" \
  "$BASE_URL/api/medical/vaccines")
run_test "medical-vaccines-create-201" "201" "$STATUS"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"kittenId\":$QA_KITTEN_ID,\"name\":\"Panacur\",\"startDate\":\"2026-07-09\"}" \
  "$BASE_URL/api/medical/medications")
run_test "medical-medications-create-201" "201" "$STATUS"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"kittenId\":$QA_KITTEN_ID,\"date\":\"2026-07-09\",\"reason\":\"Wellness check\"}" \
  "$BASE_URL/api/medical/vet-appointments")
run_test "medical-vet-appointments-create-201" "201" "$STATUS"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"kittenId\":$QA_KITTEN_ID,\"notes\":\"QA general medical note\"}" \
  "$BASE_URL/api/medical")
run_test "medical-general-create-201" "201" "$STATUS"

# ---------------------------------------------------------------------------
# SECTION: Weight Logs
# ---------------------------------------------------------------------------
echo ""
echo "--- Weight Logs ---"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/weights/kitten/$QA_KITTEN_ID")
BODY=$(cat /tmp/qa_body.json)
run_test "weights-get-kitten-200" "200" "$STATUS"
assert_array "weights-is-array" "$BODY" "."

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"kittenId\":$QA_KITTEN_ID,\"date\":\"2026-07-09\",\"weightOz\":5.5,\"weightGrams\":155}" \
  "$BASE_URL/api/weights")
run_test "weights-create-201" "201" "$STATUS"

# ---------------------------------------------------------------------------
# SECTION: Applications
# ---------------------------------------------------------------------------
echo ""
echo "--- Applications ---"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/applications")
BODY=$(cat /tmp/qa_body.json)
run_test "applications-list-200" "200" "$STATUS"
assert_array "applications-is-array" "$BODY" "."

# Get first application ID for patch test
APP_ID=$(echo "$BODY" | jq -r '.[0].id // empty' 2>/dev/null)
if [ -n "$APP_ID" ] && [ "$APP_ID" != "null" ]; then
  STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
    -X PATCH \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"status":"Reviewing"}' \
    "$BASE_URL/api/applications/$APP_ID")
  run_test "applications-patch-200" "200" "$STATUS"
else
  echo "SKIP  applications-patch-200 (no existing application to patch)"
fi

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  "$BASE_URL/api/applications")
run_test "applications-no-token-401" "401" "$STATUS"

# ---------------------------------------------------------------------------
# SECTION: Contracts (full lifecycle)
# ---------------------------------------------------------------------------
echo ""
echo "--- Contracts ---"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/contracts")
BODY=$(cat /tmp/qa_body.json)
run_test "contracts-list-200" "200" "$STATUS"
assert_array "contracts-is-array" "$BODY" "."

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/contracts/stats")
BODY=$(cat /tmp/qa_body.json)
run_test "contracts-stats-200" "200" "$STATUS"
_total=$(echo "$BODY" | jq -r '.total' 2>/dev/null)
case "$_total" in
  ''|null) FAIL=$((FAIL + 1)); echo "FAIL  contracts-stats-total-numeric: got null/empty" ;;
  *[!0-9]*) FAIL=$((FAIL + 1)); echo "FAIL  contracts-stats-total-numeric: not a number: $_total" ;;
  *) PASS=$((PASS + 1)); echo "PASS  contracts-stats-total-numeric" ;;
esac

# Create first contract (will be signed — test immutability)
STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"FOSTER","signerName":"QA Signer","signerEmail":"qa-sign@test.com","kittenName":"QA Cat","documentVersion":"1.0"}' \
  "$BASE_URL/api/contracts")
BODY=$(cat /tmp/qa_body.json)
run_test "contracts-create-201" "201" "$STATUS"
QA_CONTRACT_ID=$(echo "$BODY" | jq -r '.id // empty' 2>/dev/null)

# Create second contract (kept in SENT state for cleanup)
STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"FOSTER","signerName":"QA Signer Delete","signerEmail":"qa-delete@test.com","kittenName":"QA Cat Delete","documentVersion":"1.0"}' \
  "$BASE_URL/api/contracts")
BODY=$(cat /tmp/qa_body.json)
run_test "contracts-create-delete-201" "201" "$STATUS"
QA_CONTRACT_DELETE_ID=$(echo "$BODY" | jq -r '.id // empty' 2>/dev/null)

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/contracts/$QA_CONTRACT_ID")
run_test "contracts-get-200" "200" "$STATUS"

# PATCH on SENT contract
STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"signerName":"QA Signer Updated"}' \
  "$BASE_URL/api/contracts/$QA_CONTRACT_ID")
run_test "contracts-patch-sent-200" "200" "$STATUS"

# Sign the contract
STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"signatureImage":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==","signedAt":"2026-07-09T00:00:00.000Z","ipAddress":"192.0.2.1","signatureAudit":{"signedVia":"qa-test"}}' \
  "$BASE_URL/api/contracts/$QA_CONTRACT_ID/sign")
BODY=$(cat /tmp/qa_body.json)
run_test "contracts-sign-200" "200" "$STATUS"
assert_field "contracts-sign-status-SIGNED" "$BODY" ".status" "SIGNED"

# PATCH on SIGNED contract must return 400
STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"signerName":"Should Fail"}' \
  "$BASE_URL/api/contracts/$QA_CONTRACT_ID")
run_test "contracts-patch-signed-400" "400" "$STATUS"

# ---------------------------------------------------------------------------
# SECTION: Onboarding
# ---------------------------------------------------------------------------
echo ""
echo "--- Onboarding ---"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/onboarding")
BODY=$(cat /tmp/qa_body.json)
run_test "onboarding-list-200" "200" "$STATUS"
assert_array "onboarding-is-array" "$BODY" "."

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"applicantName":"QA Applicant","applicantEmail":"qa-onboard@test.com"}' \
  "$BASE_URL/api/onboarding")
BODY=$(cat /tmp/qa_body.json)
run_test "onboarding-create-201" "201" "$STATUS"
QA_ONBOARDING_ID=$(echo "$BODY" | jq -r '.id // empty' 2>/dev/null)

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/onboarding/$QA_ONBOARDING_ID")
BODY=$(cat /tmp/qa_body.json)
run_test "onboarding-get-200" "200" "$STATUS"

# Patch checklist item if one exists
CHECKLIST_ITEM_ID=$(echo "$BODY" | jq -r '.checklistItems[0].id // empty' 2>/dev/null)
if [ -n "$CHECKLIST_ITEM_ID" ] && [ "$CHECKLIST_ITEM_ID" != "null" ]; then
  STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
    -X PATCH \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"isComplete":true}' \
    "$BASE_URL/api/onboarding/$QA_ONBOARDING_ID/checklist/$CHECKLIST_ITEM_ID")
  run_test "onboarding-checklist-patch-200" "200" "$STATUS"
else
  echo "SKIP  onboarding-checklist-patch-200 (no checklist items)"
fi

# ---------------------------------------------------------------------------
# SECTION: Content
# ---------------------------------------------------------------------------
echo ""
echo "--- Content ---"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/content")
BODY=$(cat /tmp/qa_body.json)
run_test "content-list-200" "200" "$STATUS"
assert_array "content-is-array" "$BODY" "."

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/content/foster-checklist")
run_test "content-foster-checklist-200" "200" "$STATUS"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"QA Content","slug":"qa-content-slug","body":"QA body","category":"education"}' \
  "$BASE_URL/api/content")
BODY=$(cat /tmp/qa_body.json)
run_test "content-create-201" "201" "$STATUS"
QA_CONTENT_ID=$(echo "$BODY" | jq -r '.id // empty' 2>/dev/null)

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/content/$QA_CONTENT_ID")
run_test "content-get-200" "200" "$STATUS"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"QA Content Updated","slug":"qa-content-slug","body":"QA body updated","category":"education"}' \
  "$BASE_URL/api/content/$QA_CONTENT_ID")
run_test "content-put-200" "200" "$STATUS"

# ---------------------------------------------------------------------------
# SECTION: Events
# ---------------------------------------------------------------------------
echo ""
echo "--- Events ---"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/events")
BODY=$(cat /tmp/qa_body.json)
run_test "events-list-200" "200" "$STATUS"
assert_array "events-is-array" "$BODY" "."

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"QA Event","slug":"qa-event-slug","date":"2026-12-01T10:00:00.000Z","location":"QA Venue"}' \
  "$BASE_URL/api/events")
BODY=$(cat /tmp/qa_body.json)
run_test "events-create-201" "201" "$STATUS"
QA_EVENT_ID=$(echo "$BODY" | jq -r '.id // empty' 2>/dev/null)

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/events/$QA_EVENT_ID")
run_test "events-get-200" "200" "$STATUS"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"QA Event Updated","slug":"qa-event-slug","date":"2026-12-01T10:00:00.000Z","location":"QA Venue"}' \
  "$BASE_URL/api/events/$QA_EVENT_ID")
run_test "events-put-200" "200" "$STATUS"

# ---------------------------------------------------------------------------
# SECTION: Finance / Transactions
# ---------------------------------------------------------------------------
echo ""
echo "--- Finance / Transactions ---"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/transactions/stats")
BODY=$(cat /tmp/qa_body.json)
run_test "transactions-stats-200" "200" "$STATUS"
# income and expenses should be non-null objects
_income=$(echo "$BODY" | jq -r '.income' 2>/dev/null)
_expenses=$(echo "$BODY" | jq -r '.expenses' 2>/dev/null)
if [ "$_income" != "null" ] && [ -n "$_income" ]; then
  PASS=$((PASS + 1)); echo "PASS  transactions-stats-income-present"
else
  FAIL=$((FAIL + 1)); echo "FAIL  transactions-stats-income-present: income is null/missing"
fi
if [ "$_expenses" != "null" ] && [ -n "$_expenses" ]; then
  PASS=$((PASS + 1)); echo "PASS  transactions-stats-expenses-present"
else
  FAIL=$((FAIL + 1)); echo "FAIL  transactions-stats-expenses-present: expenses is null/missing"
fi

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/transactions")
BODY=$(cat /tmp/qa_body.json)
run_test "transactions-list-200" "200" "$STATUS"
assert_array "transactions-is-array" "$BODY" "."

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/transactions?type=INVALID")
run_test "transactions-invalid-type-400" "400" "$STATUS"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"INCOME","category":"Donation","amount":1.00,"date":"2026-07-09","description":"QA test"}' \
  "$BASE_URL/api/transactions")
BODY=$(cat /tmp/qa_body.json)
run_test "transactions-create-201" "201" "$STATUS"
QA_TX_ID=$(echo "$BODY" | jq -r '.id // empty' 2>/dev/null)

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"INCOME","category":"Donation","amount":-5,"date":"2026-07-09","description":"QA negative"}' \
  "$BASE_URL/api/transactions")
run_test "transactions-negative-amount-400" "400" "$STATUS"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/transactions/999999")
run_test "transactions-delete-notfound-404" "404" "$STATUS"

# ---------------------------------------------------------------------------
# SECTION: Email Templates
# ---------------------------------------------------------------------------
echo ""
echo "--- Email Templates ---"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/email-templates")
BODY=$(cat /tmp/qa_body.json)
run_test "email-templates-list-200" "200" "$STATUS"
assert_array "email-templates-is-array" "$BODY" "."

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/email-templates/logs")
run_test "email-templates-logs-200" "200" "$STATUS"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key":"qa_test_template","name":"QA Template","subject":"QA Subject","category":"General","bodyHtml":"<p>QA</p>","bodyText":"QA"}' \
  "$BASE_URL/api/email-templates")
BODY=$(cat /tmp/qa_body.json)
run_test "email-templates-create-201" "201" "$STATUS"
QA_TEMPLATE_ID=$(echo "$BODY" | jq -r '.id // empty' 2>/dev/null)

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"subject":"QA Updated Subject"}' \
  "$BASE_URL/api/email-templates/$QA_TEMPLATE_ID")
run_test "email-templates-patch-200" "200" "$STATUS"

# ---------------------------------------------------------------------------
# SECTION: Wishlists
# ---------------------------------------------------------------------------
echo ""
echo "--- Wishlists ---"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/wishlists")
BODY=$(cat /tmp/qa_body.json)
run_test "wishlists-list-200" "200" "$STATUS"
assert_array "wishlists-is-array" "$BODY" "."

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ownerType":"ORG","ownerId":1,"retailer":"AMAZON","url":"https://amazon.com/hz/wishlist/ls/QA123","label":"QA Wishlist"}' \
  "$BASE_URL/api/wishlists")
BODY=$(cat /tmp/qa_body.json)
run_test "wishlists-create-201" "201" "$STATUS"
QA_WISHLIST_ID=$(echo "$BODY" | jq -r '.id // empty' 2>/dev/null)

# ---------------------------------------------------------------------------
# SECTION: Social Posts
# ---------------------------------------------------------------------------
echo ""
echo "--- Social Posts ---"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/social-posts")
BODY=$(cat /tmp/qa_body.json)
run_test "social-posts-list-200" "200" "$STATUS"
assert_array "social-posts-is-array" "$BODY" "."

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"body":"QA social post","platforms":["FACEBOOK"],"status":"DRAFT"}' \
  "$BASE_URL/api/social-posts")
run_test "social-posts-create-201" "201" "$STATUS"

# ---------------------------------------------------------------------------
# SECTION: Protocol Library
# ---------------------------------------------------------------------------
echo ""
echo "--- Protocol Library ---"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/protocols")
BODY=$(cat /tmp/qa_body.json)
run_test "protocols-list-200" "200" "$STATUS"
assert_array "protocols-is-array" "$BODY" "."

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"QA Protocol","description":"QA protocol description","isActive":true}' \
  "$BASE_URL/api/protocols")
BODY=$(cat /tmp/qa_body.json)
run_test "protocols-create-201" "201" "$STATUS"
QA_PROTOCOL_ID=$(echo "$BODY" | jq -r '.id // empty' 2>/dev/null)

# ---------------------------------------------------------------------------
# SECTION: Users and Roles
# ---------------------------------------------------------------------------
echo ""
echo "--- Users and Roles ---"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/users")
BODY=$(cat /tmp/qa_body.json)
run_test "users-list-200" "200" "$STATUS"
assert_array "users-is-array" "$BODY" "."

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/roles")
BODY=$(cat /tmp/qa_body.json)
run_test "roles-list-200" "200" "$STATUS"
assert_array "roles-is-array" "$BODY" "."

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/roles/permissions")
BODY=$(cat /tmp/qa_body.json)
run_test "roles-permissions-200" "200" "$STATUS"
assert_array "roles-permissions-is-array" "$BODY" "."

# ---------------------------------------------------------------------------
# SECTION: Dashboard
# ---------------------------------------------------------------------------
echo ""
echo "--- Dashboard ---"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/dashboard/metrics")
run_test "dashboard-metrics-200" "200" "$STATUS"

# ---------------------------------------------------------------------------
# SECTION: AI Caption
# ---------------------------------------------------------------------------
echo ""
echo "--- AI Caption ---"

STATUS=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"kittenName":"QA-Kitten","description":"A tiny kitten"}' \
  "$BASE_URL/api/generate-caption")
if [ "$STATUS" = "200" ] || [ "$STATUS" = "503" ]; then
  PASS=$((PASS + 1))
  echo "PASS  ai-generate-caption-200-or-503"
else
  FAIL=$((FAIL + 1))
  echo "FAIL  ai-generate-caption-200-or-503: expected 200 or 503 got $STATUS"
fi

# ---------------------------------------------------------------------------
# SECTION: Rate Limiting
# ---------------------------------------------------------------------------
echo ""
echo "--- Rate Limiting ---"

# Loop 6 times; track if any 429 is returned.
# The applicationLimiter is 5/15min. Earlier calls in this run may have used
# some of the budget. We check if at least one 429 appears among 6 calls.
_rate_got_429=0
_i=0
while [ $_i -lt 6 ]; do
  _i=$((_i + 1))
  _rl_status=$(curl -s -o /tmp/qa_body.json -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"type":"FOSTER","formData":{"name":"QA Rate Limit","email":"qa-rl@test.com"}}' \
    "$BASE_URL/api/public/applications")
  if [ "$_rl_status" = "429" ]; then
    _rate_got_429=1
  fi
done

if [ "$_rate_got_429" = "1" ]; then
  PASS=$((PASS + 1))
  echo "PASS  rate-limit-429-triggered"
else
  FAIL=$((FAIL + 1))
  echo "FAIL  rate-limit-429-triggered: no 429 received in 6 unauthenticated calls"
fi

# ---------------------------------------------------------------------------
# END OF TESTS — cleanup runs via trap EXIT, then we exit with correct code
# ---------------------------------------------------------------------------
if [ "$FAIL" -eq 0 ]; then
  exit 0
else
  exit 1
fi
