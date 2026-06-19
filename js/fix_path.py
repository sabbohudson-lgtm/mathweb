with open(r'E:\LaTeXVScode\网页题库\js\app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update setKnowledgeFilter to reset page
old_setkf = '''function setKnowledgeFilter(knowledge) {
    state.filters.knowledge = knowledge;
    document.querySelectorAll(".knowledge-item").forEach(function(el) {
        el.classList.toggle("active", el.dataset.knowledge === knowledge);
    });
    applyFiltersAndRender();
}'''

new_setkf = '''function setKnowledgeFilter(knowledge) {
    state.filters.knowledge = knowledge;
    state.currentPage = 1;
    document.querySelectorAll(".knowledge-item").forEach(function(el) {
        el.classList.toggle("active", el.dataset.knowledge === knowledge);
    });
    applyFiltersAndRender();
}

// Build knowledge path map from DOM knowledge panel
function buildKnowledgePathMap() {
    var panel = document.getElementById("knowledgeList");
    if (!panel) return;
    var categories = panel.querySelectorAll(".knowledge-category");
    categories.forEach(function(category) {
        var categoryName = category.querySelector(".category-title") && category.querySelector(".category-title").getAttribute("data-toggle");
        if (!categoryName) return;
        var catUl = category.querySelector("ul.category-items");
        if (!catUl) return;
        var l2Folders = catUl.querySelectorAll(":scope > li.knowledge-folder");
        l2Folders.forEach(function(l2Li) {
            var l2Name = l2Li.getAttribute("data-knowledge");
            var l2ToggleId = l2Li.getAttribute("data-toggle");
            var l2Ul = l2ToggleId ? document.getElementById(l2ToggleId) : null;
            if (!l2Ul || !l2Name) return;
            var l3Folders = l2Ul.querySelectorAll(":scope > li.knowledge-folder");
            l3Folders.forEach(function(l3Li) {
                var l3Name = l3Li.getAttribute("data-knowledge");
                var l3ToggleId = l3Li.getAttribute("data-toggle");
                var l3Ul = l3ToggleId ? document.getElementById(l3ToggleId) : null;
                if (!l3Name) return;
                if (l3Ul) {
                    var l4Items = l3Ul.querySelectorAll(":scope > li.knowledge-item");
                    l4Items.forEach(function(l4Li) {
                        var l4Name = l4Li.getAttribute("data-knowledge");
                        if (l4Name) {
                            knowledgePathMap[l4Name] = categoryName + " - " + l2Name + " - " + l3Name + " - " + l4Name;
                        }
                    });
                }
                if (!l3Ul) {
                    knowledgePathMap[l3Name] = categoryName + " - " + l2Name + " - " + l3Name;
                }
            });
            var l3Leaves = l2Ul.querySelectorAll(":scope > li.knowledge-item:not(.knowledge-folder)");
            l3Leaves.forEach(function(leaf) {
                var name = leaf.getAttribute("data-knowledge");
                if (name && !knowledgePathMap[name]) {
                    knowledgePathMap[name] = categoryName + " - " + l2Name + " - " + name;
                }
            });
        });
    });
}

function getKnowledgePath(knowledgeName) {
    if (!knowledgeName) return knowledgeName || "";
    if (knowledgePathMap[knowledgeName]) return knowledgePathMap[knowledgeName];
    return knowledgeName;
}'''

content = content.replace(old_setkf, new_setkf)

# 2. Add buildKnowledgePathMap call in DOMContentLoaded before applyFiltersAndRender
old_init_end = '''    applyFiltersAndRender();
});'''
new_init_end = '''    applyFiltersAndRender();

    // Build knowledge path map from DOM
    buildKnowledgePathMap();
});'''
content = content.replace(old_init_end, new_init_end)

with open(r'E:\LaTeXVScode\网页题库\js\app.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Path builder functions added!')
