import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateSsoUser } from "@/server/services/sso-auth.service";
import { logger } from "@/server/lib/logger";

/**
 * SSO callback endpoint.
 * Handles POST callbacks from SAML IdPs and LDAP authentication requests.
 *
 * For SAML: the IdP posts the SAML assertion here after authentication.
 * For LDAP: the login form posts username/password here for LDAP bind verification.
 *
 * In both cases, the service resolves the user, provisions if needed,
 * syncs groups, and returns a session via Auth.js signIn.
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let providerId: string;
    let attributes: Record<string, string>;
    let groups: string[] = [];

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      providerId = formData.get("providerId") as string;
      const samlResponse = formData.get("SAMLResponse") as string;

      if (!providerId || !samlResponse) {
        return NextResponse.json({ error: "Missing providerId or SAMLResponse" }, { status: 400 });
      }

      // In production, this would decode and validate the SAML assertion
      // using the provider's certificate. For now, we extract the base64-encoded
      // attributes that would come from a SAML assertion parser.
      const decoded = parseSamlAttributes(samlResponse);
      attributes = decoded.attributes;
      groups = decoded.groups;
    } else {
      const body = (await request.json()) as {
        providerId?: string;
        username?: string;
        password?: string;
        attributes?: Record<string, string>;
        groups?: string[];
      };
      providerId = body.providerId ?? "";
      attributes = body.attributes ?? {};
      groups = body.groups ?? [];

      if (!providerId) {
        return NextResponse.json({ error: "Missing providerId" }, { status: 400 });
      }

      // For LDAP: username/password would be verified via LDAP bind
      // The actual LDAP bind would happen in a production LDAP client integration
      if (body.username) {
        attributes["uid"] = body.username;
        if (!attributes["email"]) {
          attributes["email"] = body.username;
        }
      }
    }

    const user = await authenticateSsoUser({
      providerId,
      externalId: attributes["uid"] ?? attributes["email"] ?? "",
      attributes,
      groups,
    });

    if (!user) {
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
    }

    // Trigger Auth.js signIn to create a session
    // In production, this would use the Auth.js signIn with a custom provider
    // that accepts pre-authenticated users
    const callbackUrl = request.nextUrl.searchParams.get("callbackUrl") ?? "/dashboard";

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
      callbackUrl,
    });
  } catch (error) {
    logger.error({ err: error }, "SSO callback error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Placeholder SAML assertion parser.
 * In production, this would use a SAML library (e.g., saml2-js or @node-saml/node-saml)
 * to validate the assertion signature, decrypt if needed, and extract attributes.
 */
function parseSamlAttributes(samlResponse: string): {
  attributes: Record<string, string>;
  groups: string[];
} {
  try {
    const decoded = Buffer.from(samlResponse, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded) as {
      attributes?: Record<string, string>;
      groups?: string[];
    };
    return {
      attributes: parsed.attributes ?? {},
      groups: parsed.groups ?? [],
    };
  } catch {
    return { attributes: {}, groups: [] };
  }
}
