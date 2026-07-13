// ============================================================
// Lista de e-mails autorizados (funcionários da ITS Brasil).
// Só estes e-mails podem criar conta (auto-cadastro restrito).
// O login é por e-mail. Para liberar alguém, adicione aqui.
//
// TODO(ITS Brasil): preencher com a equipe. Formato:
//   "usuario@itsbrasil.net": "Nome de Exibição",
// ============================================================

// E-mail → nome de exibição.
const TEAM: Record<string, string> = {
  "dheiver.santos@gmail.com": "Dheiver Santos",
  // "fulano@itsbrasil.net": "Fulano de Tal",
};

/** Lista de todos os e-mails autorizados (para provisionamento). */
export function allowedEmails(): string[] {
  return Object.keys(TEAM);
}

/** Normaliza um e-mail para comparação (minúsculo, sem espaços). */
export function normalizeEmail(email: string): string {
  return String(email || "").trim().toLowerCase();
}

/** True se o e-mail está autorizado a criar conta / usar a plataforma. */
export function isAllowedEmail(email: string): boolean {
  return Object.prototype.hasOwnProperty.call(TEAM, normalizeEmail(email));
}

/** Nome de exibição do funcionário (ou o próprio e-mail, se não mapeado). */
export function displayName(email: string): string {
  return TEAM[normalizeEmail(email)] || email;
}

/** Validação simples de formato de e-mail. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * E-mails com acesso ao painel /admin (gestão de usuários).
 * Configure ADMIN_EMAILS="a@empresa.com,b@empresa.com" nas env vars.
 * Sem a variável definida: liberado em dev, negado em produção.
 */
export function isAdminEmail(email: string): boolean {
  const admins = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!admins.length) return process.env.NODE_ENV !== "production";
  return admins.includes(normalizeEmail(email));
}
