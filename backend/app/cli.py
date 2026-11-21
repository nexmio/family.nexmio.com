"""Server-side commands: python -m app.cli set-code | reset-code | ..."""

import argparse
import getpass
import sys

from app.core import access_code
from app.core.config import MIN_CODE_LENGTH
from app.core.migrate import migrate


def _set_code(args: argparse.Namespace) -> int:
    migrate()
    if args.code_from_stdin:
        code = sys.stdin.readline().rstrip("\r\n")
    else:
        code = getpass.getpass("New code: ")
        if code != getpass.getpass("Repeat the code: "):
            print("The two entries are not the same.", file=sys.stderr)
            return 1
    try:
        access_code.set_code(code)
    except ValueError:
        print(f"The code must be at least {MIN_CODE_LENGTH} characters.", file=sys.stderr)
        return 1
    print("The code is set.")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="app.cli")
    sub = parser.add_subparsers(dest="command", required=True)
    for name in ("set-code", "reset-code"):
        p = sub.add_parser(name, help="Set or reset the shared family code")
        p.add_argument("--code-from-stdin", action="store_true")
        p.set_defaults(func=_set_code)
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
