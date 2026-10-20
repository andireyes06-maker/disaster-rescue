#!/usr/bin/env python3
"""Portable source recovery: exact allow-list, hashes, no symlinks or macOS metadata.

pack ROOT FILE_LIST.json OUTPUT_DIR, where FILE_LIST is an array of relative paths.
verify OUTPUT_DIR checks every archive entry before any extraction is permitted.
Use a fresh output directory. This never reads environment credentials or Git objects.
"""
import hashlib, json, pathlib, re, sys, tarfile


def safe_name(name):
    p = pathlib.PurePosixPath(name)
    return bool(name and p.parts and '\\' not in name and ':' not in name and not p.is_absolute() and '..' not in p.parts and str(p) == name
                and all(not part.startswith('._') and part not in {'.git', '.DS_Store', '__MACOSX', 'node_modules', '.dart_tool', 'build'} for part in p.parts)
                and (not p.name.startswith('.env') or name.endswith('.env.example')))


def digest(data): return hashlib.sha256(data).hexdigest()


# Any PEM private key header (PKCS8, RSA, EC, OpenSSH, encrypted), anywhere in the file, plus the
# one-line JSON form of a service-account key. No file name is exempt: a test fixture with a real key is still a leak.
PRIVATE_KEY = re.compile(rb'-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----|"private_key"\s*:\s*"-----BEGIN')


def pack(root, names, output):
    root, output = pathlib.Path(root).resolve(), pathlib.Path(output)
    names = sorted(names)
    if len(names) != len(set(names)): raise ValueError('duplicate source paths')
    rows, files = [], []
    for name in names:
        if not safe_name(name): raise ValueError('unsafe source path: ' + name)
        path = root / name
        if path.is_symlink() or not path.is_file() or not path.resolve().is_relative_to(root): raise ValueError('not a regular owned source file: ' + name)
        data = path.read_bytes()
        if PRIVATE_KEY.search(data): raise ValueError('private key in ' + name)
        rows.append({'path': name, 'sha256': digest(data), 'size': len(data)})
        files.append((name, path, data))
    output.mkdir(parents=True, exist_ok=False)
    with tarfile.open(output / 'source.tar.gz', 'w:gz', format=tarfile.PAX_FORMAT) as archive:
        import io
        for name, path, data in files:
            info = tarfile.TarInfo(name)
            info.size, info.mode, info.mtime = len(data), (0o755 if path.stat().st_mode & 0o111 else 0o644), 0
            archive.addfile(info, io.BytesIO(data))
    (output / 'MANIFEST.json').write_text(json.dumps({'format': 1, 'files': rows}, indent=2) + '\n')
    (output / 'SHA256SUMS').write_text(''.join(digest((output / name).read_bytes()) + '  ' + name + '\n' for name in ['MANIFEST.json', 'source.tar.gz']))
    return verify(output)


def verify(output):
    output = pathlib.Path(output)
    checksum_lines = (output / 'SHA256SUMS').read_text().splitlines()
    if len(checksum_lines) != 2 or {line.split('  ', 1)[-1] for line in checksum_lines} != {'MANIFEST.json', 'source.tar.gz'}: raise ValueError('incomplete bundle checksums')
    for line in checksum_lines:
        expected, name = line.split('  ', 1)
        if name not in {'MANIFEST.json', 'source.tar.gz'} or digest((output / name).read_bytes()) != expected: raise ValueError('bundle checksum mismatch')
    rows = json.loads((output / 'MANIFEST.json').read_text())['files']
    expected = {r['path']: r for r in rows}
    if len(rows) != len(expected): raise ValueError('duplicate manifest paths')
    seen = set()
    with tarfile.open(output / 'source.tar.gz', 'r:gz') as archive:
        for member in archive:
            name = member.name
            if not safe_name(name) or not member.isfile() or name in seen or name not in expected: raise ValueError('unexpected archive entry: ' + name)
            seen.add(name)
            data = archive.extractfile(member).read()
            row = expected[name]
            if member.size != row['size'] or digest(data) != row['sha256']: raise ValueError('source hash mismatch: ' + name)
    if seen != expected.keys(): raise ValueError('archive file set does not match manifest')
    return len(seen)


if __name__ == '__main__':
    if sys.argv[1] == 'pack': print(pack(sys.argv[2], json.loads(pathlib.Path(sys.argv[3]).read_text()), sys.argv[4]))
    elif sys.argv[1] == 'verify': print(verify(sys.argv[2]))
    else: raise SystemExit('use pack ROOT FILE_LIST.json OUTPUT_DIR or verify OUTPUT_DIR')
