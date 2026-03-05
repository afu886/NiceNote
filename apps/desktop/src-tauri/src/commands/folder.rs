use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

#[tauri::command]
pub async fn open_folder_dialog(app: AppHandle) -> Result<String, String> {
    let (tx, rx) = std::sync::mpsc::channel();

    app.dialog()
        .file()
        .set_title("选择笔记文件夹")
        .pick_folder(move |folder| {
            let _ = tx.send(folder);
        });

    // 在异步上下文中阻塞等待，避免卡住主线程
    let folder = tauri::async_runtime::spawn_blocking(move || rx.recv())
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())?;

    match folder {
        Some(path) => Ok(path.to_string()),
        None => Err("用户取消".to_string()),
    }
}

#[tauri::command]
pub fn reveal_in_explorer(app: AppHandle, path: String) -> Result<(), String> {
    app.opener()
        .reveal_item_in_dir(&path)
        .map_err(|e| e.to_string())
}
