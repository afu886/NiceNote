use std::collections::HashMap;
use std::path::Path;
use std::sync::mpsc;
use std::time::{Duration, Instant};

use notify::{EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use tauri::{AppHandle, Emitter, Manager, State};

use crate::services::search_index::SearchIndex;
use crate::AppState;

/// 事件类型（对应前端监听的 Tauri 事件名）
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
enum FileEventKind {
    Created,
    Modified,
    Deleted,
}

impl FileEventKind {
    fn event_name(&self) -> &'static str {
        match self {
            FileEventKind::Created => "file:created",
            FileEventKind::Modified => "file:modified",
            FileEventKind::Deleted => "file:deleted",
        }
    }
}

/// 启动对 folder_path 的文件系统监听，通过 Tauri 事件通知前端
/// 使用完整 notify crate 区分 Create / Modify / Remove 事件
#[tauri::command]
pub fn watch_folder(
    app: AppHandle,
    folder_path: String,
    state: State<AppState>,
) -> Result<(), String> {
    // 构建初始搜索索引
    let index = SearchIndex::build(&folder_path);
    *state.search_index.lock() = index;

    let (tx, rx) = mpsc::channel::<(FileEventKind, String)>();

    // 后台线程做 300ms 防抖，然后发出 Tauri 事件并增量更新搜索索引
    let app_clone = app.clone();
    std::thread::spawn(move || {
        let debounce_duration = Duration::from_millis(300);
        // path → (事件类型, 最后触发时间)
        let mut pending: HashMap<String, (FileEventKind, Instant)> = HashMap::new();

        loop {
            // 计算下一个超时时间
            let timeout = pending
                .values()
                .map(|(_, t)| {
                    let elapsed = t.elapsed();
                    if elapsed >= debounce_duration {
                        Duration::ZERO
                    } else {
                        debounce_duration - elapsed
                    }
                })
                .min()
                .unwrap_or(Duration::from_secs(60));

            // 尝试在超时内接收事件
            match rx.recv_timeout(timeout) {
                Ok((kind, path)) => {
                    pending.insert(path, (kind, Instant::now()));
                }
                Err(mpsc::RecvTimeoutError::Timeout) => {}
                Err(mpsc::RecvTimeoutError::Disconnected) => break,
            }

            // 发出已超过防抖时间的事件
            let now = Instant::now();
            let ready: Vec<String> = pending
                .iter()
                .filter(|(_, (_, t))| now.duration_since(*t) >= debounce_duration)
                .map(|(path, _)| path.clone())
                .collect();

            for path in ready {
                if let Some((kind, _)) = pending.remove(&path) {
                    // 增量更新搜索索引
                    let app_state = app_clone.state::<AppState>();
                    let mut idx = app_state.search_index.lock();
                    match kind {
                        FileEventKind::Created | FileEventKind::Modified => {
                            idx.upsert(Path::new(&path));
                        }
                        FileEventKind::Deleted => {
                            idx.remove(&path);
                        }
                    }
                    drop(idx);

                    // 通知前端
                    let payload = serde_json::json!({ "path": path });
                    let _ = app_clone.emit(kind.event_name(), &payload);
                }
            }
        }
    });

    // 创建 notify watcher，按 EventKind 分类发送到 channel
    let mut watcher = RecommendedWatcher::new(
        move |result: Result<notify::Event, notify::Error>| {
            let Ok(event) = result else { return };
            let kind = match event.kind {
                EventKind::Create(_) => FileEventKind::Created,
                EventKind::Modify(_) => FileEventKind::Modified,
                EventKind::Remove(_) => FileEventKind::Deleted,
                _ => return,
            };

            for path in event.paths {
                // 只处理 .md 文件
                if path.extension().and_then(|e| e.to_str()) != Some("md") {
                    continue;
                }
                // 跳过隐藏路径（.git, .trash 等）
                if path.components().any(|c| {
                    c.as_os_str()
                        .to_str()
                        .map(|s| s.starts_with('.'))
                        .unwrap_or(false)
                }) {
                    continue;
                }
                let _ = tx.send((kind, path.to_string_lossy().to_string()));
            }
        },
        notify::Config::default(),
    )
    .map_err(|e| e.to_string())?;

    watcher
        .watch(Path::new(&folder_path), RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    // 将 watcher 存入 state，替换旧的（旧的 drop 时自动停止监听）
    let mut guard = state.watcher.lock();
    *guard = Some(watcher);

    Ok(())
}
