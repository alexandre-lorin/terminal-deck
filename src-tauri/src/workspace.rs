use serde_json::{json, Value};
use std::{
    collections::HashSet,
    fs,
    path::{Path, PathBuf},
};
pub fn uid() -> String {
    uuid::Uuid::new_v4().to_string()
}
pub fn label(v: &Value, fallback: &str, max: usize) -> String {
    v.as_str()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or(fallback)
        .chars()
        .filter(|c| {
            !c.is_control() && !matches!(*c, '\u{202a}'..='\u{202e}' | '\u{2066}'..='\u{2069}')
        })
        .take(max)
        .collect()
}
pub fn valid_id(s: &str) -> bool {
    !s.is_empty()
        && s.len() <= 80
        && s.bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'_' || b == b'-')
}
pub fn project(path: &Path) -> Value {
    json!({"id":uid(),"name":path.file_name().unwrap_or_default().to_string_lossy(),"path":path,"sessions":[],"tree":null,"active":null})
}
pub fn ids(t: &Value) -> Vec<String> {
    match t["type"].as_str() {
        Some("leaf") => t["id"].as_str().map(|s| vec![s.into()]).unwrap_or_default(),
        Some("split") => {
            let mut v = ids(&t["a"]);
            v.extend(ids(&t["b"]));
            v
        }
        _ => vec![],
    }
}
pub fn split(t: &Value, target: &str, id: &str, axis: &str) -> Value {
    if t.is_null() {
        return json!({"type":"leaf","id":id});
    }
    if t["type"] == "leaf" {
        return if t["id"] == target {
            json!({"type":"split","axis":axis,"ratio":0.5,"a":t,"b":{"type":"leaf","id":id}})
        } else {
            t.clone()
        };
    }
    let mut n = t.clone();
    n["a"] = split(&t["a"], target, id, axis);
    n["b"] = split(&t["b"], target, id, axis);
    n
}
pub fn remove(t: &Value, id: &str) -> Value {
    if t.is_null() {
        return Value::Null;
    }
    if t["type"] == "leaf" {
        return if t["id"] == id {
            Value::Null
        } else {
            t.clone()
        };
    }
    let a = remove(&t["a"], id);
    let b = remove(&t["b"], id);
    if a.is_null() {
        b
    } else if b.is_null() {
        a
    } else {
        let mut n = t.clone();
        n["a"] = a;
        n["b"] = b;
        n
    }
}
fn tree(t: &Value, allowed: &HashSet<String>, seen: &mut HashSet<String>, depth: usize) -> Value {
    if depth > 20 {
        return Value::Null;
    }
    if t["type"] == "leaf" {
        if let Some(id) = t["id"].as_str() {
            if allowed.contains(id) && seen.insert(id.into()) {
                return json!({"type":"leaf","id":id});
            }
        }
        return Value::Null;
    }
    if t["type"] != "split" {
        return Value::Null;
    }
    let a = tree(&t["a"], allowed, seen, depth + 1);
    let b = tree(&t["b"], allowed, seen, depth + 1);
    if a.is_null() {
        b
    } else if b.is_null() {
        a
    } else {
        json!({"type":"split","axis":if t["axis"]=="column"{"column"}else{"row"},"ratio":t["ratio"].as_f64().unwrap_or(0.5).clamp(0.15,0.85),"a":a,"b":b})
    }
}
fn meta(s: &Value) -> Value {
    let key = s["threadKey"]
        .as_str()
        .filter(|x| {
            x.len() == 29
                && x.bytes().enumerate().all(|(i, b)| {
                    if [8, 13, 18, 23].contains(&i) {
                        b == b'-'
                    } else {
                        b.is_ascii_hexdigit()
                    }
                })
        })
        .map(str::to_lowercase);
    json!({"threadKey":key,"favorite":s["favorite"]==true,"companion":s["companion"].as_u64().filter(|n|*n<5),"lastOpened":s["lastOpened"].as_u64().unwrap_or(0),"title":label(&s["title"],"",240)})
}
pub fn clean(raw: &Value, fallback: &Path) -> Value {
    let mut projects = vec![];
    let mut paths = HashSet::new();
    let mut session_ids = HashSet::new();
    let mut project_ids = HashSet::new();
    for p in raw["projects"].as_array().into_iter().flatten().take(100) {
        let Some(path) = p["path"].as_str().filter(|s| Path::new(s).is_absolute()) else {
            continue;
        };
        if !paths.insert(path.to_owned()) {
            continue;
        }
        let mut n = project(Path::new(path));
        let id = p["id"]
            .as_str()
            .filter(|s| valid_id(s) && project_ids.insert(s.to_string()))
            .map(str::to_owned)
            .unwrap_or_else(uid);
        n["id"] = json!(id);
        n["name"] = json!(label(
            &p["name"],
            n["name"].as_str().unwrap_or("Projet"),
            80
        ));
        let mut sessions = vec![];
        for s in p["sessions"].as_array().into_iter().flatten().take(16) {
            let Some(id) = s["id"]
                .as_str()
                .filter(|s| valid_id(s) && session_ids.insert(s.to_string()))
            else {
                continue;
            };
            let kind = if s["kind"] == "codex" {
                "codex"
            } else {
                "shell"
            };
            let mut item = meta(s);
            item["id"] = json!(id);
            item["kind"] = json!(kind);
            item["name"] = json!(label(
                &s["name"],
                if kind == "codex" { "Codex" } else { "Terminal" },
                80
            ));
            item["minimized"] = json!(s["minimized"] == true);
            sessions.push(item);
        }
        let allowed = sessions
            .iter()
            .map(|s| s["id"].as_str().unwrap().into())
            .collect();
        let mut t = tree(&p["tree"], &allowed, &mut HashSet::new(), 0);
        for s in &sessions {
            let id = s["id"].as_str().unwrap();
            if !ids(&t).iter().any(|x| x == id) {
                t = split(
                    &t,
                    ids(&t).first().map(String::as_str).unwrap_or(""),
                    id,
                    "row",
                );
            }
        }
        n["active"] = sessions
            .iter()
            .find(|s| s["id"] == p["active"] && s["minimized"] != true)
            .or_else(|| sessions.iter().find(|s| s["minimized"] != true))
            .map(|s| s["id"].clone())
            .unwrap_or(Value::Null);
        n["sessions"] = json!(sessions);
        n["tree"] = t;
        projects.push(n);
    }
    if projects.is_empty() {
        projects.push(project(fallback));
    }
    let active = projects
        .iter()
        .find(|p| p["id"] == raw["activeProject"])
        .unwrap_or(&projects[0])["id"]
        .clone();
    let theme = raw["settings"]["theme"]
        .as_str()
        .filter(|s| ["noir", "graphite", "cendre", "perigee"].contains(s))
        .unwrap_or("noir");
    let history:Vec<_>=raw["history"].as_array().into_iter().flatten().filter(|h|h["sessionId"].as_str().is_some_and(valid_id)&&h["at"].as_u64().is_some_and(|n|n>0)).take(80).map(|h|json!({"sessionId":h["sessionId"],"at":h["at"],"title":label(&h["title"],"Codex",240)})).collect();
    // Conversation metadata contains only documented fields, never terminal output.
    let mut conversations = vec![];
    for c in raw["conversations"]
        .as_array()
        .into_iter()
        .flatten()
        .take(500)
    {
        let m = meta(&json!({"threadKey":c["key"]}));
        if m["threadKey"].is_null() {
            continue;
        }
        let mut n = meta(c);
        n.as_object_mut().unwrap().remove("threadKey");
        n["key"] = m["threadKey"].clone();
        n["fullId"] = c["fullId"]
            .as_str()
            .filter(|s| {
                uuid::Uuid::parse_str(s).is_ok() && s.starts_with(m["threadKey"].as_str().unwrap())
            })
            .map(|s| json!(s.to_lowercase()))
            .unwrap_or(Value::Null);
        n["ambiguous"] = json!(c["ambiguous"] == true);
        n["projectId"] = c["projectId"]
            .as_str()
            .filter(|s| valid_id(s))
            .map(|s| json!(s))
            .unwrap_or(Value::Null);
        conversations.push(n);
    }
    json!({"version":1,"projects":projects,"activeProject":active,"history":history,"conversations":conversations,"settings":{"theme":theme,"fontSize":raw["settings"]["fontSize"].as_f64().unwrap_or(14.0).clamp(11.0,22.0)}})
}
pub fn profile() -> PathBuf {
    std::env::var_os("TERMINAL_DECK_PROFILE")
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            let base = std::env::var_os("XDG_CONFIG_HOME")
                .map(PathBuf::from)
                .unwrap_or_else(|| home().join(".config"));
            base.join("terminal-deck-tauri")
        })
        .join("workspace.json")
}
pub fn home() -> PathBuf {
    std::env::var_os("HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("/tmp"))
}
pub fn fallback() -> PathBuf {
    let p = home().join("01 - Dev");
    if p.is_dir() {
        p
    } else {
        home()
    }
}
pub fn load() -> Value {
    let raw = fs::read(profile())
        .ok()
        .and_then(|b| serde_json::from_slice(&b).ok())
        .unwrap_or(Value::Null);
    clean(&raw, &fallback())
}
pub fn save(v: &Value) -> Result<(), String> {
    use std::os::unix::fs::{OpenOptionsExt, PermissionsExt};
    let p = profile();
    let dir = p.parent().unwrap();
    fs::create_dir_all(dir).map_err(|_| "Profil indisponible")?;
    fs::set_permissions(dir, fs::Permissions::from_mode(0o700))
        .map_err(|_| "Permissions du profil")?;
    let tmp = p.with_extension("json.tmp");
    let mut f = fs::OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .mode(0o600)
        .open(&tmp)
        .map_err(|_| "Écriture du profil")?;
    use std::io::Write;
    f.write_all(serde_json::to_string_pretty(v).unwrap().as_bytes())
        .map_err(|_| "Écriture du profil")?;
    f.sync_all().map_err(|_| "Écriture du profil")?;
    fs::rename(tmp, p).map_err(|_| "Écriture du profil".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn restore_and_sanitize() {
        let dir = Path::new("/tmp/deck-fixture");
        let input = json!({"projects":[{"id":"p","path":dir,"sessions":[{"id":"one","kind":"codex","companion":4,"title":"Nom\u{001b} propre"},{"id":"two","kind":"shell","minimized":true}],"tree":{"type":"split","axis":"row","ratio":0.7,"a":{"type":"leaf","id":"one"},"b":{"type":"leaf","id":"two"}},"active":"one"}],"activeProject":"p","transcript":"NEVER SAVE","settings":{"fontSize":100}});
        let state = clean(&input, dir);
        assert_eq!(state["projects"][0]["sessions"][0]["companion"], 4);
        assert_eq!(ids(&state["projects"][0]["tree"]), vec!["one", "two"]);
        assert!(state["transcript"].is_null());
        assert_eq!(state["settings"]["fontSize"], 22.0);
        assert_eq!(state["projects"][0]["sessions"][0]["title"], "Nom propre");
    }
    #[test]
    fn duplicate_and_untrusted_tree() {
        let input = json!({"projects":[{"id":"p","path":"/tmp","sessions":[{"id":"one"},{"id":"one"},{"id":"two"}],"tree":{"type":"split","a":{"type":"leaf","id":"intruder"},"b":{"type":"leaf","id":"one"}}}]});
        let s = clean(&input, Path::new("/tmp"));
        assert_eq!(s["projects"][0]["sessions"].as_array().unwrap().len(), 2);
        assert_eq!(ids(&s["projects"][0]["tree"]), vec!["one", "two"]);
    }
    #[test]
    fn identities_survive() {
        let key = "01a1654c-27f6-7490-8804-d1b60";
        let full = "01a1654c-27f6-7490-8804-d1b60fbdc5f9";
        let input = json!({"conversations":[{"key":key,"fullId":full,"title":"Mon chat","companion":3,"favorite":true}]});
        let s = clean(&input, Path::new("/tmp"));
        assert_eq!(s["conversations"][0]["fullId"], full);
        assert_eq!(s["conversations"][0]["companion"], 3);
    }
}
