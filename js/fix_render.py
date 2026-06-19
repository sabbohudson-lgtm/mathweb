import re

with open(r'E:\LaTeXVScode\网页题库\js\app.js', 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = 'function renderQuestionCards(questions) {'
end_marker = 'function updateQuestionCount(count) {'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

print(f'start={start_idx}, end={end_idx}')

if start_idx >= 0 and end_idx > start_idx:
    new_func = '''function renderQuestionCards(questions) {
    var container = document.getElementById('questionCards');
    if (!container) return;

    if (questions.length === 0) {
        container.innerHTML = '<div class=\"empty-state\"><div class=\"empty-icon\">\\ud83d\\udd0d</div><p>\\u6ca1\\u6709\\u627e\\u5230\\u5339\\u914d\\u7684\\u9898\\u76ee</p></div>';
        updateQuestionCount(0);
        renderPagination(0);
        return;
    }

    var total = questions.length;
    var totalPages = Math.ceil(total / state.pageSize);
    if (state.currentPage > totalPages) state.currentPage = totalPages;
    if (state.currentPage < 1) state.currentPage = 1;

    var start = (state.currentPage - 1) * state.pageSize;
    var end = Math.min(start + state.pageSize, total);
    var pageQuestions = questions.slice(start, end);

    var html = '';
    pageQuestions.forEach(function(q) {
        var diffClass = getDifficultyClass(q.difficulty);
        var diffText = getDifficultyText(q.difficulty);
        var isExpanded = state.expandedSolutions.has(q.id);
        var solutionDisplay = isExpanded ? 'show' : '';
        var solutionArrow = isExpanded ? '\\u25bc' : '\\u25b6';

        var optionsHtml = '';
        if (q.options && q.options.length > 0) {
            optionsHtml = '<ul class=\"options-list\">';
            q.options.forEach(function(opt) {
                var isCorrect = opt.label === q.answer;
                var style = isCorrect ? 'style=\"background:#f0f9eb;border-color:#e1f3d8;\"' : '';
                optionsHtml += '<li ' + style + '><span class=\"option-label\">' + esc(opt.label) + '</span>' + esc(opt.text) + '</li>';
            });
            optionsHtml += '</ul>';
        }

        var answerHtml = '';
        if (q.answer) {
            answerHtml = '<p><strong>\\u7b54\\u6848\\uff1a</strong><span style=\"color:#67c23a;font-weight:600;\">' + esc(q.answer) + '</span></p>';
        }

        var solutionHtml = '';
        if (q.solution) {
            solutionHtml = '<div class=\"solution-toggle\" onclick=\"toggleSolution(' + q.id + ')\"><span>' + solutionArrow + '</span> <span>\\u67e5\\u770b\\u8be6\\u7ec6\\u89e3\\u6790</span></div>';
            solutionHtml += '<div class=\"solution-content ' + solutionDisplay + '\"><br>' + esc(q.solution).replace(/\\n/g, '<br>') + '</div>';
        }

        var fullPath = getKnowledgePath(q.knowledge);

        html += '<div class=\"question-card\" data-id=\"' + q.id + '\">';
        html += '<div class=\"card-header\"><div class=\"card-tags\">';
        html += '<span class=\"tag tag-grade\">' + esc(q.grade) + '</span>';
        html += '<span class=\"tag tag-difficulty ' + diffClass + '\">' + diffText + '</span>';
        html += '<span class=\"tag tag-type\">' + esc(q.type) + '</span>';
        html += '<span class=\"tag tag-knowledge\" title=\"' + esc(fullPath) + '\">' + esc(fullPath) + '</span>';
        html += '</div><div class=\"card-meta\"><span>\\ud83d\\udcc5 ' + esc(q.year || '') + '</span></div></div>';
        html += '<div class=\"card-body\"><div class=\"question-text\">' + esc(q.question) + '</div>';
        html += optionsHtml + answerHtml;
        html += '<div class=\"solution-section\">' + solutionHtml + '</div></div></div>';
    });

    // Pagination info
    html += '<div class=\"pagination-info\">\\u7b2c ' + state.currentPage + ' / ' + totalPages + ' \\u9875\\uff0c\\u5171 ' + total + '\\u9898</div>';

    container.innerHTML = html;
    updateQuestionCount(total);
    renderPagination(totalPages);
    typesetMath(container);
}

function renderPagination(totalPages) {
    var nav = document.getElementById('paginationNav');
    if (!nav) return;
    if (totalPages <= 1) {
        nav.style.display = 'none';
        return;
    }
    nav.style.display = 'flex';

    var html = '<button class=\"page-btn' + (state.currentPage === 1 ? ' disabled' : '') + '\" onclick=\"goToPage(1)\"' + (state.currentPage === 1 ? ' disabled' : '') + '>\\u9996\\u9875</button>';
    html += '<button class=\"page-btn' + (state.currentPage === 1 ? ' disabled' : '') + '\" onclick=\"goToPage(' + (state.currentPage - 1) + ')\"' + (state.currentPage === 1 ? ' disabled' : '') + '>\\u4e0a\\u9875</button>';

    var pages = [];
    pages.push(1);
    if (state.currentPage - 2 > 1) pages.push('...');
    for (var p = Math.max(2, state.currentPage - 1); p <= Math.min(totalPages - 1, state.currentPage + 1); p++) {
        pages.push(p);
    }
    if (state.currentPage + 2 < totalPages) pages.push('...');
    if (totalPages > 1) pages.push(totalPages);

    var seen = {};
    pages.forEach(function(p) {
        if (seen[p] !== undefined) return;
        seen[p] = true;
        if (p === '...') {
            html += '<span class=\"page-ellipsis\">...</span>';
        } else {
            html += '<button class=\"page-btn' + (p === state.currentPage ? ' active' : '') + '\" onclick=\"goToPage(' + p + ')\">' + p + '</button>';
        }
    });

    html += '<button class=\"page-btn' + (state.currentPage === totalPages ? ' disabled' : '') + '\" onclick=\"goToPage(' + (state.currentPage + 1) + ')\"' + (state.currentPage === totalPages ? ' disabled' : '') + '>\\u4e0b\\u9875</button>';
    html += '<button class=\"page-btn' + (state.currentPage === totalPages ? ' disabled' : '') + '\" onclick=\"goToPage(' + totalPages + ')\"' + (state.currentPage === totalPages ? ' disabled' : '') + '>\\u5c3e\\u9875</button>';

    nav.innerHTML = html;
}

function goToPage(page) {
    var filtered = getFilteredQuestions();
    var totalPages = Math.ceil(filtered.length / state.pageSize);
    if (page < 1 || page > totalPages) return;
    state.currentPage = page;
    applyFiltersAndRender();
}
'''
    content = content[:start_idx] + new_func + '\n\n' + content[end_idx:]
    with open(r'E:\LaTeXVScode\网页题库\js\app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Done!')
else:
    print('Markers not found!')
