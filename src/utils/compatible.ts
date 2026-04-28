export function resolvePluginsPath(name: string): string {
  const compatible: Record<string, string> = {
    "oh-my-openagent": 'oh-my-opencode'
  }
  return compatible[name] || name;
}