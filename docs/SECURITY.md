# Security Model

## Defended Threats

- **ReDoS / Backtracking**: The parser operates in linear `O(N)` time. No regular expressions are used for parsing; input is scanned character-by-character.
- **Excessive Input**: The `parse()` function enforces a `maxLength` (default 10,000 characters). Exceeding this triggers an `input_too_large` error.
- **Stack Exhaustion**: Nested patterns (plural/select) are depth-checked against `maxDepth` (default 10). Exceeding this triggers a `too_deep` error.
- **Log Pollution**: `MessageFormatError` automatically truncates internal error messages to 200 characters to prevent massive input strings from appearing in server logs.

## Not Defended

- **Output Injection**: The utility performs no HTML/string escaping. If the formatted output is rendered into an unsafe sink (like `innerHTML`), the caller is responsible for sanitization.
- **Message Injection**: This library assumes the message pattern provided is trusted code. It does not sanitize malicious logic that might result from attacker-controlled message patterns (e.g., using specific locale-dependent number formats to leak data, though this is inherently limited by `Intl` API design).