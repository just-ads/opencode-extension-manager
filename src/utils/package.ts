/**
 * Extract the bare package name from an npm specifier, stripping version/tag.
 *
 * Examples:
 *   oh-my-opencode           → oh-my-opencode
 *   oh-my-opencode@latest    → oh-my-opencode
 *   oh-my-opencode@^3.0.0   → oh-my-opencode
 *   @org/pkg                 → @org/pkg
 *   @org/pkg@1.2.3           → @org/pkg
 *   @org/pkg@next            → @org/pkg
 */
export function extractPackageName(input: string): string {
  // Scoped package: @scope/name[@version]
  if (input.startsWith("@")) {
    const slashIdx = input.indexOf("/");
    if (slashIdx !== -1) {
      const afterSlash = input.substring(slashIdx + 1);
      const atIdx = afterSlash.indexOf("@");
      if (atIdx !== -1) {
        return input.substring(0, slashIdx + 1 + atIdx);
      }
    }
    return input;
  }

  // Unscoped package: name[@version]
  const atIdx = input.indexOf("@");
  if (atIdx > 0) {
    return input.substring(0, atIdx);
  }
  return input;
}
