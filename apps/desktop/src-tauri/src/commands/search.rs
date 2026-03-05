use tauri::State;

use crate::services::search_engine::{self, SearchResult};
use crate::AppState;

/// 搜索笔记：优先使用内存索引，如果索引为空则回退到文件系统扫描
#[tauri::command]
pub fn search_notes(
    folder_path: String,
    query: String,
    state: State<AppState>,
) -> Result<Vec<SearchResult>, String> {
    let index = state.search_index.lock();
    let results = index.search(&query);

    // 索引已构建（watch_folder 已调用），直接返回索引结果
    if !results.is_empty() || query.trim().is_empty() {
        return Ok(results);
    }
    drop(index);

    // 回退：索引可能尚未构建，使用文件系统扫描
    search_engine::search_notes(&folder_path, &query).map_err(|e| e.to_string())
}
