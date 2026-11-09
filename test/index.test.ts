import { IntlMessageFormat } from "intl-messageformat";
import { describe, expect, it } from "vitest";
import { compile, format, parse } from "../src/index.js";
import corpus from "./fixtures/corpus.json" with { type: "json" };

describe("ICU MessageFormat acceptance suite", () => {
  it("handles plural with exact and category options", () => {
    const pattern = "{count, plural, =0 {no items} one {# item} other {# items}}";
    expect(format(pattern, "en", { count: 0 })).toBe("no items");
    expect(format(pattern, "en", { count: 1 })).toBe("1 item");
    expect(format(pattern, "en", { count: 1000 })).toBe("1,000 items");
  });

  it("handles Polish plural rules correctly", () => {
    const pattern = "{n, plural, one {# plik} few {# pliki} many {# plików} other {# pliku}}";
    expect(format(pattern, "pl", { n: 1 })).toBe("1 plik");
    expect(format(pattern, "pl", { n: 2 })).toBe("2 pliki");
    expect(format(pattern, "pl", { n: 5 })).toBe("5 plików");
    expect(format(pattern, "pl", { n: 22 })).toBe("22 pliki");
    expect(format(pattern, "pl", { n: 1.5 })).toBe("1,5 pliku");
  });

  it("handles plural with offset", () => {
    const pattern =
      "{n, plural, offset:1 =0 {nobody} =1 {only {name}} one {{name} and # other} other {{name} and # others}}";
    expect(format(pattern, "en", { n: 0, name: "Ann" })).toBe("nobody");
    expect(format(pattern, "en", { n: 1, name: "Ann" })).toBe("only Ann");
    expect(format(pattern, "en", { n: 2, name: "Ann" })).toBe("Ann and 1 other");
    expect(format(pattern, "en", { n: 3, name: "Ann" })).toBe("Ann and 2 others");
  });

  it("handles selectordinal in en", () => {
    const pattern = "{n, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}";
    expect(format(pattern, "en", { n: 1 })).toBe("1st");
    expect(format(pattern, "en", { n: 2 })).toBe("2nd");
    expect(format(pattern, "en", { n: 3 })).toBe("3rd");
    expect(format(pattern, "en", { n: 4 })).toBe("4th");
    expect(format(pattern, "en", { n: 11 })).toBe("11th");
    expect(format(pattern, "en", { n: 22 })).toBe("22nd");
    expect(format(pattern, "en", { n: 103 })).toBe("103rd");
  });

  it("formats numbers with styles across locales", () => {
    expect(format("{n, number}", "en-US", { n: 1234.5 })).toBe("1,234.5");
    expect(format("{n, number}", "de-DE", { n: 1234.5 })).toBe("1.234,5");
    expect(format("{n, number, percent}", "en-US", { n: 0.25 })).toBe("25%");
    expect(format("{n, number, percent}", "de-DE", { n: 0.25 })).toBe("25\u00A0%");
    expect(format("{n, number, integer}", "en-US", { n: 2.5 })).toBe("3");
  });

  it("handles ICU ApostropheMode DOUBLE_OPTIONAL quoting", () => {
    expect(format("I''m {name}", "en", { name: "Ann" })).toBe("I'm Ann");
    expect(format("'{name}' is literal", "en", { name: "Ann" })).toBe("{name} is literal");
    expect(format("it's {name}", "en", { name: "Ann" })).toBe("it's Ann");
    expect(format("{n, plural, other {'#' is #}}", "en", { n: 5 })).toBe("# is 5");
    expect(
      format(
        "{g, select, female {She} male {He} other {They}} said {n, plural, one {# word} other {# words}}",
        "en",
        {
          g: "x",
          n: 2,
        },
      ),
    ).toBe("They said 2 words");
  });

  it("throws typed MessageFormatError with code and offset", () => {
    expect(() => parse("{name")).toThrowError(
      expect.objectContaining({ code: "unclosed_brace", offset: 0 }),
    );
    expect(() => parse("{n, plural, one {x}}")).toThrowError(
      expect.objectContaining({ code: "missing_other" }),
    );
    expect(() => parse("{n, plural, one {a} one {b} other {c}}")).toThrowError(
      expect.objectContaining({ code: "duplicate_selector" }),
    );
    expect(() => parse("{n, date}")).toThrowError(
      expect.objectContaining({ code: "unknown_type" }),
    );
    expect(() => format("{name}", "en", {})).toThrowError(
      expect.objectContaining({ code: "missing_value", offset: -1 }),
    );
    expect(() => parse("x".repeat(10_001))).toThrowError(
      expect.objectContaining({ code: "input_too_large", offset: 10_000 }),
    );

    // 11 nested selects
    let nested = "inner";
    for (let i = 0; i < 11; i++) {
      nested = `{v${i}, select, other {${nested}}}`;
    }
    expect(() => parse(nested)).toThrowError(expect.objectContaining({ code: "too_deep" }));
  });

  it("covers syntax edge cases and error branches", () => {
    // Whitespace inside braces
    expect(format("{ n , plural , other {x} }", "en", { n: 1 })).toBe("x");

    // Empty option
    expect(format("{n, plural, other {}}", "en", { n: 1 })).toBe("");

    // Negative numbers and =1 vs one precedence
    const precedence = "{n, plural, =1 {exact one} one {category one} other {other}}";
    expect(format(precedence, "en", { n: 1 })).toBe("exact one");
    expect(format(precedence, "en", { n: 21 })).toBe("other");
    expect(format("{n, plural, other {#}}", "en", { n: -5 })).toBe("-5");

    // Unsupported style
    expect(() => parse("{n, number, custom}")).toThrowError(
      expect.objectContaining({ code: "unsupported_style" }),
    );

    // Invalid values for number/plural
    expect(() => format("{n, number}", "en", { n: "123" as unknown as number })).toThrowError(
      expect.objectContaining({ code: "invalid_value" }),
    );
    expect(() =>
      format("{n, plural, other {#}}", "en", { n: "123" as unknown as number }),
    ).toThrowError(expect.objectContaining({ code: "invalid_value" }));
    expect(() => format("{n, selectordinal, other {#}}", "en", { n: NaN })).toThrowError(
      expect.objectContaining({ code: "invalid_value" }),
    );

    // Unmatched closing brace
    expect(() => parse("hello }")).toThrowError(expect.objectContaining({ code: "syntax" }));

    // Compile from pre-parsed AST
    const ast = parse("Hello, {name}!");
    const compiled = compile(ast, "en");
    expect(compiled({ name: "Ada" })).toBe("Hello, Ada!");
  });

  it("validates against committed corpus with intl-messageformat oracle", () => {
    expect(corpus.length).toBeGreaterThanOrEqual(40);
    for (const item of corpus) {
      const actual = format(item.message, item.locale, item.values);
      const expected = new IntlMessageFormat(item.message, item.locale).format(item.values);
      expect(actual).toBe(expected);
    }
  });
});
