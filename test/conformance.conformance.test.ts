import { parse as formatjsParse } from "@formatjs/icu-messageformat-parser";
import fc from "fast-check";
import { IntlMessageFormat } from "intl-messageformat";
import { describe, expect, it } from "vitest";
import { format, parse } from "../src/index.js";

describe("CI Conformance Differential Tests", () => {
  it("generates 2,000 messages with fast-check seed 11 and matches formatjs parser and intl-messageformat", () => {
    // Generator producing strictly valid grammar from the supported subset
    const idArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,4}$/);
    const literalArb = fc.stringMatching(/^[a-zA-Z0-9 !?,.:;_-]{1,10}$/);
    const numberStyleArb = fc.constantFrom(undefined, "integer", "percent");

    interface GeneratedMessage {
      pattern: string;
      values: Record<string, unknown>;
    }

    const messageGen = fc.letrec((tie) => ({
      leaf: fc.oneof(
        literalArb.map((text): GeneratedMessage => ({ pattern: text, values: {} })),
        idArb.map((id): GeneratedMessage => ({ pattern: `{${id}}`, values: { [id]: "val" } })),
        fc.tuple(idArb, numberStyleArb).map(
          ([id, style]): GeneratedMessage => ({
            pattern: style ? `{${id}, number, ${style}}` : `{${id}, number}`,
            values: { [id]: 12.34 },
          }),
        ),
      ),
      node: fc.oneof(
        tie("leaf"),
        fc.tuple(idArb, tie("leaf"), tie("leaf")).map(
          ([id, opt1, opt2]): GeneratedMessage => ({
            pattern: `{${id}, select, a {${(opt1 as GeneratedMessage).pattern}} other {${(opt2 as GeneratedMessage).pattern}}}`,
            values: {
              [id]: "a",
              ...(opt1 as GeneratedMessage).values,
              ...(opt2 as GeneratedMessage).values,
            },
          }),
        ),
        fc.tuple(idArb, tie("leaf"), tie("leaf")).map(
          ([id, opt1, opt2]): GeneratedMessage => ({
            pattern: `{${id}, plural, one {# ${(opt1 as GeneratedMessage).pattern}} other {# ${(opt2 as GeneratedMessage).pattern}}}`,
            values: {
              [id]: 1,
              ...(opt1 as GeneratedMessage).values,
              ...(opt2 as GeneratedMessage).values,
            },
          }),
        ),
      ),
    }));

    const arb = messageGen.node as fc.Arbitrary<GeneratedMessage>;

    fc.assert(
      fc.property(arb, ({ pattern, values }) => {
        // 1. Parser agreement
        let formatjsAccepted = true;
        try {
          formatjsParse(pattern, { ignoreTag: true });
        } catch {
          formatjsAccepted = false;
        }

        let ourAccepted = true;
        try {
          parse(pattern);
        } catch {
          ourAccepted = false;
        }

        expect(ourAccepted).toBe(formatjsAccepted);

        // 2. Formatter agreement
        if (ourAccepted && formatjsAccepted) {
          const actual = format(pattern, "en", values);
          const expected = new IntlMessageFormat(pattern, "en").format(values);
          expect(actual).toBe(expected);
        }
      }),
      { numRuns: 2000, seed: 11 },
    );
  });
});
