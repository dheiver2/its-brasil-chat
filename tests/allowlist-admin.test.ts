import { afterEach, describe, expect, it } from "vitest";
import { isAdminEmail } from "../app/lib/allowlist";

const OLD_ADMINS = process.env.ADMIN_EMAILS;

afterEach(() => {
  if (OLD_ADMINS === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = OLD_ADMINS;
});

describe("isAdminEmail", () => {
  it("aceita apenas e-mails listados em ADMIN_EMAILS", () => {
    process.env.ADMIN_EMAILS = "gestao@itsbrasil.net, adm@itsbrasil.net";
    expect(isAdminEmail("gestao@itsbrasil.net")).toBe(true);
    expect(isAdminEmail("ADM@itsbrasil.net")).toBe(true);
    expect(isAdminEmail("noc@itsbrasil.net")).toBe(false);
  });

  it("sem ADMIN_EMAILS, libera fora de produção (NODE_ENV=test)", () => {
    process.env.ADMIN_EMAILS = "";
    expect(isAdminEmail("qualquer@itsbrasil.net")).toBe(true);
  });
});
