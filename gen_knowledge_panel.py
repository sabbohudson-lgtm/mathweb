import json

tree = json.load(open(r'E:\LaTeXVScode\网页题库\tree_data.json', encoding='utf-8'))

icons = {
    '集合与常用逻辑用语': '📦',
    '导数与函数': '📈',
    '等式与不等式': '⚖️',
    '数列': '🔢',
    '三角函数与解三角形': '📐',
    '平面向量': '➡️',
    '复数': '🌀',
    '圆锥曲线': '〰️',
    '直线与圆': '⭕',
    '空间向量与立体几何': '🧊',
    '计数原理与概率统计': '📊',
}

def escape_html(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

lines = []
lines.append('            <div class="knowledge-list" id="knowledgeList">')

for cat_name in sorted(tree.keys()):
    icon = icons.get(cat_name, '📌')
    lines.append('                <div class="knowledge-category">')
    lines.append('                    <h3 class="category-title" data-toggle="' + cat_name + '">' + icon + ' ' + cat_name + '</h3>')
    lines.append('                    <ul class="category-items" id="' + cat_name + '">')
    
    subs = tree[cat_name]
    for l2_name, l3_list in subs.items():
        l2_id = 'l2_' + l2_name.replace(' ', '_')
        lines.append('                        <li class="knowledge-item knowledge-folder" data-knowledge="' + l2_name + '" data-toggle="' + l2_id + '">')
        lines.append('                            <span class="folder-icon">▶</span> ' + escape_html(l2_name))
        lines.append('                        </li>')
        lines.append('                        <ul class="sub-items hidden" id="' + l2_id + '">')
        
        for l3 in l3_list:
            if l3['name'] is None:
                continue
            l3_id = 'l3_' + l3['name'].replace(' ', '_')
            has_children = len(l3['children']) > 0
            
            if has_children:
                lines.append('                            <li class="knowledge-item knowledge-folder" data-knowledge="' + l3['name'] + '" data-toggle="' + l3_id + '">')
                lines.append('                                <span class="folder-icon">▶</span> ' + escape_html(l3['name']))
                lines.append('                            </li>')
                lines.append('                            <ul class="sub-items hidden" id="' + l3_id + '">')
                
                for l4 in l3['children']:
                    lines.append('                                <li class="knowledge-item" data-knowledge="' + l4['name'] + '">' + escape_html(l4['name']) + '</li>')
                
                lines.append('                            </ul>')
            else:
                lines.append('                            <li class="knowledge-item" data-knowledge="' + l3['name'] + '">' + escape_html(l3['name']) + '</li>')
        
        lines.append('                        </ul>')
    
    lines.append('                    </ul>')
    lines.append('                </div>')

lines.append('            </div>')

result = '\n'.join(lines)
with open(r'E:\LaTeXVScode\网页题库\knowledge_panel_new.html', 'w', encoding='utf-8') as f:
    f.write(result)
print('Generated ' + str(len(lines)) + ' lines')
