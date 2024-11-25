// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod commands {
    use sha2::{Digest, Sha256};
    use std::fs::File;
    use std::io::Read;
    use std::path::Path;
    use std::fs;

    #[cfg(target_os = "windows")]
    use {
        std::ffi::OsStr,
        std::os::windows::ffi::OsStrExt,
        windows::{core::PCWSTR, Win32::Foundation::*, Win32::System::Com::*, Win32::UI::Shell::*}
    };

    #[cfg(target_os = "macos")]
    use std::process::Command;

    #[cfg(target_os = "linux")]
    use std::process::Command;

    #[tauri::command]
    pub fn greet(name: &str) -> String {
        format!("Hello, {}! You've been greeted from Rust!", name)
    }

    #[tauri::command]
    pub async fn calculate_file_hash(path: &str) -> Result<String, String> {
        let mut file = File::open(path).map_err(|e| e.to_string())?;
        let mut hasher = Sha256::new();
        let mut buffer = [0; 1024];

        loop {
            let bytes_read = file.read(&mut buffer).map_err(|e| e.to_string())?;
            if bytes_read == 0 {
                break;
            }
            hasher.update(&buffer[..bytes_read]);
        }

        let hash = hasher.finalize();
        Ok(format!("{:x}", hash))
    }

    #[cfg(target_os = "windows")]
    #[tauri::command]
    pub fn move_to_recycle_bin(file_path: &str) -> Result<(), String> {
        if !Path::new(file_path).exists() {
            return Err(format!("File not found: {}", file_path));
        }

        let wide_path: Vec<u16> = OsStr::new(file_path)
            .encode_wide()
            .chain(std::iter::once(0))
            .chain(std::iter::once(0))
            .collect();

        unsafe {
            let _com = CoInitializeEx(None, COINIT_APARTMENTTHREADED).map_err(|e| e.to_string())?;

            let mut file_op = SHFILEOPSTRUCTW {
                hwnd: HWND(0),
                wFunc: FO_DELETE,
                pFrom: PCWSTR(wide_path.as_ptr()),
                pTo: PCWSTR::null(),
                fFlags: (FOF_ALLOWUNDO | FOF_NOCONFIRMATION | FOF_NOERRORUI | FOF_SILENT).0 as u16,
                fAnyOperationsAborted: BOOL(0),
                hNameMappings: std::ptr::null_mut(),
                lpszProgressTitle: PCWSTR::null(),
            };

            let result = SHFileOperationW(&mut file_op);

            if result != 0 {
                let last_error = GetLastError();
                return Err(format!("Failed to move file to recycle bin: {} (error code: {}, last error: {:?})", file_path, result, last_error));
            }

            if file_op.fAnyOperationsAborted.as_bool() {
                return Err(format!("Operation was aborted for file: {}", file_path));
            }

            Ok(())
        }
    }

    #[cfg(target_os = "macos")]
    #[tauri::command]
    pub fn move_to_recycle_bin(file_path: &str) -> Result<(), String> {
        if !Path::new(file_path).exists() {
            return Err(format!("File not found: {}", file_path));
        }

        let status = Command::new("osascript")
            .arg("-e")
            .arg(format!(
                "tell application \"Finder\" to delete POSIX file \"{}\"",
                file_path
            ))
            .status()
            .map_err(|e| e.to_string())?;

        if !status.success() {
            return Err(format!("Failed to move file to trash: {}", file_path));
        }

        Ok(())
    }

    #[cfg(target_os = "linux")]
    #[tauri::command]
    pub fn move_to_recycle_bin(file_path: &str) -> Result<(), String> {
        if !Path::new(file_path).exists() {
            return Err(format!("File not found: {}", file_path));
        }

        let status = Command::new("gio")
            .arg("trash")
            .arg(file_path)
            .status()
            .map_err(|e| e.to_string())?;

        if !status.success() {
            return Err(format!("Failed to move file to trash: {}", file_path));
        }

        Ok(())
    }

    #[tauri::command]
    pub async fn delete_file(file_path: &str) -> Result<(), String> {
        if !Path::new(file_path).exists() {
            return Err(format!("File not found: {}", file_path));
        }

        fs::remove_file(file_path).map_err(|e| format!("Failed to delete file: {} ({})", file_path, e))?;
        Ok(())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use commands::*;
    
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            calculate_file_hash,
            move_to_recycle_bin,
            delete_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
