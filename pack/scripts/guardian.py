#!/usr/bin/env python3
"""Guardian scanner for Kiro Overdrive. Standard library only, Python 3.8+.

Kiro runs this from the hooks in .kiro/hooks/guardian-scan.json, and git runs it
from .git/hooks/pre-commit. It never changes your files and never prints a full
secret: findings show only the first few characters.

  guardian.py pre               PreToolUse: block a tool call (exit 2) that carries a
                                secret, reads a secret file, runs a catastrophic or
                                hook-bypassing shell command, or commits/pushes secrets
  guardian.py post              PostToolUse: report secrets in files the tool touched
                                or in its output (exit 2 with findings)
  guardian.py changes           Stop / PostTaskExecution: scan uncommitted changes and
                                new files (exit 2 with findings)
  guardian.py commit            git pre-commit: scan staged changes (exit 1 blocks the commit)
  guardian.py session           SessionStart: one-line nudge if the git hook is missing
  guardian.py install-git-hook  add the pre-commit hook to this clone (never overwrites)
  guardian.py scan PATH...      scan files or folders by hand

Silence a false positive by putting `guardian:allow` on the same line.
"""
import json
import os
import re
import subprocess
import sys

ALLOW_MARK = "guardian:allow"
HOOK_MARK = "kiro-overdrive guardian"
MAX_FILE_BYTES = 2_000_000
EXIT_BLOCK = 2

# ---------------------------------------------------------------- secrets ---
# (label, regex, check_placeholder). Specific token formats first.
_PK = "PRIVATE" + " KEY"  # split so this file doesn't flag itself
SECRET_PATTERNS = [
    ("private key", re.compile(r"-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?" + _PK + r"(?: BLOCK)?-----"), False),
    ("AWS access key", re.compile(r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b"), True),
    ("AWS secret key", re.compile(r"(?i)aws_secret_access_key\s*[=:]\s*['\"]?([A-Za-z0-9/+=]{40})\b"), True),
    ("Databricks token", re.compile(r"\bdapi[0-9a-f]{32}(?:-\d+)?\b"), False),
    ("Databricks OAuth secret", re.compile(r"\bdose[0-9a-f]{32}\b"), False),
    ("GitHub token", re.compile(r"\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,})\b"), False),
    ("Atlassian API token", re.compile(r"\bATATT[A-Za-z0-9_\-=]{30,}"), False),
    ("Slack token", re.compile(r"\bxox[abposr]-[A-Za-z0-9-]{10,}"), False),
    ("Slack/Teams webhook", re.compile(r"https://(?:hooks\.slack\.com/services/|[\w.-]+\.webhook\.office\.com/webhookb2/)[^\s'\"]{20,}"), False),
    ("Google API key", re.compile(r"\bAIza[0-9A-Za-z_\-]{35}\b"), False),
    ("OpenAI/Anthropic key", re.compile(r"\bsk-(?:ant-|proj-)?[A-Za-z0-9_\-]{32,}"), False),
    ("Azure storage key", re.compile(r"(?i)AccountKey=([A-Za-z0-9+/]{40,}={0,2})"), True),
    ("JWT", re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}"), False),
    ("password in a connection string", re.compile(r"\b[a-zA-Z][a-zA-Z0-9+.-]{1,20}://[^\s:/@'\"]+:([^\s@/'\"]{4,})@[\w.-]+"), True),
    ("hard-coded credential", re.compile(
        r"(?i)\b(?:password|passwd|pwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|private[_-]?key)\b"
        r"[\"']?\s*[:=]\s*[\"']([^\"'\s]{8,})[\"']"), True),
]
PLACEHOLDER = re.compile(
    r"(?i)example|sample|dummy|placeholder|changeme|redacted|your[_-]|<[^>]*>|\$\{|\{\{|%\(|xxxx|\*\*\*|\.\.\.|"
    r"^(?:password|secret|token|none|null|true|false)$")

SECRET_FILE = re.compile(
    r"(?i)^(?:\.env(?:\..+)?|.+\.pem|.+\.key|.+\.p12|.+\.pfx|.+\.jks|.+\.keystore|id_(?:rsa|dsa|ecdsa|ed25519)"
    r"|\.netrc|_netrc|\.pgpass|\.databrickscfg|credentials(?:\.json)?|service[-_]?account.*\.json)$")
SAFE_FILE = re.compile(r"(?i)\.(?:example|sample|template|dist|tmpl)$")
# Secret files the agent may not open through a file tool. ~/.databrickscfg is left
# out on purpose: /databricks-setup reads its profile names.
NO_READ_FILE = re.compile(
    r"(?i)^(?:\.env(?:\..+)?|.+\.pem|.+\.key|.+\.p12|.+\.pfx|id_(?:rsa|dsa|ecdsa|ed25519)|\.netrc|_netrc|\.pgpass)$")


def mask(value):
    value = value.strip()
    return value[:4] + "…(" + str(len(value)) + " chars)"


def find_secrets(text):
    """Yield (line_no, label, masked) for each likely secret in text."""
    for n, line in enumerate(text.splitlines(), 1):
        if ALLOW_MARK in line or len(line) > 20000:
            continue
        for label, rx, check in SECRET_PATTERNS:
            for m in rx.finditer(line):
                value = m.group(m.lastindex or 0)
                if check and (PLACEHOLDER.search(value) or len(set(value)) < 4):
                    continue
                yield n, label, mask(m.group(0) if label == "private key" else value)


def is_secret_file(path):
    name = os.path.basename(path.replace("\\", "/"))
    return bool(SECRET_FILE.match(name)) and not SAFE_FILE.search(name)


def read_text(path):
    try:
        if not os.path.isfile(path) or os.path.getsize(path) > MAX_FILE_BYTES:
            return None
        with open(path, "rb") as fh:
            data = fh.read()
    except OSError:
        return None
    if b"\0" in data[:8192]:
        return None
    return data.decode("utf-8", "replace")


# -------------------------------------------------------------- shell rules ---
DANGER_TARGETS = {"/", "/*", "~", "~/", "~/*", "$home", "${home}", "$home/", "$home/*", "*", ".", "./", "./*",
                  "..", "../", "c:", "c:\\", "c:/", "$env:userprofile", "%userprofile%"}

SHELL_RULES = [
    ("pipes a download straight into a shell",
     re.compile(r"\b(?:curl|wget|iwr|irm|invoke-webrequest|invoke-restmethod)\b[^;&]*\|\s*(?:sudo\s+)?"
                r"(?:sh|bash|zsh|dash|python3?|iex|invoke-expression|pwsh|powershell)\b")),
    ("runs downloaded code with Invoke-Expression", re.compile(r"\b(?:iex|invoke-expression)\s*\(?\s*\(?\s*(?:irm|iwr|invoke-restmethod|invoke-webrequest|new-object)\b")),
    ("runs with sudo or elevated rights", re.compile(r"(?:^|[;&|(]\s*|\s)(?:sudo|doas|runas)\s|-verb\s+runas\b")),
    ("force-pushes (use --force-with-lease, or run it yourself)", re.compile(r"\bgit\s+push\b[^;&|]*?(?:\s--force(?![-\w])|\s-[a-z]*f[a-z]*(?=\s|$)|\s\+[\w/.-]+)")),
    ("skips git hooks, including Guardian's commit scan", re.compile(r"\bgit\b[^;&|]*?(?:--no-verify\b|core\.hookspath)|\bgit\s+commit\b[^;&|]*?\s-[a-z]*n[a-z]*(?=\s|$)")),
    ("wipes a disk or volume", re.compile(r"\bmkfs(?:\.\w+)?\b|\bdd\b[^;&|]*\bof=/dev/|\bformat-volume\b|\bformat\s+[a-z]:|\bdiskpart\b|\bclear-disk\b")),
    ("makes files world-writable", re.compile(r"\bchmod\s+(?:-[a-z]*r[a-z]*\s+)?(?:0?777|a\+rwx)\s")),
    ("prints a secret file", re.compile(
        r"\b(?:cat|type|more|less|head|tail|bat|nl|strings|xxd|od|get-content|gc)\b[^;&|]*?(?:^|[\s/\\'\"])"
        r"(?:\.env(?:\.(?!example|sample|template|dist)[\w-]+)?|id_(?:rsa|dsa|ecdsa|ed25519)|[\w.-]+\.pem|[\w.-]+\.key|\.netrc|\.pgpass|\.databrickscfg)"
        r"(?=$|[\s'\";|&])")),
    ("dumps all environment variables (tokens included)", re.compile(r"(?:^|[;&|]\s*)(?:printenv|env|set|export\s+-p)\s*(?:$|[;&|>])|\bget-childitem\s+env:|\bgci\s+env:|\bdir\s+env:")),
    ("echoes a secret environment variable", re.compile(r"\b(?:echo|printf|write-host|write-output)\b[^;&|]*\$(?:\{)?(?:env:)?\w*(?:token|secret|password|passwd|api_?key|private_?key)\w*", re.I)),
]


def _destructive_delete(cmd):
    """True if cmd recursively force-deletes a root, home, drive or wildcard path."""
    for m in re.finditer(r"\brm\s+([^;&|]*)", cmd):
        toks = m.group(1).split()
        flags = "".join(t[1:] for t in toks if t.startswith("-") and not t.startswith("--"))
        longs = {t for t in toks if t.startswith("--")}
        recursive = "r" in flags.lower() or "--recursive" in longs
        force = "f" in flags or "--force" in longs
        if recursive and force and any(t.strip("'\"").lower() in DANGER_TARGETS for t in toks if not t.startswith("-")):
            return True
    for m in re.finditer(r"\b(?:remove-item|ri|del|erase|rd|rmdir)\b([^;&|]*)", cmd):
        rest = m.group(1).lower()
        recursive = re.search(r"-recurse\b|/s\b", rest)
        force = re.search(r"-force\b|/q\b", rest)
        toks = [t.strip("'\"") for t in rest.split() if not t.startswith(("-", "/s", "/q"))]
        if recursive and force and any(t.rstrip("\\/*") in {"", "c:", "~", "$home", "$env:userprofile", "%userprofile%", "."} or t in DANGER_TARGETS for t in toks):
            return True
    return False


def shell_problem(cmd):
    low = " ".join(cmd.lower().split())
    if _destructive_delete(low):
        return "recursively force-deletes a root, home, drive or wildcard path"
    for reason, rx in SHELL_RULES:
        if rx.search(low):
            return reason
    return None


# --------------------------------------------------------------------- git ---
def git(args, cwd=None):
    try:
        r = subprocess.run(["git"] + args, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=30)
    except (OSError, subprocess.TimeoutExpired):
        return None
    return r.stdout if r.returncode == 0 else None


def repo_root():
    out = git(["rev-parse", "--show-toplevel"])
    return out.strip() if out else None


def scan_diff(diff):
    """Scan added lines of a unified diff. Returns findings [(file, line, label, masked)]."""
    findings, path, line_no = [], None, 0
    for raw in diff.splitlines():
        if raw.startswith("+++ "):
            p = raw[4:].strip()
            path = None if p == "/dev/null" else (p[2:] if p.startswith("b/") else p)
        elif raw.startswith("@@"):
            m = re.search(r"\+(\d+)", raw)
            line_no = int(m.group(1)) if m else 0
        elif raw.startswith("+") and path:
            for _, label, masked in find_secrets(raw[1:]):
                findings.append((path, line_no, label, masked))
            line_no += 1
        elif not raw.startswith("-"):
            line_no += 1
    return findings


def scan_staged(root, include_unstaged=False):
    findings = []
    diff_args = ["diff", "HEAD"] if include_unstaged and git(["rev-parse", "--verify", "-q", "HEAD"], root) else ["diff", "--cached"]
    names = git(diff_args + ["--name-only", "--diff-filter=ACMR"], root) or ""
    for name in names.splitlines():
        if name and is_secret_file(name):
            findings.append((name, 0, "secret file (shouldn't be committed; add it to .gitignore)", os.path.basename(name)))
    findings += scan_diff(git(diff_args + ["-U0", "--no-color", "--no-ext-diff", "--diff-filter=ACMR"], root) or "")
    return findings


def scan_changes(root):
    findings = scan_staged(root, include_unstaged=True)
    seen = {f[0] for f in findings}
    for name in (git(["ls-files", "--others", "--exclude-standard"], root) or "").splitlines():
        if not name or name in seen:
            continue
        if is_secret_file(name):
            findings.append((name, 0, "secret file not covered by .gitignore", os.path.basename(name)))
            continue
        text = read_text(os.path.join(root, name))
        if text:
            findings += [(name, n, label, masked) for n, label, masked in find_secrets(text)]
    return findings


def scan_outgoing(root):
    if not git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], root):
        return []
    return scan_diff(git(["diff", "@{u}...HEAD", "-U0", "--no-color", "--no-ext-diff", "--diff-filter=ACMR"], root) or "")


# ---------------------------------------------------------------- payload ---
CMD_KEYS = {"command", "cmd", "script", "commandline", "shell_command"}
TOOL_KEYS = {"tool_name", "toolname", "tool", "name"}


def read_payload():
    if sys.stdin is None or sys.stdin.isatty():
        return {}
    raw = sys.stdin.buffer.read().decode("utf-8", "replace")
    if not raw.strip():
        return {}
    try:
        return json.loads(raw)
    except ValueError:
        return {"command": raw}


def walk(obj, key=""):
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield from walk(v, str(k))
    elif isinstance(obj, list):
        for v in obj:
            yield from walk(v, key)
    elif isinstance(obj, str):
        yield key.lower(), obj


def tool_name(payload):
    if isinstance(payload, dict):
        for k, v in payload.items():
            if k.lower() in TOOL_KEYS and isinstance(v, str):
                return v
    return ""


def split_payload(payload):
    """Return (input_strings, output_strings). Output is anything under a response/result/output key."""
    ins, outs = [], []
    if isinstance(payload, dict):
        for k, v in payload.items():
            target = outs if re.search(r"(?i)response|result|output", str(k)) else ins
            target.extend(walk(v, str(k)))
    else:
        ins.extend(walk(payload))
    return ins, outs


def path_like(value):
    return 0 < len(value) < 400 and "\n" not in value and not value.startswith(("http://", "https://"))


# ------------------------------------------------------------------ output ---
def report(title, findings, advice, stream=sys.stderr):
    lines = [title]
    for f in findings[:20]:
        where = f[0] + (":" + str(f[1]) if f[1] else "")
        lines.append("  - " + where + "  " + f[2] + "  " + f[3])
    if len(findings) > 20:
        lines.append("  … and " + str(len(findings) - 20) + " more")
    lines.append(advice)
    print("\n".join(lines), file=stream)


def block(reason):
    print("Guardian blocked this tool call: it " + reason + ".\n"
          "Do not retry it or a variation of it. Tell the user what was blocked and why. "
          "If they really want it, they can run it themselves in a terminal.", file=sys.stderr)
    return EXIT_BLOCK


# ------------------------------------------------------------------- modes ---
def mode_pre():
    payload = read_payload()
    ins, _ = split_payload(payload)
    name = tool_name(payload).lower()
    is_shell = any(k in CMD_KEYS for k, _ in ins) or re.search(r"shell|bash|pwsh|powershell|terminal|execute_?(?:bash|cmd)", name)
    for key, value in ins:
        if "old" in key:  # text being replaced; removing a secret must stay possible
            continue
        for _, label, masked in find_secrets(value):
            return block("contains what looks like a " + label + " (" + masked + "). Secrets must not go into files, "
                         "commands, tickets or messages. Use an environment variable or a secret manager instead")
        if (key in CMD_KEYS or (is_shell and key in ("", "input", "args"))) and value.strip():
            reason = shell_problem(value)
            if reason:
                return block(reason)
        if key not in CMD_KEYS and path_like(value) and NO_READ_FILE.match(os.path.basename(value.replace("\\", "/"))) and not SAFE_FILE.search(value):
            return block("opens a secret file (" + os.path.basename(value) + ")")
    commands = [v.lower() for k, v in ins if k in CMD_KEYS or is_shell]
    root = repo_root() if commands else None
    if root:
        for c in commands:
            if re.search(r"\bgit\b(?:\s+-c\s+\S+)*\s+commit\b", c):
                findings = scan_staged(root, include_unstaged=bool(re.search(r"\s(?:-[a-z]*a[a-z]*|--all)(?=\s|$)", c)))
                if findings:
                    report("Guardian blocked this commit: the changes contain likely secrets.", findings,
                           "Remove them (and add secret files to .gitignore), then ask the user before committing again. "
                           "Do not print the secret values.")
                    return EXIT_BLOCK
            if re.search(r"\bgit\s+push\b", c):
                findings = scan_outgoing(root)
                if findings:
                    report("Guardian blocked this push: the commits being pushed contain likely secrets.", findings,
                           "Don't push. Tell the user: the secret must be removed from history and rotated.")
                    return EXIT_BLOCK
    return 0


def mode_post():
    payload = read_payload()
    ins, outs = split_payload(payload)
    root = repo_root() or os.getcwd()
    findings, seen = [], set()
    for _, value in ins:
        if not path_like(value):
            continue
        p = value if os.path.isabs(value) else os.path.join(root, value)
        p = os.path.normpath(p)
        if p in seen or not os.path.isfile(p):
            continue
        seen.add(p)
        if is_secret_file(p):
            continue  # reads of secret files are blocked in pre; don't re-scan them here
        text = read_text(p)
        if text:
            rel = os.path.relpath(p, root) if p.startswith(root) else p
            findings += [(rel, n, label, masked) for n, label, masked in find_secrets(text)]
    for _, value in outs:
        findings += [("tool output", n, label, masked) for n, label, masked in find_secrets(value)]
    if findings:
        report("Guardian: likely secrets after the last tool call.", findings,
               "Do not copy, print or commit these values. Tell the user where they are. If one was written by you, "
               "remove it and use an environment variable instead. If one appeared in output, suggest rotating it.")
        return EXIT_BLOCK
    return 0


def mode_changes():
    root = repo_root()
    if not root:
        return 0
    findings = scan_changes(root)
    if findings:
        report("Guardian: the uncommitted changes in this repo contain likely secrets.", findings,
               "Tell the user before anything is committed. Remove the values or move them to environment variables, "
               "and add secret files to .gitignore. Do not print the values.")
        return EXIT_BLOCK
    return 0


def mode_commit():
    root = repo_root()
    if not root:
        return 0
    findings = scan_staged(root)
    if findings:
        report("Guardian blocked this commit: the staged changes contain likely secrets.", findings,
               "Unstage or fix these, then commit again. False positive? Add `" + ALLOW_MARK + "` to that line.")
        return 1
    return 0


HOOK_SCRIPT = """#!/bin/sh
# {mark}: secret scan before every commit (also from GitHub Desktop).
# Installed by .kiro/scripts/guardian.py install-git-hook. Safe to delete.
root="$(git rev-parse --show-toplevel)" || exit 1
script="$root/.kiro/scripts/guardian.py"
if [ ! -f "$script" ]; then
  echo "Guardian: $script not found, so the secret scan was skipped." >&2
  exit 0
fi
for py in python3 python py; do
  if command -v "$py" >/dev/null 2>&1 && "$py" -c "import sys; sys.exit(0 if sys.version_info >= (3, 8) else 1)" >/dev/null 2>&1; then
    exec "$py" "$script" commit
  fi
done
echo "Guardian: Python 3.8+ wasn't found, so the secret scan can't run and the commit is stopped." >&2
echo "Install Python 3, or delete .git/hooks/pre-commit to commit without the scan." >&2
exit 1
""".format(mark=HOOK_MARK)


def hook_path():
    root = repo_root()
    if not root:
        return None, None
    rel = (git(["rev-parse", "--git-path", "hooks"], root) or "").strip()
    if not rel:
        return root, None
    hooks = rel if os.path.isabs(rel) else os.path.join(root, rel)
    return root, os.path.join(hooks, "pre-commit")


def mode_install_git_hook():
    root, path = hook_path()
    if not path:
        print("Guardian: not inside a git repo, so no pre-commit hook was added.")
        return 0
    if os.path.exists(path):
        with open(path, encoding="utf-8", errors="replace") as fh:
            if HOOK_MARK in fh.read():
                print("Guardian: pre-commit hook already installed (" + path + ").")
                return 0
        print("Guardian: " + path + " already exists and isn't Guardian's, so it was left alone.\n"
              "Add this line near the top of it to run the scan too:\n"
              '  python3 "$(git rev-parse --show-toplevel)/.kiro/scripts/guardian.py" commit || exit 1')
        return 0
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(HOOK_SCRIPT)
    os.chmod(path, 0o755)
    print("Guardian: pre-commit hook installed (" + path + "). Every commit in this clone is now scanned for secrets.")
    return 0


def mode_session():
    root, path = hook_path()
    if not path:
        return 0
    try:
        with open(path, encoding="utf-8", errors="replace") as fh:
            installed = HOOK_MARK in fh.read()
    except OSError:
        installed = False
    if not installed:
        print("Guardian: commits in this clone aren't scanned for secrets yet. Ask the user to run "
              "`python3 .kiro/scripts/guardian.py install-git-hook` (Windows: `python ...`) once. Mention it once, briefly.")
    return 0


def mode_scan(paths):
    findings = []
    for start in paths or ["."]:
        targets = [start]
        if os.path.isdir(start):
            targets = []
            for d, dirs, files in os.walk(start):
                dirs[:] = [x for x in dirs if x not in {".git", "node_modules", ".venv", "venv", "__pycache__"}]
                targets += [os.path.join(d, f) for f in files]
        for p in targets:
            if is_secret_file(p):
                findings.append((p, 0, "secret file", os.path.basename(p)))
            text = read_text(p)
            if text:
                findings += [(p, n, label, masked) for n, label, masked in find_secrets(text)]
    if findings:
        report("Guardian: likely secrets found.", findings, "False positive? Add `" + ALLOW_MARK + "` to that line.", sys.stdout)
        return 1
    print("Guardian: no likely secrets found.")
    return 0


def main(argv):
    mode = argv[1] if len(argv) > 1 else ""
    modes = {"pre": mode_pre, "post": mode_post, "changes": mode_changes, "commit": mode_commit,
             "session": mode_session, "install-git-hook": mode_install_git_hook}
    if mode == "scan":
        return mode_scan(argv[2:])
    if mode not in modes:
        print(__doc__)
        return 0
    try:
        return modes[mode]()
    except Exception as exc:  # never break the agent or git because of a scanner bug
        print("Guardian scanner error (" + mode + "): " + type(exc).__name__ + ": " + str(exc), file=sys.stderr)
        return 1 if mode == "commit" else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
