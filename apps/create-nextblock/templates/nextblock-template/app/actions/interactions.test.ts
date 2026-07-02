import { beforeEach, describe, expect, it, vi } from "vitest";

const cacheMocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}));

const dbServerMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getServiceRoleSupabaseClient: vi.fn(),
  getProfileWithRoleServerSide: vi.fn(),
}));

const headersMocks = vi.hoisted(() => {
  const get = vi.fn();
  const set = vi.fn();
  return {
    cookies: vi.fn().mockResolvedValue({ get, set }),
  };
});

vi.mock("next/cache", () => cacheMocks);
vi.mock("next/headers", () => headersMocks);
vi.mock("@nextblock-cms/db/server", () => dbServerMocks);
vi.mock("server-only", () => ({}));

import {
  submitInteraction,
  toggleReaction,
  updateInteractionStatus,
  getNotificationEmails,
  saveNotificationEmails,
} from "./interactions";

describe("Interactions Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("submitInteraction", () => {
    it("returns an error if the user is not logged in", async () => {
      dbServerMocks.createClient.mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        },
      });

      const res = await submitInteraction({
        type: "review",
        content: "Great product!",
        rating: 5,
        productId: "prod-1",
      });

      expect(res).toEqual({ error: "You must be logged in to submit a review or comment." });
    });

    it("inserts a new review successfully and triggers revalidation", async () => {
      const singleMock = vi.fn().mockResolvedValue({
        data: { id: "int-1", type: "review", status: "pending" },
        error: null,
      });
      const selectMock = vi.fn(() => ({ single: singleMock }));
      const insertMock = vi.fn(() => ({ select: selectMock }));
      const fromMock = vi.fn(() => ({ insert: insertMock }));

      dbServerMocks.createClient.mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "user-1" } },
            error: null,
          }),
        },
        from: fromMock,
      });

      const res = await submitInteraction({
        type: "review",
        content: "Awesome tool, works perfectly!",
        rating: 5,
        productId: "prod-1",
      });

      expect(res.success).toBe(true);
      expect(fromMock).toHaveBeenCalledWith("cms_interactions");
      expect(insertMock).toHaveBeenCalledWith({
        type: "review",
        status: "pending",
        content: "Awesome tool, works perfectly!",
        rating: 5,
        user_id: "user-1",
        product_id: "prod-1",
        post_id: null,
        reactions: {},
      });
      expect(cacheMocks.revalidatePath).toHaveBeenCalledWith("/cms/interactions");
    });
  });

  describe("toggleReaction", () => {
    it("toggles a reaction and updates cookies", async () => {
      const getCookieMock = vi.fn().mockReturnValue(undefined);
      const setCookieMock = vi.fn();
      headersMocks.cookies.mockResolvedValue({
        get: getCookieMock,
        set: setCookieMock,
      } as any);

      const singleMock = vi.fn().mockResolvedValue({
        data: {
          reactions: { likes: 3 },
          type: "review",
          product_id: "prod-1",
          post_id: null,
          products: { slug: "my-product" },
        },
        error: null,
      });
      const eqSelectMock = vi.fn().mockReturnValue({ single: singleMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqSelectMock });
      const eqUpdateMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqUpdateMock });
      const fromMock = vi.fn().mockReturnValue({
        select: selectMock,
        update: updateMock,
      });

      dbServerMocks.getServiceRoleSupabaseClient.mockReturnValue({
        from: fromMock,
      });

      const res = await toggleReaction("int-1");

      expect(res.success).toBe(true);
      expect(res.count).toBe(4);
      expect(res.hasReacted).toBe(true);
      expect(updateMock).toHaveBeenCalledWith({ reactions: { likes: 4 } });
      expect(eqUpdateMock).toHaveBeenCalledWith("id", "int-1");
      expect(setCookieMock).toHaveBeenCalledWith(
        "reacted_interactions",
        JSON.stringify(["int-1"]),
        expect.any(Object)
      );
      expect(cacheMocks.revalidatePath).toHaveBeenCalledWith("/product/my-product");
    });
  });

  describe("updateInteractionStatus", () => {
    it("returns error if non-admin attempts moderation", async () => {
      dbServerMocks.createClient.mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "user-1" } },
            error: null,
          }),
        },
      });
      dbServerMocks.getProfileWithRoleServerSide.mockResolvedValue({
        role: "WRITER",
      } as any);

      const res = await updateInteractionStatus("int-1", "approved");
      expect(res.error).toContain("Unauthorized");
    });

    it("allows admins to approve and triggers path revalidation", async () => {
      dbServerMocks.createClient.mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "admin-1" } },
            error: null,
          }),
        },
      });
      dbServerMocks.getProfileWithRoleServerSide.mockResolvedValue({
        role: "ADMIN",
      } as any);

      const singleMock = vi.fn().mockResolvedValue({
        data: {
          product_id: "prod-1",
          post_id: null,
          products: { slug: "my-product" },
        },
        error: null,
      });
      const eqSelectMock = vi.fn().mockReturnValue({ single: singleMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqSelectMock });
      const eqUpdateMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqUpdateMock });
      const fromMock = vi.fn().mockReturnValue({
        select: selectMock,
        update: updateMock,
      });

      dbServerMocks.getServiceRoleSupabaseClient.mockReturnValue({
        from: fromMock,
      });

      const res = await updateInteractionStatus("int-1", "approved");

      expect(res.success).toBe(true);
      expect(updateMock).toHaveBeenCalledWith({ status: "approved" });
      expect(eqUpdateMock).toHaveBeenCalledWith("id", "int-1");
      expect(cacheMocks.revalidatePath).toHaveBeenCalledWith("/product/my-product");
      expect(cacheMocks.revalidatePath).toHaveBeenCalledWith("/cms/interactions");
    });
  });

  describe("Notification Emails Settings Actions", () => {
    it("returns error if non-admin attempts to get or save configuration", async () => {
      dbServerMocks.createClient.mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "user-1" } },
            error: null,
          }),
        },
      });
      dbServerMocks.getProfileWithRoleServerSide.mockResolvedValue({
        role: "WRITER",
      } as any);

      const getRes = await getNotificationEmails();
      expect(getRes.error).toContain("Unauthorized");

      const saveRes = await saveNotificationEmails("test@example.com");
      expect(saveRes.error).toContain("Unauthorized");
    });

    it("allows admins to get configuration", async () => {
      dbServerMocks.createClient.mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "admin-1" } },
            error: null,
          }),
        },
      });
      dbServerMocks.getProfileWithRoleServerSide.mockResolvedValue({
        role: "ADMIN",
      } as any);

      const maybeSingleMock = vi.fn().mockResolvedValue({
        data: { value: { emails: "a@b.com, c@d.com" } },
        error: null,
      });
      const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      const fromMock = vi.fn().mockReturnValue({ select: selectMock });

      dbServerMocks.createClient.mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "admin-1" } },
            error: null,
          }),
        },
        from: fromMock,
      });

      const res = await getNotificationEmails();
      expect(res.success).toBe(true);
      expect(res.emails).toBe("a@b.com, c@d.com");
    });

    it("allows admins to save configuration", async () => {
      dbServerMocks.createClient.mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "admin-1" } },
            error: null,
          }),
        },
      });
      dbServerMocks.getProfileWithRoleServerSide.mockResolvedValue({
        role: "ADMIN",
      } as any);

      const upsertMock = vi.fn().mockResolvedValue({ error: null });
      const fromMock = vi.fn().mockReturnValue({ upsert: upsertMock });

      dbServerMocks.createClient.mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "admin-1" } },
            error: null,
          }),
        },
        from: fromMock,
      });

      const res = await saveNotificationEmails(" a@b.com , c@d.com ");
      expect(res.success).toBe(true);
      expect(res.emails).toBe("a@b.com, c@d.com");
      expect(upsertMock).toHaveBeenCalledWith({
        key: "interactions_notification_emails",
        value: { emails: "a@b.com, c@d.com" },
      });
    });
  });
});
