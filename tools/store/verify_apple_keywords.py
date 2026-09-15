#!/usr/bin/env python3
"""Read-only UTF-8/single-line/100-byte guard, not full Apple policy validation.

Only explicit local keywords.txt paths are read. Parent-directory symlinks are
allowed; final-component symlinks are not. This is not a hostile-filesystem
sandbox and does not authenticate, discover files, rewrite text or upload.
"""
import json
import os
from pathlib import Path
import stat
import sys


LIMIT = 100
USAGE = 'Usage: verify_apple_keywords.py PATH/keywords.txt [PATH/keywords.txt ...]'


def read_keywords(supplied_path):
    """Return the resolved identity and valid byte count, or raise safely.

    Fail closed when safe open flags are unavailable. O_NONBLOCK prevents a
    substituted FIFO from hanging between lstat and open; fstat verifies the
    actual descriptor before reading. All opened descriptors are closed.
    """
    path = Path(supplied_path)
    if path.name != 'keywords.txt' or not stat.S_ISREG(path.lstat().st_mode):
        raise ValueError('invalid input')
    if not hasattr(os, 'O_NOFOLLOW') or not hasattr(os, 'O_NONBLOCK'):
        raise ValueError('safe open unavailable')
    fd = os.open(supplied_path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        opened = os.fstat(fd)
        if not stat.S_ISREG(opened.st_mode):
            raise ValueError('invalid input')
        resolved = path.resolve(strict=True)
        current = path.lstat()
        if (not stat.S_ISREG(current.st_mode)
                or (current.st_dev, current.st_ino) != (opened.st_dev, opened.st_ino)):
            raise ValueError('input changed')
        # fdopen borrows the descriptor so the single finally owns its lifetime.
        with os.fdopen(fd, 'rb', closefd=False) as stream:
            text = stream.read().decode('utf-8', errors='strict')
    finally:
        os.close(fd)
    if text.endswith('\r\n'):
        text = text[:-2]
    elif text.endswith('\n'):
        text = text[:-1]
    if not text or any(ord(char) < 32 or ord(char) == 127 or char == '\ufeff'
                       for char in text):
        raise ValueError('invalid input')
    return resolved, len(text.encode('utf-8'))


def main(argv=None):
    """Emit only JSON path/count/limit diagnostics and return aggregate status."""
    paths = sys.argv[1:] if argv is None else argv
    if not paths:
        print(USAGE, file=sys.stderr)
        return 2
    seen = set()
    status = 0
    for supplied in paths:
        try:
            resolved, count = read_keywords(supplied)
        except (OSError, ValueError, RuntimeError):
            # Never print exception strings, decoded prefixes or field contents.
            count = None
            status = 2
        else:
            # Validate before deduplication so an alias cannot hide a bad input.
            if resolved in seen:
                continue
            seen.add(resolved)
            if count > LIMIT:
                status = max(status, 1)
        print(json.dumps({'path': str(supplied), 'bytes': count, 'limit': LIMIT},
                         ensure_ascii=True))
    return status


if __name__ == '__main__':
    raise SystemExit(main())
