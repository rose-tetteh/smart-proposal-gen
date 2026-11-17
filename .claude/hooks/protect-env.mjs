// PreToolUse hook: stops Claude from reading or changing the real .env files,
// which hold secrets (the AmaliAI key). .env.example stays open: it is the
// template Claude works from.
//
// The permission deny rules in settings.json cover the file tools; this hook
// also catches shell commands such as `cat .env` or `Get-Content .env`, which
// deny rules don't see.
import { readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const t = input.tool_input ?? {};
// Grep's `pattern` is the text searched for, not a path, so only Glob's counts.
const pattern = input.tool_name === 'Glob' ? t.pattern : undefined;
const text = [t.command, t.file_path, t.path, pattern, t.glob, t.notebook_path].filter((s) => typeof s === 'string').join('\n');

// ".env" or a Vite variant (.env.local, .env.production.local …) as a whole path
// segment. ".env.example", "process.env" and ".envrc" don't match.
const SECRET_ENV = /(^|[\s"'`=:;|&(<>,\\/])\.env(\.(local|development|production|test|staging)(\.local)?)?(?=$|[\s"'`;|&)<>,\\/*])/m;

if (SECRET_ENV.test(text)) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          '.env holds secrets and is off limits to Claude in this project. Work from .env.example instead, and ask the user to make any change to .env themselves.',
      },
    }),
  );
}
