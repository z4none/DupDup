// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod commands {
    use sha2::{Digest, Sha256};
    use std::fs::File;
    use std::io::Read;
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use std::path::Path;
    use windows::{core::PCWSTR, Win32::Foundation::*, Win32::System::Com::*, Win32::UI::Shell::*};

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

    #[tauri::command]
    pub fn move_to_recycle_bin(file_path: &str) -> Result<(), String> {
        // 检查文件是否存在
        if !Path::new(file_path).exists() {
            return Err(format!("File not found: {}", file_path));
        }

        // 将文件路径转换为宽字符串，添加双空字符结尾
        let wide_path: Vec<u16> = OsStr::new(file_path)
            .encode_wide()
            .chain(std::iter::once(0))
            .chain(std::iter::once(0))  // 添加第二个空字符
            .collect();

        unsafe {
            // 初始化 COM
            let _com = CoInitializeEx(None, COINIT_APARTMENTTHREADED).map_err(|e| e.to_string())?;

            // 准备 SHFILEOPSTRUCTW 结构
            let mut file_op = SHFILEOPSTRUCTW {
                hwnd: HWND(0),
                wFunc: FO_DELETE,
                pFrom: PCWSTR(wide_path.as_ptr()),
                pTo: PCWSTR::null(),
                fFlags: (FOF_ALLOWUNDO | FOF_NOCONFIRMATION | FOF_NOERRORUI | FOF_SILENT) as u16,
                fAnyOperationsAborted: BOOL(0),
                hNameMappings: std::ptr::null_mut(),
                lpszProgressTitle: PCWSTR::null(),
            };

            // 执行文件操作
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
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use commands::*;
    
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![greet, calculate_file_hash, move_to_recycle_bin])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
