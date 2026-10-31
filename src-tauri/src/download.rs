use serde_json::Value;
use std::{io::Write, path::Path};
pub fn export(folder: &Path, name: &str, bytes: &[u8]) -> Result<String, String> {
    if name.is_empty()
        || name.len() > 120
        || name.starts_with('.')
        || !name
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b"._-".contains(&b))
    {
        return Err("Nom d’export invalide.".into());
    }
    if bytes.len() > 8_388_608 {
        return Err("Export trop volumineux.".into());
    }
    if name.ends_with(".png") {
        if !bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
            return Err("PNG invalide.".into());
        }
    } else if name.ends_with(".json") {
        serde_json::from_slice::<Value>(bytes).map_err(|_| "JSON invalide.")?;
    } else {
        return Err("Format d’export invalide.".into());
    }
    std::fs::create_dir_all(folder).map_err(|_| "Téléchargements indisponibles.")?;
    use std::os::unix::fs::OpenOptionsExt;
    for n in 0..10000 {
        let file = if n == 0 {
            name.to_owned()
        } else {
            format!("{n}-{name}")
        };
        match std::fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .mode(0o600)
            .open(folder.join(&file))
        {
            Ok(mut f) => {
                f.write_all(bytes)
                    .map_err(|_| "Écriture de l’export impossible.")?;
                return Ok(file);
            }
            Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => continue,
            Err(_) => return Err("Écriture de l’export impossible.".into()),
        }
    }
    Err("Trop d’exports de même nom.".into())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn safe_export_without_overwrite() {
        let dir = std::env::temp_dir().join(format!("deck-export-{}", uuid::Uuid::new_v4()));
        assert!(export(&dir, "../no.json", b"{}").is_err());
        assert!(export(&dir, "no.png", b"invalid").is_err());
        assert_eq!(export(&dir, "sprite.json", b"{}").unwrap(), "sprite.json");
        assert_eq!(
            export(&dir, "sprite.json", b"{\"x\":1}").unwrap(),
            "1-sprite.json"
        );
        assert_eq!(std::fs::read(dir.join("sprite.json")).unwrap(), b"{}");
        std::fs::remove_dir_all(dir).unwrap();
    }
}
