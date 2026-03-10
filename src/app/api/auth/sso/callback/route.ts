import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * SSO callback endpoint — NOT YET IMPLEMENTED.
 *
 * This route will handle POST callbacks from SAML IdPs and LDAP authentication
 * requests once a production SAML/LDAP library (e.g., @node-saml/node-saml) is
 * integrated. Until then, it returns 501 Not Implemented to prevent any
 * unauthenticated access.
 *
 * When implemented, this endpoint must:
 * 1. Validate SAML assertion signatures using the provider's certificate
 * 2. Perform actual LDAP bind for credential verification
 * 3. Create an Auth.js session via signIn()
 */
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error: "SSO callback not implemented",
      message:
        "SAML assertion validation and LDAP bind verification require a production SSO library. " +
        "This endpoint will be enabled once @node-saml/node-saml or equivalent is integrated.",
    },
    { status: 501 },
  );
}
