use portable_pty::{native_pty_system, ChildKiller, CommandBuilder, MasterPty, PtySize};
use serde_json::{json, Value};
use std::{
    collections::VecDeque,
    io::{Read, Write},
    sync::{Arc, Condvar, Mutex},
};
use tauri::{AppHandle, Emitter, Manager};
pub struct Terminal {
    pub inner: Mutex<Record>,
    pub flow: Condvar,
}
pub struct Record {
    pub master: Box<dyn MasterPty + Send>,
    pub writer: Box<dyn Write + Send>,
    pub killer: Box<dyn ChildKiller + Send + Sync>,
    pub running: bool,
    pub seq: u64,
    pub data: String,
    pub exit: Option<u32>,
    pub pending: VecDeque<(u64, usize)>,
    pub unacked: usize,
}
pub fn dimension(v: &Value, fallback: u16) -> u16 {
    v.as_u64()
        .map(|n| n.clamp(2, 500) as u16)
        .unwrap_or(fallback)
}
pub fn codex_args(thread: Option<&str>) -> Result<Vec<String>, String> {
    if thread.is_some_and(|s| s.len() != 36 || uuid::Uuid::parse_str(s).is_err()) {
        return Err("Identifiant de conversation invalide.".into());
    }
    let home = std::env::var_os("CODEX_HOME")
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|| crate::workspace::home().join(".codex"));
    use std::os::unix::fs::FileTypeExt;
    let shared = std::fs::metadata(home.join("app-server-control/app-server-control.sock"))
        .is_ok_and(|m| m.file_type().is_socket());
    let mut a = vec![];
    if shared {
        a.extend(["--remote".into(), "unix://".into()])
    }
    a.push("resume".into());
    a.push(thread.unwrap_or("--all").into());
    a.extend([
        "-c".into(),
        "tui.terminal_title=[\"thread-id\",\"thread-title\"]".into(),
        "-c".into(),
        "tui.keymap.composer.queue=[]".into(),
    ]);
    Ok(a)
}
pub fn executable(name: &str) -> Option<std::path::PathBuf> {
    use std::os::unix::fs::PermissionsExt;
    let paths = if name.contains('/') {
        vec![std::path::PathBuf::from(name)]
    } else {
        std::env::split_paths(&std::env::var_os("PATH").unwrap_or_default())
            .map(|p| p.join(name))
            .collect()
    };
    paths.into_iter().find(|p| {
        p.metadata()
            .is_ok_and(|m| m.is_file() && m.permissions().mode() & 0o111 != 0)
    })
}
pub fn codex() -> Option<std::path::PathBuf> {
    executable("codex").or_else(|| {
        executable(
            &crate::workspace::home()
                .join(".local/bin/codex")
                .to_string_lossy(),
        )
    })
}
pub fn shell() -> std::path::PathBuf {
    executable(&std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".into()))
        .unwrap_or_else(|| "/bin/sh".into())
}
pub fn start(
    app: AppHandle,
    id: String,
    path: &str,
    kind: &str,
    args: &Value,
) -> Result<Arc<Terminal>, String> {
    let pair = native_pty_system()
        .openpty(PtySize {
            rows: dimension(&args["rows"], 30),
            cols: dimension(&args["cols"], 100),
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|_| "Création du terminal impossible.")?;
    let binary = if kind == "codex" {
        codex().ok_or("Codex est absent du PATH.")?
    } else {
        shell()
    };
    let mut cmd = CommandBuilder::new(binary);
    if kind == "codex" {
        cmd.args(codex_args(args["threadId"].as_str())?);
    } else {
        cmd.arg("-l");
    }
    cmd.cwd(path);
    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");
    cmd.env("TERM_PROGRAM", "TerminalDeck");
    cmd.env_remove("TERMINAL_DECK_PROFILE");
    cmd.env_remove("ELECTRON_RUN_AS_NODE");
    let mut child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|_| "Démarrage du terminal impossible.")?;
    drop(pair.slave);
    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|_| "Lecture du terminal impossible.")?;
    let writer = pair
        .master
        .take_writer()
        .map_err(|_| "Écriture du terminal impossible.")?;
    let record = Arc::new(Terminal {
        inner: Mutex::new(Record {
            master: pair.master,
            writer,
            killer: child.clone_killer(),
            running: true,
            seq: 0,
            data: String::new(),
            exit: None,
            pending: VecDeque::new(),
            unacked: 0,
        }),
        flow: Condvar::new(),
    });
    let (drained_tx, drained_rx) = std::sync::mpsc::channel();
    let r = record.clone();
    let aid = id.clone();
    let a = app.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 16384];
        let mut bytes = vec![];
        loop {
            {
                let mut state = r.inner.lock().unwrap();
                while state.running && state.unacked >= 131072 {
                    state = r.flow.wait(state).unwrap();
                }
            }
            let n = match reader.read(&mut buf) {
                Ok(0) | Err(_) => break,
                Ok(n) => n,
            };
            bytes.extend_from_slice(&buf[..n]);
            let valid = match std::str::from_utf8(&bytes) {
                Ok(_) => bytes.len(),
                Err(e) if e.error_len().is_none() => e.valid_up_to(),
                Err(_) => bytes.len(),
            };
            if valid == 0 {
                continue;
            }
            let data = String::from_utf8_lossy(&bytes[..valid]).into_owned();
            bytes.drain(..valid);
            let mut s = r.inner.lock().unwrap();
            s.seq += 1;
            let seq = s.seq;
            s.data.push_str(&data);
            if s.data.len() > 524288 {
                let mut cut = s.data.len() - 524288;
                while !s.data.is_char_boundary(cut) {
                    cut += 1
                }
                s.data.drain(..cut);
            }
            s.unacked += data.len();
            s.pending.push_back((seq, data.len()));
            drop(s);
            let current = a
                .state::<crate::Backend>()
                .terminals
                .lock()
                .unwrap()
                .get(&aid)
                .is_some_and(|t| Arc::ptr_eq(t, &r));
            if !current {
                continue;
            }
            let _ = a.emit_to(
                "main",
                "terminal:data",
                json!({"id":aid,"seq":seq,"data":data}),
            );
        }
        let _ = drained_tx.send(());
    });
    let r = record.clone();
    std::thread::spawn(move || {
        let code = child.wait().map(|s| s.exit_code()).unwrap_or(1);
        let mut s = r.inner.lock().unwrap();
        s.running = false;
        s.exit = Some(code);
        r.flow.notify_all();
        drop(s);
        let _ = drained_rx.recv_timeout(std::time::Duration::from_secs(2));
        let current = app
            .state::<crate::Backend>()
            .terminals
            .lock()
            .unwrap()
            .get(&id)
            .is_some_and(|t| Arc::ptr_eq(t, &r));
        if current {
            let _ = app.emit_to("main", "terminal:exit", json!({"id":id,"exitCode":code}));
        }
    });
    Ok(record)
}
impl Terminal {
    pub fn stop(&self) {
        let mut s = self.inner.lock().unwrap();
        if s.running {
            let _ = s.killer.kill();
            s.running = false;
        }
        self.flow.notify_all();
    }
    pub fn snapshot(&self) -> Value {
        let s = self.inner.lock().unwrap();
        json!({"data":s.data,"seq":s.seq,"running":s.running,"exitCode":s.exit})
    }
    pub fn write(&self, data: &str) -> Result<(), String> {
        if data.len() > 65536 {
            return Err("Saisie trop longue (64 Ko maximum).".into());
        }
        let mut s = self.inner.lock().unwrap();
        if !s.running {
            return Err("Cette session est arrêtée.".into());
        }
        s.writer
            .write_all(data.as_bytes())
            .map_err(|_| "Écriture impossible.".into())
    }
    pub fn resize(&self, args: &Value) -> Result<(), String> {
        self.inner
            .lock()
            .unwrap()
            .master
            .resize(PtySize {
                rows: dimension(&args["rows"], 30),
                cols: dimension(&args["cols"], 100),
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|_| "Redimensionnement impossible.".into())
    }
    pub fn ack(&self, seq: u64) {
        let mut s = self.inner.lock().unwrap();
        if seq > s.seq {
            return;
        }
        while s.pending.front().is_some_and(|(n, _)| *n <= seq) {
            let (_, size) = s.pending.pop_front().unwrap();
            s.unacked = s.unacked.saturating_sub(size);
        }
        if s.unacked < 65536 {
            self.flow.notify_all();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn codex_keeps_native_controls() {
        let a = codex_args(None).unwrap();
        assert!(a.iter().any(|s| s == "--all"));
        assert_eq!(a.last().unwrap(), "tui.keymap.composer.queue=[]");
        assert!(codex_args(Some("invalid;echo nope")).is_err());
    }
    #[test]
    fn genuine_pty_resize_and_utf8() {
        let pair = native_pty_system()
            .openpty(PtySize {
                rows: 31,
                cols: 91,
                pixel_width: 0,
                pixel_height: 0,
            })
            .unwrap();
        let mut cmd = CommandBuilder::new("/bin/sh");
        cmd.args(["-c", "stty size; printf 'été\\n'"]);
        let mut child = pair.slave.spawn_command(cmd).unwrap();
        drop(pair.slave);
        let mut reader = pair.master.try_clone_reader().unwrap();
        let mut text = String::new();
        let _ = reader.read_to_string(&mut text);
        assert!(child.wait().unwrap().success());
        assert!(text.contains("31 91"));
        assert!(text.contains("été"));
    }
}
