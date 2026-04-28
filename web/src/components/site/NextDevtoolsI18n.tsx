"use client";

import { useEffect } from "react";

import { Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";

const translations = [
  ["Preferences", "偏好设置"],
  ["Theme", "主题"],
  ["Select your theme preference.", "选择主题偏好。"],
  ["System", "系统"],
  ["Light", "浅色"],
  ["Dark", "深色"],
  ["Position", "位置"],
  ["Adjust the placement of your dev tools.", "调整开发工具的位置。"],
  ["Bottom Left", "左下角"],
  ["Bottom Right", "右下角"],
  ["Top Left", "左上角"],
  ["Top Right", "右上角"],
  ["Size", "大小"],
  ["Adjust the size of your dev tools.", "调整开发工具的大小。"],
  ["Small", "小"],
  ["Medium", "中"],
  ["Large", "大"],
  ["Hide Dev Tools for this session", "本次会话隐藏开发工具"],
  [
    "Hide Dev Tools until you restart your dev server, or 1 day.",
    "隐藏开发工具，直到重启开发服务器或 1 天后。",
  ],
  ["Hide", "隐藏"],
  ["Hide Dev Tools shortcut", "开发工具隐藏快捷键"],
  [
    "Set a custom keyboard shortcut to toggle visibility.",
    "设置用于切换显示/隐藏的自定义快捷键。",
  ],
  ["Record Shortcut", "录制快捷键"],
  ["Clear shortcut", "清除快捷键"],
  ["Shortcut set", "快捷键已设置"],
  ["Recording", "正在录制"],
  ["Disable Dev Tools for this project", "为此项目禁用开发工具"],
  ["To disable this UI completely, set", "要完全禁用这个界面，请设置"],
  ["in your", "，位置："],
  ["file.", "文件。"],
  ["Restart Dev Server", "重启开发服务器"],
  [
    "Restarts the development server without needing to leave the browser.",
    "不离开浏览器即可重启开发服务器。",
  ],
  ["Restart", "重启"],
  ["Reset Bundler Cache", "重置打包缓存"],
  [
    "Clears the bundler cache and restarts the dev server. Helpful if you are seeing stale errors or changes are not appearing.",
    "清除打包缓存并重启开发服务器；如果看到旧错误或改动没有生效，这会有帮助。",
  ],
  ["Reset Cache", "重置缓存"],
] as const;

function translateText(value: string, locale: Locale) {
  const trimmed = value.trim();

  if (!trimmed) {
    return value;
  }

  const match = translations.find(
    ([english, chinese]) => english === trimmed || chinese === trimmed,
  );

  if (!match) {
    return value;
  }

  const target = locale === "zh" ? match[1] : match[0];

  return value.replace(trimmed, target);
}

function translateElementAttribute(
  element: Element,
  attribute: "aria-label" | "title",
  locale: Locale,
) {
  const value = element.getAttribute(attribute);

  if (!value) {
    return;
  }

  const translated = translateText(value, locale);

  if (translated !== value) {
    element.setAttribute(attribute, translated);
  }
}

function translateScope(scope: Element, locale: Locale) {
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);

  for (
    let node = walker.nextNode();
    node;
    node = walker.nextNode()
  ) {
    const translated = translateText(node.textContent ?? "", locale);

    if (translated !== node.textContent) {
      node.textContent = translated;
    }
  }

  for (const element of scope.querySelectorAll("[aria-label], [title]")) {
    translateElementAttribute(element, "aria-label", locale);
    translateElementAttribute(element, "title", locale);
  }
}

function getDevtoolsShadowRoots() {
  return Array.from(document.querySelectorAll("nextjs-portal"))
    .map((portal) => portal.shadowRoot)
    .filter((root): root is ShadowRoot => root !== null);
}

function getTranslationScopes(root: ShadowRoot) {
  const scopes = new Set<Element>();

  for (const container of root.querySelectorAll(".preferences-container")) {
    scopes.add(container.closest("#panel-route") ?? container);
  }

  for (const preferencesMenuItem of root.querySelectorAll("[data-preferences]")) {
    scopes.add(preferencesMenuItem);
  }

  return scopes;
}

function applyDevtoolsLocale(locale: Locale) {
  for (const root of getDevtoolsShadowRoots()) {
    for (const scope of getTranslationScopes(root)) {
      translateScope(scope, locale);
    }
  }
}

export function NextDevtoolsI18n() {
  const { locale } = useI18n();

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    const observedRoots = new WeakSet<ShadowRoot>();
    let frame: number | undefined;

    const observeShadowRoots = () => {
      for (const root of getDevtoolsShadowRoots()) {
        if (observedRoots.has(root)) {
          continue;
        }

        observedRoots.add(root);
        observer.observe(root, {
          attributes: true,
          attributeFilter: ["aria-label", "title"],
          characterData: true,
          childList: true,
          subtree: true,
        });
      }
    };

    const schedule = () => {
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
      }

      frame = requestAnimationFrame(() => {
        observeShadowRoots();
        applyDevtoolsLocale(locale);
      });
    };

    const observer = new MutationObserver(schedule);

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    schedule();

    return () => {
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
      }

      observer.disconnect();
    };
  }, [locale]);

  return null;
}
