import { cookies } from "next/headers";

import { I18N_COOKIE_NAME, defaultLocale, normalizeLocale } from "./config";
import { messages } from "./resources";

export async function getServerLocale() {
  const cookieStore = await cookies();
  return normalizeLocale(cookieStore.get(I18N_COOKIE_NAME)?.value);
}

export async function tServer(key: string) {
  const locale = await getServerLocale();
  return messages[locale][key] ?? messages[defaultLocale][key] ?? key;
}
