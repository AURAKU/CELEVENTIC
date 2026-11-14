import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_TRANSLATIONS } from "../default-translations";
import { ZH_MESSAGES } from "../zh-messages";
import { buildStaticMessageDictionaries } from "../static-messages";
import { resolveTranslation } from "../translate";
import {
  isAppLocale,
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  htmlLang,
} from "../constants";
import {
  DISPLAY_CURRENCIES,
  isDisplayCurrency,
  CURRENCY_SYMBOLS,
  DEFAULT_EXCHANGE_RATES,
} from "@/lib/commerce/constants";

function placeholders(value: string) {
  return [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
}

describe("Mandarin locale + CNY display currency", () => {
  it("treats zh as a first-class app locale", () => {
    assert.equal(isAppLocale("zh"), true);
    assert.deepEqual(SUPPORTED_LOCALES, ["en", "fr", "zh"]);
    assert.equal(LOCALE_LABELS.zh, "中文");
    assert.equal(htmlLang("zh"), "zh-CN");
  });

  it("ships a complete Simplified Chinese catalog with matching placeholders", () => {
    const unique = new Set(DEFAULT_TRANSLATIONS.map((row) => `${row.namespace}.${row.key}`));
    for (const key of unique) {
      const zh = ZH_MESSAGES[key];
      assert.ok(zh && zh.trim().length > 0, `missing zh copy for ${key}`);
    }
    assert.equal(Object.keys(ZH_MESSAGES).length, unique.size);

    for (const row of DEFAULT_TRANSLATIONS) {
      const key = `${row.namespace}.${row.key}`;
      assert.equal(
        placeholders(ZH_MESSAGES[key]!),
        placeholders(row.enValue),
        `placeholder mismatch for ${key}`
      );
    }
  });

  it("resolves landing and preference phrases in Mandarin", () => {
    const dicts = buildStaticMessageDictionaries();
    assert.equal(resolveTranslation("header.language", "zh", dicts.zh), "语言");
    assert.equal(resolveTranslation("header.currency", "zh", dicts.zh), "货币");
    assert.equal(resolveTranslation("common.save", "zh", dicts.zh), "保存");
    assert.match(resolveTranslation("landing.hero_title_2", "zh", dicts.zh), /操作系统/);
    assert.equal(resolveTranslation("invite.welcome", "zh", dicts.zh, { name: "Li" }), "欢迎，Li");
    assert.equal(resolveTranslation("celeyou.save_contact", "zh", dicts.zh), "保存联系人");
    assert.equal(resolveTranslation("celeyou.save_contact", "fr", dicts.fr), "Enregistrer le contact");
    assert.equal(resolveTranslation("celeyou.share", "zh", dicts.zh), "分享");
    assert.match(resolveTranslation("celeyou.pay_name", "zh", dicts.zh, { name: "Kojo" }), /Kojo/);
    assert.equal(resolveTranslation("celeyou.section_products", "zh", dicts.zh), "支付方式与钱包");
    assert.equal(resolveTranslation("celeyou.tap_expired", "zh", dicts.zh), "此连接二维码已过期。");
    assert.equal(resolveTranslation("celeyou.courtesy_primary", "fr", dicts.fr), "Demander à se connecter");
    assert.equal(resolveTranslation("celeyou.plan_monthly", "zh", dicts.zh), "月付");
  });

  it("adds CNY as a display currency with a yuan symbol and GHS rate", () => {
    assert.equal(isDisplayCurrency("CNY"), true);
    assert.deepEqual([...DISPLAY_CURRENCIES], ["GHS", "USD", "GBP", "CNY"]);
    assert.equal(CURRENCY_SYMBOLS.CNY, "¥");
    assert.equal(DEFAULT_EXCHANGE_RATES.CNY, 0.53);
    assert.equal(isDisplayCurrency("EUR"), false);
  });
});
