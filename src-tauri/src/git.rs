use serde_json::{json, Value};
use std::{
    io::Read,
    process::{Command, Stdio},
    time::{Duration, Instant},
};
// Fixed read-only command, bounded output and timeout. No shell or user arguments.
pub fn status(path: &str) -> Result<Value, String> {
    let mut child = Command::new("git")
        .args([
            "--no-optional-locks",
            "-c",
            "core.fsmonitor=false",
            "status",
            "--porcelain=v1",
            "-z",
            "--branch",
            "--untracked-files=normal",
        ])
        .env("GIT_OPTIONAL_LOCKS", "0")
        .current_dir(path)
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|_| "Git est indisponible.")?;
    let stdout = child.stdout.take().unwrap();
    let (tx, rx) = std::sync::mpsc::channel();
    std::thread::spawn(move || {
        let mut bytes = vec![];
        let _ = stdout.take(2_097_153).read_to_end(&mut bytes);
        let _ = tx.send(bytes);
    });
    let deadline = Instant::now() + Duration::from_secs(8);
    let exit = loop {
        if let Some(s) = child.try_wait().map_err(|_| "Lecture Git impossible.")? {
            break s;
        }
        if Instant::now() >= deadline {
            let _ = child.kill();
            let _ = child.wait();
            return Err("Lecture Git trop longue.".into());
        }
        std::thread::sleep(Duration::from_millis(20));
    };
    let bytes = rx
        .recv_timeout(Duration::from_secs(1))
        .map_err(|_| "Lecture Git impossible.")?;
    if !exit.success() {
        return Ok(json!({"repository":false}));
    }
    if bytes.len() > 2_097_152 {
        return Err("Trop de changements à afficher.".into());
    }
    let text = String::from_utf8_lossy(&bytes);
    let mut parts = text.split('\0');
    let branch = parts.next().unwrap_or("").trim_start_matches("## ");
    let mut files = vec![];
    while let Some(entry) = parts.next() {
        if entry.len() < 3 {
            continue;
        }
        let code = &entry[..2];
        let path = &entry[3..];
        let previous = if code.contains('R') || code.contains('C') {
            parts.next()
        } else {
            None
        };
        files.push(json!({"status":code,"path":path,"previous":previous}));
    }
    Ok(json!({"repository":true,"branch":branch,"files":files}))
}
