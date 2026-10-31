mod download;
mod git;
mod quotas;
mod terminal;
mod workspace;
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    path::Path,
    sync::{Arc, Mutex},
};
use tauri::{Emitter, Manager};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_notification::NotificationExt;
struct Backend {
    workspace: Mutex<Value>,
    terminals: Mutex<HashMap<String, Arc<terminal::Terminal>>>,
    quotas: Mutex<quotas::Cache>,
}
fn text(v: &Value) -> Result<&str, String> {
    v.as_str().ok_or("Paramètre invalide.".into())
}
fn find(state: &Value, id: &str) -> Result<(usize, usize), String> {
    for (p, project) in state["projects"].as_array().unwrap().iter().enumerate() {
        if let Some(s) = project["sessions"]
            .as_array()
            .unwrap()
            .iter()
            .position(|s| s["id"] == id)
        {
            return Ok((p, s));
        }
    }
    Err("Session introuvable.".into())
}
fn project_index(state: &Value, id: &str) -> Result<usize, String> {
    state["projects"]
        .as_array()
        .unwrap()
        .iter()
        .position(|p| p["id"] == id)
        .ok_or("Projet introuvable.".into())
}
#[tauri::command]
async fn deck(
    window: tauri::WebviewWindow,
    app: tauri::AppHandle,
    channel: String,
    args: Value,
) -> Result<Value, String> {
    if window.label() != "main" {
        return Err("Accès refusé.".into());
    }
    // Blocking PTY/filesystem operations never block the GTK main loop.
    tauri::async_runtime::spawn_blocking(move || dispatch(&app, &channel, args))
        .await
        .map_err(|_| "Action interrompue.".to_string())?
}
fn dispatch(app: &tauri::AppHandle, channel: &str, args: Value) -> Result<Value, String> {
    let backend = app.state::<Backend>();
    match channel {
        "deck:boot" => Ok(
            json!({"state":*backend.workspace.lock().unwrap(),"codex":terminal::codex().is_some(),"shell":terminal::shell().file_name().unwrap_or_default().to_string_lossy(),"platform":"linux","openCodex":!std::env::args().any(|a|a=="--no-startup-codex"),"runtime":"tauri"}),
        ),
        "clipboard:copy" => {
            let s = text(&args)?;
            if s.len() > 1048576 {
                return Err("Sélection trop longue.".into());
            }
            app.clipboard()
                .write_text(s)
                .map_err(|_| "Copie impossible.")?;
            Ok(json!(true))
        }
        "clipboard:paste" => {
            let s = app.clipboard().read_text().unwrap_or_default();
            Ok(json!(s.chars().take(60000).collect::<String>()))
        }
        "quotas:read" => Ok(quotas::read(&backend.quotas, args == true)),
        "project:catalog" => {
            let root = workspace::home().join("01 - Dev");
            let mut found = vec![];
            for root in [&root, &root.join("00 - Projets à tester")] {
                if let Ok(entries) = std::fs::read_dir(root) {
                    for e in entries.flatten() {
                        let name = e.file_name().to_string_lossy().into_owned();
                        if e.path().is_dir()
                            && !name.starts_with('.')
                            && !(name.len() > 5
                                && name.as_bytes()[..2].iter().all(u8::is_ascii_digit)
                                && name[2..].starts_with(" - "))
                        {
                            found.push(json!({"name":name.split_once("--").map(|(_,n)|n).unwrap_or(&name),"path":e.path()}))
                        }
                    }
                }
            }
            found.sort_by_key(|v| v["name"].as_str().unwrap().to_lowercase());
            Ok(json!(found))
        }
        "project:add" => {
            let path = if let Some(s) = args.as_str() {
                std::path::PathBuf::from(s)
            } else {
                match app
                    .dialog()
                    .file()
                    .set_title("Ouvrir un projet")
                    .blocking_pick_folder()
                {
                    Some(p) => p.into_path().map_err(|_| "Dossier invalide.")?,
                    None => return Ok(Value::Null),
                }
            };
            if !path.is_absolute() || !path.is_dir() {
                return Err("Choisissez un dossier existant.".into());
            }
            let path = path.canonicalize().map_err(|_| "Dossier indisponible.")?;
            let mut state = backend.workspace.lock().unwrap();
            let projects = state["projects"].as_array_mut().unwrap();
            let p = if let Some(p) = projects.iter().find(|p| p["path"] == json!(path)) {
                p.clone()
            } else {
                let p = workspace::project(&path);
                projects.push(p.clone());
                p
            };
            state["activeProject"] = p["id"].clone();
            workspace::save(&state)?;
            Ok(p)
        }
        "git:status" => {
            let path = {
                let state = backend.workspace.lock().unwrap();
                let p = project_index(&state, text(&args)?)?;
                text(&state["projects"][p]["path"])?.to_string()
            };
            git::status(&path)
        }
        "session:add" => {
            let mut state = backend.workspace.lock().unwrap();
            let pi = project_index(&state, text(&args["projectId"])?)?;
            let p = &mut state["projects"][pi];
            if p["sessions"].as_array().unwrap().len() >= 16 {
                return Err("Ce projet contient déjà 16 panneaux.".into());
            }
            let kind = if args["kind"] == "codex" {
                "codex"
            } else {
                "shell"
            };
            let s = json!({"id":workspace::uid(),"kind":kind,"name":if kind=="codex"{"Codex"}else{"Terminal"},"minimized":false});
            let ids = workspace::ids(&p["tree"]);
            let target = args["target"]
                .as_str()
                .filter(|s| ids.iter().any(|id| id == s))
                .unwrap_or_else(|| ids.first().map(String::as_str).unwrap_or(""));
            p["tree"] = workspace::split(
                &p["tree"],
                target,
                s["id"].as_str().unwrap(),
                if args["axis"] == "column" {
                    "column"
                } else {
                    "row"
                },
            );
            p["sessions"].as_array_mut().unwrap().push(s.clone());
            p["active"] = s["id"].clone();
            let result = json!({"session":s,"tree":p["tree"]});
            workspace::save(&state)?;
            Ok(result)
        }
        "session:remove" => {
            let id = text(&args)?;
            let mut state = backend.workspace.lock().unwrap();
            let (pi, _) = find(&state, id)?;
            if let Some(t) = backend.terminals.lock().unwrap().remove(id) {
                t.stop()
            }
            let p = &mut state["projects"][pi];
            p["sessions"]
                .as_array_mut()
                .unwrap()
                .retain(|s| s["id"] != id);
            p["tree"] = workspace::remove(&p["tree"], id);
            if p["active"] == id {
                p["active"] = p["sessions"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .find(|s| s["minimized"] != true)
                    .map(|s| s["id"].clone())
                    .unwrap_or(Value::Null)
            }
            workspace::save(&state)?;
            Ok(json!(true))
        }
        "deck:save" => {
            if !args["projects"].is_array() {
                return Err("Disposition invalide.".into());
            }
            let mut state = backend.workspace.lock().unwrap();
            let mut update = state.clone();
            if state["projects"]
                .as_array()
                .unwrap()
                .iter()
                .any(|p| p["id"] == args["activeProject"])
            {
                update["activeProject"] = args["activeProject"].clone()
            }
            for p in update["projects"].as_array_mut().unwrap() {
                if let Some(changes) = args["projects"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .find(|c| c["id"] == p["id"])
                {
                    p["tree"] = changes["tree"].clone();
                    p["active"] = changes["active"].clone();
                    for s in p["sessions"].as_array_mut().unwrap() {
                        if let Some(c) = changes["sessions"]
                            .as_array()
                            .into_iter()
                            .flatten()
                            .find(|c| c["id"] == s["id"])
                        {
                            for k in [
                                "name",
                                "threadKey",
                                "favorite",
                                "companion",
                                "lastOpened",
                                "title",
                                "minimized",
                            ] {
                                s[k] = c[k].clone();
                            }
                        }
                    }
                }
            }
            for k in ["history", "conversations", "settings"] {
                update[k] = args[k].clone()
            }
            let mut cleaned = workspace::clean(&update, &workspace::fallback());
            for p in cleaned["projects"].as_array_mut().unwrap() {
                let ordered: Vec<_> = workspace::ids(&p["tree"])
                    .iter()
                    .filter_map(|id| {
                        p["sessions"]
                            .as_array()
                            .unwrap()
                            .iter()
                            .find(|s| s["id"] == *id)
                            .cloned()
                    })
                    .collect();
                p["sessions"] = json!(ordered)
            }
            workspace::save(&cleaned)?;
            *state = cleaned;
            Ok(json!(true))
        }
        "terminal:start" => {
            let id = text(&args["id"])?;
            let state = backend.workspace.lock().unwrap();
            let (pi, si) = find(&state, id)?;
            let p = &state["projects"][pi];
            let mut processes = backend.terminals.lock().unwrap();
            if processes
                .get(id)
                .is_some_and(|t| t.inner.lock().unwrap().running)
            {
                return Ok(json!(true));
            }
            let path = text(&p["path"])?;
            if !Path::new(path).is_dir() {
                return Err("Le dossier du projet est indisponible.".into());
            }
            let t = terminal::start(
                app.clone(),
                id.into(),
                path,
                text(&p["sessions"][si]["kind"])?,
                &args,
            )?;
            processes.insert(id.into(), t);
            Ok(json!(true))
        }
        "terminal:attach" => {
            let id = text(&args)?;
            find(&backend.workspace.lock().unwrap(), id)?;
            Ok(backend
                .terminals
                .lock()
                .unwrap()
                .get(id)
                .map(|t| t.snapshot())
                .unwrap_or(json!({"data":"","seq":0,"running":false,"exitCode":null})))
        }
        "terminal:write" | "terminal:resize" | "terminal:ack" => {
            let id = text(&args["id"])?;
            let processes = backend.terminals.lock().unwrap();
            let record = processes.get(id);
            match channel {
                "terminal:write" => record
                    .ok_or("Cette session est arrêtée.")?
                    .write(text(&args["data"])?)?,
                "terminal:resize" => {
                    if let Some(t) = record {
                        t.resize(&args)?
                    }
                }
                _ => {
                    if let (Some(t), Some(seq)) = (record, args["seq"].as_u64()) {
                        t.ack(seq)
                    }
                }
            }
            Ok(json!(true))
        }
        "session:attention" => {
            find(&backend.workspace.lock().unwrap(), text(&args)?)?;
            if app
                .get_webview_window("main")
                .is_some_and(|w| w.is_focused().unwrap_or(true))
            {
                return Ok(json!(false));
            }
            app.notification()
                .builder()
                .extra("sessionId", &args)
                .title("Codex attend votre attention")
                .body("Une session Terminal Deck attend une intervention.")
                .show()
                .map_err(|_| "Notification indisponible.")?;
            Ok(json!(true))
        }
        "studio:open" => {
            if let Some(w) = app.get_webview_window("studio") {
                let _ = w.set_focus();
            } else {
                tauri::WebviewWindowBuilder::new(
                    app,
                    "studio",
                    tauri::WebviewUrl::App("tools/sprite-studio/index.html".into()),
                )
                .title("Atelier des compagnons")
                .inner_size(1200.0, 850.0)
                .on_navigation(|url| {
                    local_page(url, "/tools/sprite-studio/index.html") || url.scheme() == "blob"
                })
                .on_new_window(|_, _| tauri::webview::NewWindowResponse::Deny)
                .build()
                .map_err(|_| "Atelier indisponible.")?;
            }
            Ok(json!(true))
        }
        _ => Err("Commande inconnue.".into()),
    }
}
#[cfg(feature = "native-smoke")]
#[tauri::command]
fn native_smoke_report(window: tauri::WebviewWindow, result: Value) -> Result<(), String> {
    let p = workspace::profile()
        .parent()
        .unwrap()
        .join(if window.label() == "studio" {
            "studio-smoke.json"
        } else {
            "native-smoke.json"
        });
    std::fs::write(p, serde_json::to_vec_pretty(&result).unwrap())
        .map_err(|_| "Rapport indisponible.".into())
}
#[tauri::command]
async fn studio_export(
    window: tauri::WebviewWindow,
    name: String,
    bytes: Vec<u8>,
) -> Result<String, String> {
    if window.label() != "studio" {
        return Err("Accès refusé.".into());
    }
    let folder = {
        #[cfg(feature = "native-smoke")]
        if std::env::var("TERMINAL_DECK_SMOKE").as_deref() == Ok("1") {
            workspace::profile().parent().unwrap().join("exports")
        } else {
            window
                .app_handle()
                .path()
                .download_dir()
                .unwrap_or_else(|_| workspace::home().join("Downloads"))
        }
        #[cfg(not(feature = "native-smoke"))]
        window
            .app_handle()
            .path()
            .download_dir()
            .unwrap_or_else(|_| workspace::home().join("Downloads"))
    };
    tauri::async_runtime::spawn_blocking(move || download::export(&folder, &name, &bytes))
        .await
        .map_err(|_| "Export interrompu.".to_string())?
}
#[cfg(feature = "native-smoke")]
#[tauri::command]
fn native_smoke_close(app: tauri::AppHandle) -> Result<(), String> {
    app.get_webview_window("main")
        .ok_or("Fenêtre absente.")?
        .close()
        .map_err(|_| "Fermeture impossible.".into())
}
fn handlers() -> impl Fn(tauri::ipc::Invoke) -> bool + Send + Sync + 'static {
    #[cfg(feature = "native-smoke")]
    {
        tauri::generate_handler![deck, studio_export, native_smoke_report, native_smoke_close]
    }
    #[cfg(not(feature = "native-smoke"))]
    {
        tauri::generate_handler![deck, studio_export]
    }
}
fn local_page(url: &tauri::Url, path: &str) -> bool {
    ((url.scheme() == "tauri" && url.host_str() == Some("localhost"))
        || (["http", "https"].contains(&url.scheme()) && url.host_str() == Some("tauri.localhost")))
        && url.path() == path
}
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.show();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            tauri::WebviewWindowBuilder::from_config(app.handle(), &app.config().app.windows[0])?
                .on_navigation(|url| local_page(url, "/src/index.html"))
                .on_new_window(|_, _| tauri::webview::NewWindowResponse::Deny)
                .build()?;
            let handle = app.handle().clone();
            let _ = app.notification().on_action(move |action| {
                if let Some(id) = action
                    .notification()
                    .and_then(|n| n.extra().get("sessionId"))
                    .and_then(Value::as_str)
                {
                    if find(&handle.state::<Backend>().workspace.lock().unwrap(), id).is_ok() {
                        if let Some(w) = handle.get_webview_window("main") {
                            let _ = w.unminimize();
                            let _ = w.show();
                            let _ = w.set_focus();
                            let _ = handle.emit_to("main", "session:navigate", id);
                        }
                    }
                }
            });
            Ok(())
        })
        .manage(Backend {
            workspace: Mutex::new(workspace::load()),
            terminals: Mutex::new(HashMap::new()),
            quotas: Mutex::new(quotas::Cache::default()),
        })
        .invoke_handler(handlers())
        .on_page_load(|webview, payload| {
            #[cfg(feature = "native-smoke")]
            if webview.label() == "main"
                && std::env::var("TERMINAL_DECK_SMOKE").as_deref() == Ok("1")
                && matches!(payload.event(), tauri::webview::PageLoadEvent::Finished)
            {
                let script = if std::env::var("TERMINAL_DECK_BENCH").as_deref() == Ok("1") {
                    include_str!("../../scripts/tauri-bench-scenario.js")
                } else {
                    include_str!("../../scripts/tauri-native-scenario.js")
                };
                let _ = webview.eval(script);
            }
            #[cfg(feature = "native-smoke")]
            if webview.label() == "studio"
                && std::env::var("TERMINAL_DECK_SMOKE").as_deref() == Ok("1")
                && matches!(payload.event(), tauri::webview::PageLoadEvent::Finished)
            {
                let _ = webview.eval(include_str!("../../scripts/tauri-studio-scenario.js"));
            }
            #[cfg(not(feature = "native-smoke"))]
            let _ = (webview, payload);
        })
        .on_window_event(|window, event| {
            if window.label() == "main"
                && matches!(event, tauri::WindowEvent::CloseRequested { .. })
            {
                let app = window.app_handle();
                let backend = app.state::<Backend>();
                for t in backend.terminals.lock().unwrap().values() {
                    t.stop()
                }
                app.exit(0);
            }
        })
        .run(tauri::generate_context!())
        .expect("Impossible de démarrer Terminal Deck");
}
