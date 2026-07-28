import { describe, expect, it, vi } from "vitest";
import {
  resolveDashboardDestination,
  resolveDashboardDestinationFromLookups,
} from "./destination";

describe("resolveDashboardDestination", () => {
  it("sends team staff to the administrative dashboard", () => {
    expect(resolveDashboardDestination({
      hasActiveTeamMembership: true,
      hasPlayerProfile: false,
    })).toBe("/app");
  });

  it("sends player-only accounts to the player portal", () => {
    expect(resolveDashboardDestination({
      hasActiveTeamMembership: false,
      hasPlayerProfile: true,
    })).toBe("/me");
  });

  it("prioritizes administration when the same account has both personas", () => {
    expect(resolveDashboardDestination({
      hasActiveTeamMembership: true,
      hasPlayerProfile: true,
    })).toBe("/app");
  });

  it("keeps new authenticated accounts in administrative onboarding", () => {
    expect(resolveDashboardDestination({
      hasActiveTeamMembership: false,
      hasPlayerProfile: false,
    })).toBe("/app");
  });
});

describe("resolveDashboardDestinationFromLookups", () => {
  it("does not depend on the player profile lookup for team staff", async () => {
    const lookupPlayerProfile = vi.fn();

    await expect(resolveDashboardDestinationFromLookups({
      lookupActiveTeamMembership: async () => ({
        exists: true,
        failed: false,
      }),
      lookupPlayerProfile,
      reportFailure: vi.fn(),
    })).resolves.toBe("/app");

    expect(lookupPlayerProfile).not.toHaveBeenCalled();
  });

  it("sends player-only accounts to the player portal", async () => {
    await expect(resolveDashboardDestinationFromLookups({
      lookupActiveTeamMembership: async () => ({
        exists: false,
        failed: false,
      }),
      lookupPlayerProfile: async () => ({
        exists: true,
        failed: false,
      }),
      reportFailure: vi.fn(),
    })).resolves.toBe("/me");
  });

  it("falls back safely when the membership lookup returns an error", async () => {
    const lookupPlayerProfile = vi.fn();
    const reportFailure = vi.fn();

    await expect(resolveDashboardDestinationFromLookups({
      lookupActiveTeamMembership: async () => ({
        exists: false,
        failed: true,
      }),
      lookupPlayerProfile,
      reportFailure,
    })).resolves.toBe("/app");

    expect(lookupPlayerProfile).not.toHaveBeenCalled();
    expect(reportFailure).toHaveBeenCalledWith("team_membership");
  });

  it("falls back safely when the player profile lookup throws", async () => {
    const reportFailure = vi.fn();

    await expect(resolveDashboardDestinationFromLookups({
      lookupActiveTeamMembership: async () => ({
        exists: false,
        failed: false,
      }),
      lookupPlayerProfile: async () => {
        throw new Error("temporary lookup failure");
      },
      reportFailure,
    })).resolves.toBe("/app");

    expect(reportFailure).toHaveBeenCalledWith("player_profile");
  });
});
