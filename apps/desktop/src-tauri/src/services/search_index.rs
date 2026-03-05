use std::collections::HashMap;
use std::fs;
use std::path::Path;

use walkdir::WalkDir;

use super::frontmatter;
use super::search_engine::{extract_snippet, SearchResult};

/// 索引条目：缓存每个 .md 文件的元数据和文本内容
#[derive(Debug, Clone)]
pub struct IndexEntry {
    pub title: String,
    /// 小写正文，用于大小写不敏感匹配
    pub body_lower: String,
    /// 原始正文，用于提取 snippet
    pub body: String,
    pub tags: Vec<String>,
    pub updated_at: String,
}

/// 内存搜索索引：以文件路径为键
#[derive(Debug, Default)]
pub struct SearchIndex {
    entries: HashMap<String, IndexEntry>,
}

impl SearchIndex {
    /// 扫描 folder_path 下的所有 .md 文件，构建索引
    pub fn build(folder_path: &str) -> Self {
        let mut index = Self::default();
        for entry in WalkDir::new(folder_path)
            .follow_links(false)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let path = entry.path();
            if entry
                .file_name()
                .to_str()
                .map(|s| s.starts_with('.'))
                .unwrap_or(false)
                && path != Path::new(folder_path)
            {
                continue;
            }
            if path.extension().and_then(|e| e.to_str()) != Some("md") {
                continue;
            }
            index.upsert(path);
        }
        index
    }

    /// 插入或更新一个文件的索引条目
    pub fn upsert(&mut self, path: &Path) {
        let raw = match fs::read_to_string(path) {
            Ok(s) => s,
            Err(_) => return,
        };
        let (fm, body) = frontmatter::parse(&raw);

        let stem = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Untitled");
        let title = fm
            .title
            .clone()
            .filter(|t| !t.is_empty())
            .unwrap_or_else(|| frontmatter::title_from_filename(stem));

        let updated_at = fs::metadata(path)
            .ok()
            .and_then(|m| m.modified().ok())
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .and_then(|d| chrono::DateTime::from_timestamp(d.as_secs() as i64, 0))
            .map(|dt| dt.format("%Y-%m-%dT%H:%M:%SZ").to_string())
            .unwrap_or_default();

        let body_lower = body.to_lowercase();
        self.entries.insert(
            path.to_string_lossy().to_string(),
            IndexEntry {
                title,
                body_lower,
                body,
                tags: fm.tags,
                updated_at,
            },
        );
    }

    /// 删除一个文件的索引条目
    pub fn remove(&mut self, path: &str) {
        self.entries.remove(path);
    }

    /// 在索引中搜索（大小写不敏感），返回匹配结果
    pub fn search(&self, query: &str) -> Vec<SearchResult> {
        if query.trim().is_empty() {
            return vec![];
        }
        let query_lower = query.to_lowercase();
        let mut results = Vec::new();

        for (path, entry) in &self.entries {
            let title_lower = entry.title.to_lowercase();
            if !title_lower.contains(&query_lower) && !entry.body_lower.contains(&query_lower) {
                continue;
            }

            let snippet = extract_snippet(&entry.body, &query_lower);

            results.push(SearchResult {
                path: path.clone(),
                title: entry.title.clone(),
                snippet,
                tags: entry.tags.clone(),
                updated_at: entry.updated_at.clone(),
            });
        }

        // 按标题命中优先排序
        results.sort_by(|a, b| {
            let a_title = a.title.to_lowercase().contains(&query_lower);
            let b_title = b.title.to_lowercase().contains(&query_lower);
            b_title.cmp(&a_title)
        });

        results
    }
}
