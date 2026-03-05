use std::fs;
use std::path::Path;

use anyhow::Result;
use serde::{Deserialize, Serialize};
use walkdir::WalkDir;

use super::frontmatter;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub path: String,
    pub title: String,
    pub snippet: String,
    pub tags: Vec<String>,
    pub updated_at: String,
}

/// 在 folder_path 内全文搜索（标题 + 正文，大小写不敏感）
pub fn search_notes(folder_path: &str, query: &str) -> Result<Vec<SearchResult>> {
    if query.trim().is_empty() {
        return Ok(vec![]);
    }
    let query_lower = query.to_lowercase();
    let mut results = Vec::new();

    for entry in WalkDir::new(folder_path)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        // 跳过隐藏目录
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

        let raw = match fs::read_to_string(path) {
            Ok(s) => s,
            Err(_) => continue,
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

        let title_lower = title.to_lowercase();
        let body_lower = body.to_lowercase();

        if !title_lower.contains(&query_lower) && !body_lower.contains(&query_lower) {
            continue;
        }

        // 提取命中上下文片段（前后各 60 字符）
        let snippet = extract_snippet(&body, &query_lower);

        let updated_at = fs::metadata(path)
            .ok()
            .and_then(|m| m.modified().ok())
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .and_then(|d| chrono::DateTime::from_timestamp(d.as_secs() as i64, 0))
            .map(|dt| dt.format("%Y-%m-%dT%H:%M:%SZ").to_string())
            .unwrap_or_default();

        results.push(SearchResult {
            path: path.to_string_lossy().to_string(),
            title,
            snippet,
            tags: fm.tags,
            updated_at,
        });
    }

    // 按标题命中优先排序
    results.sort_by(|a, b| {
        let a_title = a.title.to_lowercase().contains(&query_lower);
        let b_title = b.title.to_lowercase().contains(&query_lower);
        b_title.cmp(&a_title)
    });

    Ok(results)
}

/// 从正文中提取命中关键词的上下文片段
pub fn extract_snippet(body: &str, query_lower: &str) -> String {
    let body_lower = body.to_lowercase();
    if let Some(pos) = body_lower.find(query_lower) {
        let start = pos.saturating_sub(60);
        let end = (pos + query_lower.len() + 60).min(body.len());
        // 对齐 UTF-8 字符边界（向前找有效起点，向后找有效终点）
        let start = (0..=start).rev().find(|&i| body.is_char_boundary(i)).unwrap_or(0);
        let end = (end..=body.len()).find(|&i| body.is_char_boundary(i)).unwrap_or(body.len());
        let mut s = body[start..end].trim().to_string();
        if start > 0 {
            s = format!("...{}", s);
        }
        if end < body.len() {
            s = format!("{}...", s);
        }
        s
    } else {
        // 标题命中但正文不含关键词，返回正文开头
        body.chars().take(120).collect()
    }
}
