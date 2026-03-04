# OpenCode Extension Manager (OEM)

`oem` is a CLI for managing OpenCode extensions.

Current focus:
- Implemented: `plugins`
- Placeholder only: `skills`, `mcps` (commands exist, output `not yet realized`)

## Requirements

- Node.js `>=18`

## Install

```bash
npm install
npm run build
```

Use directly in this project:

```bash
node dist/index.js --help
```

Or link globally for local development:

```bash
npm link
oem --help
```

## Command Overview

Top-level commands:

- `oem list` (`oem ls`)
- `oem plugins ...`
- `oem skills ...` (placeholder)
- `oem mcps ...` (placeholder)

### 1) `oem list`

List loaded extensions by module.

```bash
oem list
oem list -p   # project only
oem list -g   # global only
```

Behavior:
- Uses unified plugin collection logic shared with `oem plugins list`
- Shows `plugins` in table format
- Shows `skills` / `mcps` as `not yet realized`

### 2) `oem plugins`

#### List

```bash
oem plugins list
oem plugins list -p
oem plugins list -g
oem plugins list --json
```

Columns:
- `Name`, `Scope`, `Type`, `Installed`, `Latest`, `Status`

#### Install

```bash
oem plugins install <source>
oem plugins install <source> -p
oem plugins install <source> -g
oem plugins install <source> --dry-run
```

`<source>` can be:
- npm package
- git URL
- local file/directory path

#### Uninstall

```bash
oem plugins uninstall <name>
oem plugins uninstall <name> -p
oem plugins uninstall <name> -g
oem plugins uninstall <name> --dry-run
```

#### Update

```bash
oem plugins update
oem plugins update <name>
oem plugins update -p
oem plugins update -g
oem plugins update --dry-run
```

#### Info

```bash
oem plugins info <name>
oem plugins info <name> -p
oem plugins info <name> -g
oem plugins info <name> --json
```

### 3) `oem skills` (placeholder)

Subcommands are registered but not implemented:

- `install` (`i`)
- `uninstall` (`rm`)
- `list` (`ls`)
- `info`
- `update` (`up`)

Example:

```bash
oem skills list
# -> skills list: not yet realized
```

### 4) `oem mcps` (placeholder)

Subcommands are registered but not implemented:

- `install` (`i`)
- `uninstall` (`rm`)
- `list` (`ls`)
- `info`
- `update` (`up`)

Example:

```bash
oem mcps list
# -> mcps list: not yet realized
```

## Scope and Config Resolution

Scope flags used by list/plugin commands:
- `-p, --project`: project scope only
- `-g, --global`: global scope only
- default: both scopes

Config path resolution order:

1. `<cwd>/opencode.json`
2. `<cwd>/.opencode/opencode.json`
3. `<globalConfigDir>/opencode.json`

Global directories:
- Config: `${XDG_CONFIG_HOME:-~/.config}/opencode`
- Cache: `${XDG_CACHE_HOME:-~/.cache}/opencode`

Project local plugins directory:
- `<cwd>/.opencode/plugins`

## Development

Scripts:

```bash
npm run build   # compile TypeScript
npm run dev     # watch mode
npm run start   # run dist/index.js
```

## License

MIT
