import { DiscordClient } from "../api/client";
import { Spinner, animateTokenCheck } from "../ui/spinner";
import { Logger } from "../ui/logger";
import { t } from "../i18n";

export interface AuthResult {
  client: DiscordClient;
  user: {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
  };
}

function normalizeToken(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("Bot ") || trimmed.startsWith("Bearer ")) {
    return trimmed;
  }
  return trimmed;
}

export async function authenticate(rawToken: string): Promise<AuthResult> {
  const token = normalizeToken(rawToken);

  await new Promise<void>((resolve) =>
    animateTokenCheck(resolve)
  );

  const spinner = new Spinner(t("auth.checking"), "pulse").start();

  try {
    const client = new DiscordClient(token);
    const user = await client.getMe();

    spinner.succeed(t("auth.success"));
    Logger.userCard(user);

    return { client, user };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : t("auth.genericError");

    const isUnauthorized =
      typeof err === "object" &&
      err !== null &&
      "response" in err &&
      (err as { response?: { status?: number } }).response?.status === 401;

    if (isUnauthorized) {
      spinner.fail(t("auth.invalidToken"));
    } else {
      spinner.fail(t("auth.connectionError", { message }));
    }

    throw new Error(t("auth.genericError"));
  }
}
