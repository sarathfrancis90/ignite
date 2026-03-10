/**
 * Barrel re-export for SSO services.
 * Provider CRUD lives in sso-provider.service.ts (~280 lines).
 * Attribute & Group Mapping CRUD lives in sso-mapping.service.ts (~230 lines).
 */
export {
  SsoServiceError,
  createSsoProvider,
  updateSsoProvider,
  deleteSsoProvider,
  getSsoProviderById,
  listSsoProviders,
  toggleSsoProvider,
  getEnabledSsoProviders,
} from "./sso-provider.service";

export {
  createAttributeMapping,
  updateAttributeMapping,
  deleteAttributeMapping,
  listAttributeMappings,
  createGroupMapping,
  updateGroupMapping,
  deleteGroupMapping,
  listGroupMappings,
} from "./sso-mapping.service";
