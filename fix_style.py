css_path = r'E:\LaTeXVScode\网页题库\css\style.css'
with open(css_path, 'r', encoding='utf-8-sig') as f:
    content = f.read()

# Find and replace the filter-bar CSS block
old_start = content.find('.filter-bar {')
old_end = content.find('.btn-add-to-bank {', old_start)

if old_start != -1 and old_end != -1:
    old_block = content[old_start:old_end]
    
    new_block = '''
.filter-bar {
    background: #fff;
    border-bottom: 1px solid #ebeef5;
    padding: 0;
}
.filter-bar-row {
    display: flex;
    align-items: center;
    padding: 8px 16px;
    font-size: 13px;
    border-bottom: 1px solid #f0f0f0;
}
.filter-bar-row:last-child {
    border-bottom: none;
}
.filter-bar-label {
    color: #606266;
    white-space: nowrap;
    margin-right: 12px;
    font-weight: 600;
    font-size: 12px;
    min-width: 40px;
    flex-shrink: 0;
}
.filter-bar-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    flex: 1;
}
.filter-tag {
    display: inline-block;
    padding: 3px 12px;
    border-radius: 4px;
    border: 1px solid #dcdfe6;
    background: #fff;
    color: #606266;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
    user-select: none;
}
.filter-tag:hover {
    background: #f5f7fa;
    color: #409eff;
    border-color: #c6e2ff;
}
.filter-tag.active {
    background: #ecf5ff;
    border-color: #409eff;
    color: #409eff;
    font-weight: 500;
}
.filter-tag .tag-count {
    font-size: 11px;
    opacity: 0.6;
    margin-left: 2px;
}

'''
    content = content[:old_start] + new_block + content[old_end:]
    
    with open(css_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Done')
else:
    print('Could not find boundaries')