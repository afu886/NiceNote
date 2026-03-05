mod commands;
mod db;
mod services;

use std::path::PathBuf;

use notify::RecommendedWatcher;
use parking_lot::Mutex;
use rusqlite::Connection;
use tauri::Manager;

use services::search_index::SearchIndex;

// ============================================================
// 应用全局状态
// ============================================================

pub struct AppState {
    pub db: Mutex<Connection>,
    pub watcher: Mutex<Option<RecommendedWatcher>>,
    pub search_index: Mutex<SearchIndex>,
}

// ============================================================
// 应用入口
// ============================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // 确定数据库路径：{app_data_dir}/cache.db
            let db_path = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| PathBuf::from("."))
                .join("cache.db");

            std::fs::create_dir_all(db_path.parent().unwrap()).ok();

            let conn = db::open(db_path.to_str().unwrap())
                .expect("初始化 SQLite 缓存数据库失败");

            app.manage(AppState {
                db: Mutex::new(conn),
                watcher: Mutex::new(None),
                search_index: Mutex::new(SearchIndex::default()),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // 目录管理
            commands::folder::open_folder_dialog,
            commands::folder::reveal_in_explorer,
            // 笔记操作
            commands::note::list_notes,
            commands::note::get_note_content,
            commands::note::save_note,
            commands::note::create_note,
            commands::note::rename_note,
            commands::note::delete_note,
            commands::note::get_folder_tree,
            // 搜索
            commands::search::search_notes,
            // 文件监听
            commands::watcher::watch_folder,
            // 缓存 / 设置
            commands::cache::get_recent_folders,
            commands::cache::add_recent_folder,
            commands::cache::get_settings,
            commands::cache::save_settings,
            commands::cache::get_tag_colors,
            commands::cache::set_tag_color,
            commands::cache::get_favorites,
            commands::cache::toggle_favorite,
        ])
        .run(tauri::generate_context!())
        .expect("启动 Tauri 应用失败");
}
