use serde_json::{json, Value};
use std::{
    io::{BufRead, BufReader, Read, Write},
    process::{Command, Stdio},
    sync::Mutex,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
#[derive(Default)]
pub struct Cache {
    pub value: Option<Value>,
    pub attempted: Option<Instant>,
}
pub fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
pub fn normalize(result: &Value) -> Vec<Value> {
    let buckets: Vec<(String, Value)> = result["rateLimitsByLimitId"]
        .as_object()
        .filter(|m| !m.is_empty())
        .map(|m| {
            m.iter()
                .take(12)
                .map(|(k, v)| (k.clone(), v.clone()))
                .collect()
        })
        .unwrap_or_else(|| vec![("codex".into(), result["rateLimits"].clone())]);
    buckets.into_iter().filter_map(|(id,b)|{let windows:Vec<_>=["primary","secondary"].into_iter().filter_map(|key|{let w=&b[key];let used=w["usedPercent"].as_f64().filter(|n|*n>=0.0)?;Some(json!({"key":key,"usedPercent":used,"windowDurationMins":w["windowDurationMins"].as_f64().filter(|n|*n>0.0),"resetsAt":w["resetsAt"].as_f64().filter(|n|*n>0.0)}))}).collect();if windows.is_empty(){None}else{Some(json!({"id":crate::workspace::label(&json!(id),"codex",80),"name":crate::workspace::label(&b["limitName"],if id=="codex"{"Codex"}else{&id},80),"windows":windows}))}}).collect()
}
fn query() -> Result<Vec<Value>, String> {
    let binary = crate::terminal::codex().ok_or("missing")?;
    let mut child = Command::new(binary)
        .args(["app-server", "--listen", "stdio://"])
        .current_dir(crate::workspace::home())
        .env_remove("TERMINAL_DECK_PROFILE")
        .env_remove("ELECTRON_RUN_AS_NODE")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|_| "unavailable")?;
    let mut input = child.stdin.take().ok_or("unavailable")?;
    let output = child.stdout.take().ok_or("unavailable")?;
    let (tx, rx) = std::sync::mpsc::sync_channel(8);
    std::thread::spawn(move || {
        let mut reader = BufReader::new(output);
        let mut total = 0;
        loop {
            let mut bytes = vec![];
            let n = reader
                .by_ref()
                .take(2097153 - total)
                .read_until(b'\n', &mut bytes)
                .unwrap_or(0);
            if n == 0 {
                break;
            }
            total += n as u64;
            if total > 2097152 {
                break;
            }
            if let Ok(v) = serde_json::from_slice::<Value>(&bytes) {
                if tx.send(v).is_err() {
                    break;
                }
            }
        }
    });
    let result = (|| {
        writeln!(input,"{}",json!({"id":1,"method":"initialize","params":{"clientInfo":{"name":"terminal_deck_usage","version":"0.4.0"}}})).map_err(|_|"unavailable")?;
        let deadline = Instant::now() + Duration::from_secs(12);
        loop {
            let msg = rx
                .recv_timeout(deadline.saturating_duration_since(Instant::now()))
                .map_err(|_| "timeout")?;
            let id = msg["id"].as_u64().unwrap_or(0);
            if ![1, 2].contains(&id) {
                continue;
            }
            if !msg["error"].is_null() {
                return Err(if msg["error"]["code"] == -32601 {
                    "unsupported"
                } else {
                    "unavailable"
                }
                .to_string());
            }
            if id == 1 {
                writeln!(
                    input,
                    "{}\n{}",
                    json!({"method":"initialized"}),
                    json!({"id":2,"method":"account/rateLimits/read"})
                )
                .map_err(|_| "unavailable")?;
            } else {
                return Ok(normalize(&msg["result"]));
            }
        }
    })();
    drop(input);
    let _ = child.kill();
    let _ = child.wait();
    result
}
pub fn read(cache: &Mutex<Cache>, force: bool) -> Value {
    let mut c = cache.lock().unwrap();
    if !force
        && c.attempted
            .is_some_and(|t| t.elapsed() < Duration::from_secs(300))
    {
        if let Some(v) = &c.value {
            return v.clone();
        }
    }
    c.attempted = Some(Instant::now());
    let v = match query() {
        Ok(groups) => {
            json!({"status":if groups.is_empty(){"unavailable"}else{"ready"},"reason":if groups.is_empty(){Some("empty")}else{None},"groups":groups,"updatedAt":now()})
        }
        Err(reason) => {
            if let Some(old) = &c.value {
                if old["groups"].as_array().is_some_and(|a| !a.is_empty()) {
                    let mut v = old.clone();
                    v["status"] = json!("stale");
                    v["reason"] = json!(reason);
                    v
                } else {
                    json!({"status":"unavailable","groups":[],"updatedAt":null,"reason":reason})
                }
            } else {
                json!({"status":"unavailable","groups":[],"updatedAt":null,"reason":reason})
            }
        }
    };
    c.value = Some(v.clone());
    v
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn usage_is_not_remaining() {
        let result = json!({"rateLimits":{"primary":{"usedPercent":39,"windowDurationMins":300,"resetsAt":1234},"secondary":{"usedPercent":19,"windowDurationMins":10080}}});
        let g = normalize(&result);
        assert_eq!(g[0]["windows"][0]["usedPercent"], 39.0);
        assert_eq!(g[0]["windows"][1]["resetsAt"], Value::Null);
        assert!(normalize(&json!({"rateLimits":{"primary":{"usedPercent":-1}}})).is_empty());
    }
}
