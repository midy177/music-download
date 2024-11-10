use std::path::Path;

#[tauri::command]
fn file_exists(value: &str) -> Result<String, String>{
    if Path::new(&value).exists() {
        Err(String::from("文件已经存在")) // 确保返回 String 类型
    } else {
        Ok(String::from("文件不存在")) // 确保返回 String 类型
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_upload::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![file_exists])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
