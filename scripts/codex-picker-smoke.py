"""Recette du vrai CLI, avec HOME/CODEX_HOME temporaires et fournisseur local fictif."""
import fcntl
import os
from pathlib import Path
import pty
import re
import select
import shutil
import signal
import struct
import tempfile
import termios
import time

root = Path(tempfile.mkdtemp(prefix="td-native-picker-"))
home, codex_home = root / "home", root / "codex"
home.mkdir()
codex_home.mkdir()
(codex_home / "config.toml").write_text(
    'model="fixture"\nmodel_provider="fixture"\n'
    '[model_providers.fixture]\nname="Fixture locale"\n'
    'base_url="http://127.0.0.1:1/v1"\nwire_api="responses"\n'
    'requires_openai_auth=false\n'
)
env = {k: v for k, v in os.environ.items()
       if not k.startswith("CODEX_") and k not in ("OPENAI_API_KEY", "OPENAI_BASE_URL")}
env.update(HOME=str(home), CODEX_HOME=str(codex_home), TERM="xterm-256color")
local_binary = Path.home() / ".local/bin/codex"
binary = str(local_binary) if local_binary.is_file() else shutil.which("codex")
if not binary:
    raise RuntimeError("Codex CLI introuvable")
pid, fd = pty.fork()
if pid == 0:
    os.chdir(home)
    os.execve(binary, ["codex", "--no-daemon", "resume", "--all"], env)
fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", 35, 110, 0, 0))


def read_for(seconds):
    data, end = b"", time.monotonic() + seconds
    while time.monotonic() < end:
        if select.select([fd], [], [], .05)[0]:
            try:
                chunk = os.read(fd, 65536)
            except OSError:
                break
            data += chunk
            for ask, answer in ((b"\x1b[6n", b"\x1b[1;1R"),
                                (b"\x1b[c", b"\x1b[?1;2c"),
                                (b"\x1b[>c", b"\x1b[>1;4000;0c"),
                                (b"\x1b[?u", b"\x1b[?0u")):
                if ask in chunk:
                    os.write(fd, answer)
    return data


def plain(data):
    return re.sub(rb"\x1b\[[0-?]*[ -/]*[@-~]", b"", data)


try:
    initial = read_for(4)
    assert b"Resume a previous session" in plain(initial), "Sélecteur initial absent"
    assert b"\x1b[1m\x1b[4m All " in initial, "Filtre All absent au démarrage"
    os.write(fd, b"\x1b")
    new = read_for(3)
    assert b"for shortcuts" in plain(new), "Échap n'ouvre pas le nouveau chat"
    assert os.waitpid(pid, os.WNOHANG) == (0, 0), "Le CLI s'est arrêté sur Échap"
    for char in b"/resume":
        os.write(fd, bytes([char]))
        time.sleep(.06)
    read_for(.3)
    os.write(fd, b"\r")
    reopened = read_for(3)
    assert b"Resume a previous session" in plain(reopened), "Sélecteur /resume absent"
    all_selected = b"\x1b[1m\x1b[4m All " in reopened
    print("CLI natif : resume --all, Échap → nouveau chat, /resume : validés.")
    print("Filtre All conservé par /resume :", all_selected)
    if not all_selected:
        os.write(fd, b"\x1b[C")
        changed = read_for(1)
        print("Flèche droite sélectionne All :", b"\x1b[1m\x1b[4m All " in changed)
finally:
    try:
        os.killpg(pid, signal.SIGTERM)
        os.waitpid(pid, 0)
    except (ProcessLookupError, ChildProcessError):
        pass
    os.close(fd)
    shutil.rmtree(root)
