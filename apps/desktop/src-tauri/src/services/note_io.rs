use std::fs;
use std::path::{Path, PathBuf};

use anyhow::{Context, Result};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use walkdir::WalkDir;

use super::frontmatter::{self, Frontmatter};
use super::utils::{
    format_modified_time, is_hidden_entry, is_markdown_file, validate_folder_path,
    validate_note_path,
};

// ============================================================
// 对外暴露的数据类型（与前端 TS 接口一一对应）
// ============================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct NoteFile {
    /// 合成稳定标识（来自 frontmatter id；缺失时读取/保存时回填）。
    /// Desktop runtime 在 repository 边界翻译为 NoteId，path 不外泄进 app-dom。
    pub id: String,
    pub path: String,
    pub title: String,
    pub summary: String,
    pub tags: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteContent {
    #[serde(flatten)]
    pub meta: NoteFile,
    pub content: String,
    pub raw_content: String,
}

// ============================================================
// 笔记列表
// ============================================================

/// 递归列出 folder_path 下所有 .md 文件的元信息
pub fn list_notes(folder_path: &str) -> Result<Vec<NoteFile>> {
    validate_folder_path(folder_path)?;
    let mut notes = Vec::new();
    for entry in WalkDir::new(folder_path)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if is_hidden_entry(entry.file_name(), path, Path::new(folder_path)) {
            continue;
        }
        if is_markdown_file(path) {
            if let Ok(meta) = read_meta(path) {
                notes.push(meta);
            }
        }
    }
    Ok(notes)
}

// ============================================================
// 读取单个笔记
// ============================================================

/// 确保 frontmatter 含稳定 id；缺失时生成 UUID 并回写文件（读取/保存时回填）。
/// 返回 true 表示发生了回填（文件已被改写），用于让调用方刷新 raw_content。
fn ensure_frontmatter_id(path: &Path, fm: &mut Frontmatter, body: &str) -> Result<bool> {
    if !fm.id.as_deref().unwrap_or("").is_empty() {
        return Ok(false);
    }
    fm.id = Some(Uuid::new_v4().to_string());
    let new_raw = frontmatter::write(fm, body);
    atomic_write(path, &new_raw)?;
    Ok(true)
}

/// 读取笔记元信息（不含正文）。无 id 的旧笔记在此回填并写回。
fn read_meta(path: &Path) -> Result<NoteFile> {
    let raw = fs::read_to_string(path)?;
    let (mut fm, body) = frontmatter::parse(&raw);
    ensure_frontmatter_id(path, &mut fm, &body)?;
    build_note_file(path, &fm, &body)
}

/// 读取笔记完整内容（含正文和 frontmatter）
pub fn get_note_content(path: &str) -> Result<NoteContent> {
    validate_note_path(path)?;
    let p = Path::new(path);
    let raw = fs::read_to_string(p).context("读取笔记文件失败")?;
    let (mut fm, body) = frontmatter::parse(&raw);
    let backfilled = ensure_frontmatter_id(p, &mut fm, &body)?;
    let meta = build_note_file(p, &fm, &body)?;
    let raw_content = if backfilled {
        frontmatter::write(&fm, &body)
    } else {
        raw
    };
    Ok(NoteContent {
        meta,
        content: body,
        raw_content,
    })
}

fn build_note_file(path: &Path, fm: &Frontmatter, body: &str) -> Result<NoteFile> {
    let title = frontmatter::resolve_title_from_path(fm, path);

    // 摘要：取正文前 120 字符（去掉 Markdown 标记符）
    let summary_raw = body
        .lines()
        .find(|l| !l.trim().is_empty() && !l.trim_start().starts_with('#'))
        .unwrap_or("")
        .trim()
        .trim_start_matches(|c: char| !c.is_alphanumeric() && !c.is_whitespace());
    let summary: String = summary_raw.chars().take(120).collect();

    let updated_at = format_modified_time(path);

    let created_at = fm.created_at.clone().unwrap_or_else(|| updated_at.clone());

    Ok(NoteFile {
        id: fm.id.clone().unwrap_or_default(),
        path: path.to_string_lossy().to_string(),
        title,
        summary,
        tags: fm.tags.clone(),
        created_at,
        updated_at,
    })
}

// ============================================================
// 保存笔记（原子写入）
// ============================================================

/// 保存笔记正文和标签（保留原有 frontmatter 中的 title/created_at）
pub fn save_note(path: &str, content: &str, tags: &[String]) -> Result<()> {
    validate_note_path(path)?;
    let p = Path::new(path);
    let raw = fs::read_to_string(p).context("保存前读取原文件失败")?;
    let (mut fm, _) = frontmatter::parse(&raw);
    if fm.id.as_deref().unwrap_or("").is_empty() {
        fm.id = Some(Uuid::new_v4().to_string());
    }
    fm.tags = tags.to_vec();

    let new_raw = frontmatter::write(&fm, content);
    atomic_write(p, &new_raw)
}

// ============================================================
// 创建笔记
// ============================================================

pub fn create_note(folder_path: &str) -> Result<NoteFile> {
    validate_folder_path(folder_path)?;
    let folder = Path::new(folder_path);
    fs::create_dir_all(folder)?;

    // 生成唯一文件名：Untitled, Untitled 2, Untitled 3 ...
    let path = find_unique_path(folder, "Untitled", "md");

    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let stem = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Untitled");
    let fm = Frontmatter {
        id: Some(Uuid::new_v4().to_string()),
        title: Some(stem.to_string()),
        created_at: Some(now),
        ..Default::default()
    };
    let raw = frontmatter::write(&fm, "");
    atomic_write(&path, &raw)?;
    read_meta(&path)
}

// ============================================================
// 重命名笔记
// ============================================================

pub fn rename_note(old_path: &str, new_title: &str) -> Result<NoteFile> {
    validate_note_path(old_path)?;
    let old = Path::new(old_path);
    let parent = old.parent().context("无法获取父目录")?;

    // 清理标题为合法文件名（替换 / \ : * ? " < > |）
    let safe_name = sanitize_filename(new_title);
    let new_path = find_unique_path(parent, &safe_name, "md");

    // 先更新 frontmatter 中的 title
    let raw = fs::read_to_string(old).context("重命名前读取原文件失败")?;
    let (mut fm, body) = frontmatter::parse(&raw);
    // id 跨改名必须保持不变（这正是 NoteId 跨 path 变化稳定的来源）；缺失才回填
    if fm.id.as_deref().unwrap_or("").is_empty() {
        fm.id = Some(Uuid::new_v4().to_string());
    }
    fm.title = Some(new_title.to_string());
    let new_raw = frontmatter::write(&fm, &body);

    // 写入新文件路径，删除旧文件
    atomic_write(&new_path, &new_raw)?;
    if old != new_path {
        fs::remove_file(old).context("重命名后删除原文件失败")?;
    }

    read_meta(&new_path)
}

// ============================================================
// 删除笔记（移入 .trash）
// ============================================================

pub fn delete_note(path: &str) -> Result<()> {
    validate_note_path(path)?;
    let p = Path::new(path);
    let parent = p.parent().context("无法获取父目录")?;
    let trash_dir = parent.join(".trash");
    fs::create_dir_all(&trash_dir)?;

    let file_name = p
        .file_name()
        .context("无法获取文件名")?
        .to_string_lossy()
        .to_string();
    let dest = find_unique_path(&trash_dir, &file_name.trim_end_matches(".md"), "md");
    fs::rename(p, dest)?;
    Ok(())
}

// ============================================================
// 工具函数
// ============================================================

/// 原子写入：先写临时文件，再 rename，保证不丢数据
fn atomic_write(path: &Path, content: &str) -> Result<()> {
    let tmp = path.with_extension("tmp");
    fs::write(&tmp, content)?;
    if let Err(e) = fs::rename(&tmp, path) {
        // rename 失败时清理临时文件，避免磁盘残留
        let _ = fs::remove_file(&tmp);
        return Err(e.into());
    }
    Ok(())
}

/// 在 dir 中寻找不冲突的文件名：name.ext → name 2.ext → name 3.ext
fn find_unique_path(dir: &Path, name: &str, ext: &str) -> PathBuf {
    use std::collections::HashSet;

    let candidate = dir.join(format!("{}.{}", name, ext));
    if !candidate.exists() {
        return candidate;
    }

    // 读取目录一次，在内存中查找空位，避免逐个 exists() 系统调用
    let existing: HashSet<String> = fs::read_dir(dir)
        .into_iter()
        .flatten()
        .filter_map(|e| e.ok())
        .filter_map(|e| e.file_name().into_string().ok())
        .collect();

    for i in 2..=10000 {
        let filename = format!("{} {}.{}", name, i, ext);
        if !existing.contains(&filename) {
            return dir.join(filename);
        }
    }
    // 极端情况下使用时间戳确保唯一性
    dir.join(format!(
        "{} {}.{}",
        name,
        Utc::now().timestamp_millis(),
        ext
    ))
}

/// 替换文件名中的非法字符（含控制字符和 null 字节）
fn sanitize_filename(name: &str) -> String {
    // 跳过首尾空白字符，单次遍历完成过滤+替换，避免多余分配
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return "Untitled".to_string();
    }
    let sanitized: String = trimmed
        .chars()
        .filter(|c| !c.is_control())
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '-',
            _ => c,
        })
        .collect();
    if sanitized.is_empty() {
        "Untitled".to_string()
    } else {
        sanitized
    }
}

// ============================================================
// 目录树
// ============================================================

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderNode {
    pub path: String,
    pub name: String,
    pub note_count: usize,
    pub children: Vec<FolderNode>,
}

/// 递归构建目录树（只保留含 .md 文件的目录）
pub fn get_folder_tree(root: &str) -> Result<FolderNode> {
    validate_folder_path(root)?;
    build_tree(Path::new(root))
}

fn build_tree(dir: &Path) -> Result<FolderNode> {
    let name = dir
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();

    let mut note_count = 0;
    let mut children = Vec::new();

    if let Ok(entries) = fs::read_dir(dir) {
        let mut dirs: Vec<PathBuf> = Vec::new();
        for entry in entries.flatten() {
            let fname = entry.file_name();
            let fname_str = fname.to_string_lossy();
            // 跳过隐藏目录
            if fname_str.starts_with('.') {
                continue;
            }
            // 使用 DirEntry::file_type() 复用缓存元数据，避免额外 stat() 系统调用
            let Ok(file_type) = entry.file_type() else { continue };
            let path = entry.path();
            if file_type.is_dir() {
                dirs.push(path);
            } else if is_markdown_file(&path) {
                note_count += 1;
            }
        }
        dirs.sort();
        for d in dirs {
            if let Ok(child) = build_tree(&d) {
                if child.note_count > 0 || !child.children.is_empty() {
                    note_count += child.note_count;
                    children.push(child);
                }
            }
        }
    }

    Ok(FolderNode {
        path: dir.to_string_lossy().to_string(),
        name,
        note_count,
        children,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_md(name: &str, contents: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "nicenote-noteio-test-{}",
            Uuid::new_v4()
        ));
        fs::create_dir_all(&dir).unwrap();
        let p = dir.join(name);
        fs::write(&p, contents).unwrap();
        p
    }

    #[test]
    fn test_read_meta_backfills_stable_id() {
        // 旧笔记无 id：读取应回填，写回磁盘，且二次读取 id 不变
        let p = temp_md("Old Note.md", "---\ntitle: Old\n---\n\n正文");
        let first = read_meta(&p).unwrap();
        assert!(!first.id.is_empty(), "应回填非空 id");

        let on_disk = fs::read_to_string(&p).unwrap();
        assert!(on_disk.contains(&format!("id: {}", first.id)), "id 应写回文件");

        let second = read_meta(&p).unwrap();
        assert_eq!(first.id, second.id, "二次读取 id 必须稳定");
    }

    #[test]
    fn test_rename_preserves_id() {
        let p = temp_md(
            "A.md",
            "---\nid: fixed-id-123\ntitle: A\n---\n\n正文",
        );
        let renamed = rename_note(p.to_str().unwrap(), "B").unwrap();
        assert_eq!(renamed.id, "fixed-id-123", "改名后 id 必须不变");
    }

    #[test]
    fn test_save_preserves_unknown_frontmatter() {
        let p = temp_md(
            "C.md",
            "---\nid: c-1\ntitle: C\nauthor: afu\n---\n\nbody",
        );
        save_note(p.to_str().unwrap(), "new body", &["tag1".to_string()]).unwrap();
        let raw = fs::read_to_string(&p).unwrap();
        assert!(raw.contains("id: c-1"));
        assert!(raw.contains("author: afu"), "未知字段必须保留");
        assert!(raw.contains("new body"));
    }
}
