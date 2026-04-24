import { test } from "uvu";
import * as assert from "uvu/assert";

import { locales } from "./config";
import { messages } from "./resources";

const hanCharacters = /[\u3400-\u9fff]/;

test("all locale dictionaries expose the same message keys", () => {
  const [defaultLocale, ...otherLocales] = locales;
  const expected = Object.keys(messages[defaultLocale]).sort();

  for (const locale of otherLocales) {
    assert.equal(Object.keys(messages[locale]).sort(), expected, locale);
  }
});

test("English dictionary values do not contain Chinese text", () => {
  const mixed = Object.entries(messages.en).filter(([, value]) =>
    hanCharacters.test(value),
  );

  assert.equal(mixed, []);
});

test.run();
