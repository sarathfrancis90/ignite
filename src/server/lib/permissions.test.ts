import { describe, it, expect } from "vitest";
import {
  Action,
  GLOBAL_ROLE_PERMISSIONS,
  RESOURCE_ROLE_PERMISSIONS,
  globalRoleHasPermission,
  resourceRoleHasPermission,
} from "./permissions";

describe("permissions", () => {
  describe("Action constants", () => {
    it("defines all expected user actions", () => {
      expect(Action.USER_READ_OWN).toBe("user.read.own");
      expect(Action.USER_UPDATE_OWN).toBe("user.update.own");
      expect(Action.USER_READ_ANY).toBe("user.read.any");
      expect(Action.USER_DEACTIVATE).toBe("user.deactivate");
      expect(Action.USER_CHANGE_ROLE).toBe("user.changeRole");
    });

    it("defines all expected campaign actions", () => {
      expect(Action.CAMPAIGN_CREATE).toBe("campaign.create");
      expect(Action.CAMPAIGN_READ).toBe("campaign.read");
      expect(Action.CAMPAIGN_UPDATE).toBe("campaign.update");
      expect(Action.CAMPAIGN_MANAGE).toBe("campaign.manage");
      expect(Action.CAMPAIGN_TRANSITION).toBe("campaign.transition");
    });

    it("defines all expected admin actions", () => {
      expect(Action.ADMIN_ACCESS).toBe("admin.access");
      expect(Action.ADMIN_MANAGE_USERS).toBe("admin.manageUsers");
      expect(Action.ADMIN_MANAGE_ORG_UNITS).toBe("admin.manageOrgUnits");
    });
  });

  describe("globalRoleHasPermission", () => {
    it("PLATFORM_ADMIN has permission for everything", () => {
      expect(globalRoleHasPermission("PLATFORM_ADMIN", Action.ADMIN_ACCESS)).toBe(true);
      expect(globalRoleHasPermission("PLATFORM_ADMIN", Action.USER_DEACTIVATE)).toBe(true);
      expect(globalRoleHasPermission("PLATFORM_ADMIN", Action.CAMPAIGN_DELETE)).toBe(true);
    });

    it("INNOVATION_MANAGER can create campaigns", () => {
      expect(globalRoleHasPermission("INNOVATION_MANAGER", Action.CAMPAIGN_CREATE)).toBe(true);
    });

    it("INNOVATION_MANAGER can read other users", () => {
      expect(globalRoleHasPermission("INNOVATION_MANAGER", Action.USER_READ_ANY)).toBe(true);
    });

    it("INNOVATION_MANAGER cannot access admin panel", () => {
      expect(globalRoleHasPermission("INNOVATION_MANAGER", Action.ADMIN_ACCESS)).toBe(false);
    });

    it("INNOVATION_MANAGER cannot deactivate users", () => {
      expect(globalRoleHasPermission("INNOVATION_MANAGER", Action.USER_DEACTIVATE)).toBe(false);
    });

    it("MEMBER can read own profile", () => {
      expect(globalRoleHasPermission("MEMBER", Action.USER_READ_OWN)).toBe(true);
    });

    it("MEMBER can update own profile", () => {
      expect(globalRoleHasPermission("MEMBER", Action.USER_UPDATE_OWN)).toBe(true);
    });

    it("MEMBER can create ideas", () => {
      expect(globalRoleHasPermission("MEMBER", Action.IDEA_CREATE)).toBe(true);
    });

    it("MEMBER can read campaigns", () => {
      expect(globalRoleHasPermission("MEMBER", Action.CAMPAIGN_READ)).toBe(true);
    });

    it("MEMBER cannot create campaigns", () => {
      expect(globalRoleHasPermission("MEMBER", Action.CAMPAIGN_CREATE)).toBe(false);
    });

    it("MEMBER cannot read other users", () => {
      expect(globalRoleHasPermission("MEMBER", Action.USER_READ_ANY)).toBe(false);
    });

    it("MEMBER cannot access admin", () => {
      expect(globalRoleHasPermission("MEMBER", Action.ADMIN_ACCESS)).toBe(false);
    });
  });

  describe("resourceRoleHasPermission", () => {
    it("CAMPAIGN_MANAGER can update campaigns", () => {
      expect(resourceRoleHasPermission("CAMPAIGN_MANAGER", Action.CAMPAIGN_UPDATE)).toBe(true);
    });

    it("CAMPAIGN_MANAGER can manage campaigns", () => {
      expect(resourceRoleHasPermission("CAMPAIGN_MANAGER", Action.CAMPAIGN_MANAGE)).toBe(true);
    });

    it("CAMPAIGN_MANAGER can transition campaigns", () => {
      expect(resourceRoleHasPermission("CAMPAIGN_MANAGER", Action.CAMPAIGN_TRANSITION)).toBe(true);
    });

    it("CAMPAIGN_MANAGER can assign roles", () => {
      expect(resourceRoleHasPermission("CAMPAIGN_MANAGER", Action.CAMPAIGN_ASSIGN_ROLES)).toBe(
        true,
      );
    });

    it("CAMPAIGN_MANAGER can moderate ideas", () => {
      expect(resourceRoleHasPermission("CAMPAIGN_MANAGER", Action.IDEA_MODERATE)).toBe(true);
    });

    it("CAMPAIGN_MANAGER can create evaluations", () => {
      expect(resourceRoleHasPermission("CAMPAIGN_MANAGER", Action.EVALUATION_CREATE)).toBe(true);
    });

    it("CAMPAIGN_COACH can transition ideas", () => {
      expect(resourceRoleHasPermission("CAMPAIGN_COACH", Action.IDEA_TRANSITION)).toBe(true);
    });

    it("CAMPAIGN_COACH cannot transition campaigns", () => {
      expect(resourceRoleHasPermission("CAMPAIGN_COACH", Action.CAMPAIGN_TRANSITION)).toBe(false);
    });

    it("CAMPAIGN_COACH can participate in evaluations", () => {
      expect(resourceRoleHasPermission("CAMPAIGN_COACH", Action.EVALUATION_PARTICIPATE)).toBe(true);
    });

    it("CAMPAIGN_CONTRIBUTOR can create ideas", () => {
      expect(resourceRoleHasPermission("CAMPAIGN_CONTRIBUTOR", Action.IDEA_CREATE)).toBe(true);
    });

    it("CAMPAIGN_CONTRIBUTOR cannot update any ideas", () => {
      expect(resourceRoleHasPermission("CAMPAIGN_CONTRIBUTOR", Action.IDEA_UPDATE_ANY)).toBe(false);
    });

    it("CAMPAIGN_CONTRIBUTOR can update own ideas", () => {
      expect(resourceRoleHasPermission("CAMPAIGN_CONTRIBUTOR", Action.IDEA_UPDATE_OWN)).toBe(true);
    });

    it("CHANNEL_MANAGER can manage channels", () => {
      expect(resourceRoleHasPermission("CHANNEL_MANAGER", Action.CHANNEL_MANAGE)).toBe(true);
    });

    it("CHANNEL_CONTRIBUTOR can create ideas in channel", () => {
      expect(resourceRoleHasPermission("CHANNEL_CONTRIBUTOR", Action.IDEA_CREATE)).toBe(true);
    });

    it("CHANNEL_CONTRIBUTOR cannot manage channel", () => {
      expect(resourceRoleHasPermission("CHANNEL_CONTRIBUTOR", Action.CHANNEL_MANAGE)).toBe(false);
    });

    it("CAMPAIGN_SPONSOR can read campaigns", () => {
      expect(resourceRoleHasPermission("CAMPAIGN_SPONSOR", Action.CAMPAIGN_READ)).toBe(true);
    });

    it("CAMPAIGN_SPONSOR can view sponsor view", () => {
      expect(resourceRoleHasPermission("CAMPAIGN_SPONSOR", Action.CAMPAIGN_SPONSOR_VIEW)).toBe(
        true,
      );
    });

    it("CAMPAIGN_SPONSOR can comment on ideas", () => {
      expect(resourceRoleHasPermission("CAMPAIGN_SPONSOR", Action.CAMPAIGN_SPONSOR_COMMENT)).toBe(
        true,
      );
    });

    it("CAMPAIGN_SPONSOR can approve shortlists", () => {
      expect(resourceRoleHasPermission("CAMPAIGN_SPONSOR", Action.CAMPAIGN_SPONSOR_APPROVE)).toBe(
        true,
      );
    });

    it("CAMPAIGN_SPONSOR can read ideas", () => {
      expect(resourceRoleHasPermission("CAMPAIGN_SPONSOR", Action.IDEA_READ)).toBe(true);
    });

    it("CAMPAIGN_SPONSOR can view evaluation results", () => {
      expect(resourceRoleHasPermission("CAMPAIGN_SPONSOR", Action.EVALUATION_VIEW_RESULTS)).toBe(
        true,
      );
    });

    it("CAMPAIGN_SPONSOR cannot update campaigns", () => {
      expect(resourceRoleHasPermission("CAMPAIGN_SPONSOR", Action.CAMPAIGN_UPDATE)).toBe(false);
    });

    it("CAMPAIGN_SPONSOR cannot transition campaigns", () => {
      expect(resourceRoleHasPermission("CAMPAIGN_SPONSOR", Action.CAMPAIGN_TRANSITION)).toBe(false);
    });

    it("CAMPAIGN_MANAGER can copy campaigns", () => {
      expect(resourceRoleHasPermission("CAMPAIGN_MANAGER", Action.CAMPAIGN_COPY)).toBe(true);
    });

    it("INNOVATION_MANAGER can copy campaigns", () => {
      expect(globalRoleHasPermission("INNOVATION_MANAGER", Action.CAMPAIGN_COPY)).toBe(true);
    });
  });

  describe("GLOBAL_ROLE_PERMISSIONS structure", () => {
    it("PLATFORM_ADMIN has empty permissions array (bypass handled separately)", () => {
      expect(GLOBAL_ROLE_PERMISSIONS.PLATFORM_ADMIN).toEqual([]);
    });

    it("all roles have read-own and update-own permissions", () => {
      for (const role of ["INNOVATION_MANAGER", "MEMBER"] as const) {
        expect(GLOBAL_ROLE_PERMISSIONS[role]).toContain(Action.USER_READ_OWN);
        expect(GLOBAL_ROLE_PERMISSIONS[role]).toContain(Action.USER_UPDATE_OWN);
      }
    });

    it("all roles have notification read own", () => {
      for (const role of ["INNOVATION_MANAGER", "MEMBER"] as const) {
        expect(GLOBAL_ROLE_PERMISSIONS[role]).toContain(Action.NOTIFICATION_READ_OWN);
      }
    });
  });

  describe("RESOURCE_ROLE_PERMISSIONS structure", () => {
    it("all campaign roles include CAMPAIGN_READ", () => {
      for (const role of [
        "CAMPAIGN_MANAGER",
        "CAMPAIGN_COACH",
        "CAMPAIGN_CONTRIBUTOR",
        "CAMPAIGN_MODERATOR",
        "CAMPAIGN_EVALUATOR",
        "CAMPAIGN_SEEDER",
        "CAMPAIGN_SPONSOR",
      ] as const) {
        expect(RESOURCE_ROLE_PERMISSIONS[role]).toContain(Action.CAMPAIGN_READ);
      }
    });

    it("all channel roles include CHANNEL_READ", () => {
      for (const role of ["CHANNEL_MANAGER", "CHANNEL_CONTRIBUTOR"] as const) {
        expect(RESOURCE_ROLE_PERMISSIONS[role]).toContain(Action.CHANNEL_READ);
      }
    });
  });
});
