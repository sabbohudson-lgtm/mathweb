// ========== Global State ==========
const state = {
    currentTab: "question-bank",
    filters: { grade: "", difficulty: "", knowledge: "", type: "", year: "", region: "", examType: "", questionNum: "" },
    searchQuery: "",
    expandedSolutions: new Set(),
    currentPage: 1,
    pageSize: 10
};

// Knowledge path map: leaf knowledge name -> "大类-小类-次小类-次次小类"
const knowledgePathMap = {};
const knowledgePathReverseMap = {}; // "大类 - 小类 - 次小类 - 次次小类" -> leaf name

// Parent knowledge name -> [list of descendant leaf knowledge names]
const knowledgeDescendantsMap = {};

function lookupKnowledgeByPath(pathStr) {
    var parts = pathStr.split('-').map(function(s) { return s.trim(); });
    var normalized = parts.join(' - ');
    // First check leaf nodes
    if (knowledgePathReverseMap[normalized]) return knowledgePathReverseMap[normalized];
    // Then check category/folder names in descendants map
    if (knowledgeDescendantsMap[normalized]) return parts[parts.length - 1];
    return null;
}

function ensureKnowledgePath(pathStr) {
    var parts = pathStr.split('-').map(function(s) { return s.trim(); });
    if (parts.length < 2) {
        // Single segment: ensure the category exists
        var catTitle = document.querySelector('.category-title[data-toggle="' + parts[0] + '"]');
        if (!catTitle) {
            var panel = document.getElementById('knowledgeList');
            if (!panel) return;
            var newCatDiv = document.createElement('div');
            newCatDiv.className = 'knowledge-category';
            var newH3 = document.createElement('h3');
            newH3.className = 'category-title';
            newH3.setAttribute('data-toggle', parts[0]);
            newH3.innerHTML = '<span class="icon icon-plus" aria-hidden="true"></span> ' + parts[0];
            newCatDiv.appendChild(newH3);
            var catUl = document.createElement('ul');
            catUl.className = 'category-items';
            catUl.id = parts[0];
            newCatDiv.appendChild(catUl);
            panel.appendChild(newCatDiv);
            newH3.addEventListener('click', function() {
                this.classList.toggle('collapsed');
                var tid = this.getAttribute('data-toggle');
                var tgt = document.getElementById(tid);
                if (tgt) tgt.classList.toggle('hidden');
                if (this.dataset.toggle) setKnowledgeFilter(this.dataset.toggle);
            });
        }
        return;
    }
    var catName = parts[0];
    // Find or create category
    var catTitle = document.querySelector('.category-title[data-toggle="' + catName + '"]');
    var catUl;
    if (catTitle) {
        catUl = catTitle.nextElementSibling;
    } else {
        // Create new category at the end of knowledge panel
        var panel = document.getElementById('knowledgeList');
        if (!panel) return;
        var newCatDiv = document.createElement('div');
        newCatDiv.className = 'knowledge-category';
        var newH3 = document.createElement('h3');
        newH3.className = 'category-title';
        newH3.setAttribute('data-toggle', catName);
        newH3.innerHTML = '<span class="icon icon-plus" aria-hidden="true"></span> ' + catName;
        newCatDiv.appendChild(newH3);
        catUl = document.createElement('ul');
        catUl.className = 'category-items';
        catUl.id = catName;
        newCatDiv.appendChild(catUl);
        panel.appendChild(newCatDiv);
        // Add click handler to new category title
        newH3.addEventListener('click', function() {
            this.classList.toggle('collapsed');
            var tid = this.getAttribute('data-toggle');
            var tgt = document.getElementById(tid);
            if (tgt) tgt.classList.toggle('hidden');
            if (this.dataset.toggle) setKnowledgeFilter(this.dataset.toggle);
        });
    }
    if (!catUl) return;
    // Navigate/create deeper levels
    var currentUl = catUl;
    var fullName = catName;
    for (var i = 1; i < parts.length; i++) {
        var partName = parts[i];
        fullName += ' - ' + partName;
        var isLast = i === parts.length - 1;
        // Look for an existing knowledge-item with this name in currentUl
        var existingLi = Array.from(currentUl.querySelectorAll(':scope > li.knowledge-item')).filter(function(li) {
            return li.getAttribute('data-knowledge') === partName;
        })[0];
        if (existingLi) {
            if (isLast) {
                // Leaf already exists, done
                return;
            } else {
                // Folder exists, go to its sub-items ul
                var toggleId = existingLi.getAttribute('data-toggle');
                var nextUl = toggleId ? document.getElementById(toggleId) : null;
                if (!nextUl) {
                    // Folder exists but has no sub-ul yet, create one
                    nextUl = document.createElement('ul');
                    nextUl.className = 'sub-items hidden';
                    var generatedId = 'l3_' + partName.replace(/\s+/g, '_');
                    if (document.getElementById(generatedId)) {
                        var counter = 1;
                        while (document.getElementById(generatedId + '_' + counter)) counter++;
                        generatedId = generatedId + '_' + counter;
                    }
                    nextUl.id = generatedId;
                    existingLi.setAttribute('data-toggle', generatedId);
                    existingLi.parentNode.insertBefore(nextUl, existingLi.nextSibling);
                }
                currentUl = nextUl;
            }
        } else {
            // Not found, create it
            if (isLast) {
                // Create leaf
                var leafLi = document.createElement('li');
                leafLi.className = 'knowledge-item';
                leafLi.setAttribute('data-knowledge', partName);
                leafLi.textContent = partName;
                currentUl.appendChild(leafLi);
                // Add click handler for leaf filtering
                leafLi.addEventListener('click', function() {
                    setKnowledgeFilter(this.dataset.knowledge);
                });
                return;
            } else {
                // Create folder + sub-ul
                var folderLi = document.createElement('li');
                folderLi.className = 'knowledge-item knowledge-folder';
                folderLi.setAttribute('data-knowledge', partName);
                var folderSpan = document.createElement('span');
                folderSpan.className = 'folder-icon';
                folderSpan.innerHTML = '<span class="icon-folder-toggle"></span>';
                folderLi.appendChild(folderSpan);
                folderLi.appendChild(document.createTextNode(' ' + partName));
                currentUl.appendChild(folderLi);
                var subUl = document.createElement('ul');
                subUl.className = 'sub-items hidden';
                var levelLabel = i === 1 ? 'l2_' : 'l3_';
                var subId = levelLabel + partName.replace(/\s+/g, '_');
                if (document.getElementById(subId)) {
                    var c = 1;
                    while (document.getElementById(subId + '_' + c)) c++;
                    subId = subId + '_' + c;
                }
                subUl.id = subId;
                folderLi.setAttribute('data-toggle', subId);
                currentUl.appendChild(subUl);
                // Add click handler for folder toggle + filter
                folderLi.addEventListener('click', function(e) {
                    e.stopPropagation();
                    var toggleId = this.getAttribute('data-toggle');
                    var tgt = document.getElementById(toggleId);
                    if (!tgt) return;
                    var isHidden = tgt.classList.contains('hidden');
                    if (isHidden) {
                        tgt.classList.remove('hidden');
                        this.classList.add('expanded');
                    } else {
                        tgt.classList.add('hidden');
                        this.classList.remove('expanded');
                    }
                    if (this.dataset.knowledge) setKnowledgeFilter(this.dataset.knowledge);
                });
                currentUl = subUl;
            }
        }
    }
}

function enumerateToHtml(text) {
    var result = '';
    var i = 0;
    while (i < text.length) {
        var enumStart = text.indexOf('\\begin{enumerate}', i);
        if (enumStart === -1) { result += text.substring(i); break; }
        result += text.substring(i, enumStart);

        var depth = 1;
        var j = enumStart + '\\begin{enumerate}'.length;
        while (j < text.length && depth > 0) {
            var nb = text.indexOf('\\begin{enumerate}', j);
            var ne = text.indexOf('\\end{enumerate}', j);
            if (ne === -1) break;
            if (nb !== -1 && nb < ne) { depth++; j = nb + '\\begin{enumerate}'.length; }
            else { depth--; j = ne + '\\end{enumerate}'.length; }
        }

        var inner = text.substring(enumStart + '\\begin{enumerate}'.length, j - '\\end{enumerate}'.length);
        inner = enumerateToHtml(inner);

        var items = [];
        var itemRe = /\\item\s+/g;
        var lastIdx = 0, im;
        while ((im = itemRe.exec(inner)) !== null) {
            if (lastIdx > 0) items.push(inner.substring(lastIdx, im.index).trim());
            lastIdx = im.index + im[0].length;
        }
        if (lastIdx > 0) items.push(inner.substring(lastIdx).trim());
        if (items.length === 0) items.push(inner.trim());

        result += '<ol class="parsed-enum"><li>' + items.join('</li><li>') + '</li></ol>';
        i = j;
    }
    return result;
}

function tabularToHtml(text) {
    var re = /\\begin\{tabular\}\{([^}]*)\}([\s\S]*?)\\end\{tabular\}/g;
    return text.replace(re, function(match, colSpec, content) {
        var alignMap = { l: 'left', c: 'center', r: 'right' };
        var cols = [];
        for (var ci = 0; ci < colSpec.length; ci++) {
            if (alignMap[colSpec[ci]]) cols.push(alignMap[colSpec[ci]]);
        }
        var html = '<table class="latex-table"><tbody>';
        var rows = content.split('\\\\');
        rows.forEach(function(row, rowIdx) {
            row = row.trim();
            if (!row) return;
            row = row.replace(/^\\hline\s*|\s*\\hline$/g, '').trim();
            if (!row) return;
            var cells = row.split('&');
            html += '<tr>';
            cells.forEach(function(cell, idx) {
                var align = idx < cols.length ? cols[idx] : 'center';
                var cellTrimmed = cell.trim();
                if (rowIdx === 0) {
                    html += '<th style="text-align:' + align + ';font-weight:600;">' + cellTrimmed + '</th>';
                } else {
                    html += '<td style="text-align:' + align + ';">' + cellTrimmed + '</td>';
                }
            });
            html += '</tr>';
        });
        html += '</tbody></table>';
        return html;
    });
}

function prepareDisplayText(raw, opts) {
    // 0. Convert tabular to HTML table, protect from escapeHtml
    var tabularBlocks = [];
    var tabIdx = 0;
    raw = raw.replace(/(\\begin\{tabular\}\{[^}]*\}[\s\S]*?\\end\{tabular\})/g, function(m) {
        var html = tabularToHtml(m);
        var ph = '\x00TAB' + (tabIdx++) + '\x00';
        tabularBlocks.push(ph + '|||' + html);
        return ph;
    });

    // 1. Process tikz FIRST on raw LaTeX, protect script tags with placeholders
    var tikzBlocks = [];
    var tikzIdx = 0;
    raw = raw.replace(/(\\begin\{tikzpicture\}(?:\[[^\]]*\])?[\s\S]*?\\end\{tikzpicture\})/g, function(m) {
        var ph = '\x00TIKZ' + (tikzIdx++) + '\x00';
        tikzBlocks.push(ph + '|||' + m);
        return ph;
    });

    // 2. Now escape & process enumerate on the non-tikz/tabular text
    raw = enumerateToHtml(escapeHtml(raw));

    // 2.5 Convert newlines to <br> if requested (before restoring protected blocks)
    if (opts && opts.newlines) {
        raw = raw.replace(/\n/g, '<br>');
    }

    // 3. Restore tikz blocks as unescaped script tags
    tikzBlocks.forEach(function(entry) {
        var parts = entry.split('|||');
        var ph = parts[0], tikz = parts[1];
        raw = raw.replace(ph, '<script type="text/tikz">' + tikz + '</script>');
    });

    // 4. Restore tabular HTML (unescaped)
    tabularBlocks.forEach(function(entry) {
        var parts = entry.split('|||');
        var ph = parts[0], html = parts[1];
        raw = raw.replace(ph, html);
    });
    return raw;
}

function formatMetaDisplay(meta) {
    if (!meta) return '';
    var parts = [];
    if (meta.year || meta.region) {
        parts.push((meta.year || '') + (meta.region || ''));
    }
    if (meta.grade || meta.examType) {
        parts.push((meta.grade || '') + (meta.examType || ''));
    }
    if (meta.questionNum) {
        var qStr = meta.questionNum;
        if (meta.multiSelect) qStr += '(多选)';
        parts.push(qStr);
    }
    return parts.length > 0 ? '(' + parts.join('，') + ')' : '';
}


// ========== Utility Functions ==========

// ========== Filter Bar ==========
var allFilterValues = { type: [], year: [], region: [], grade: [], examType: [], questionNum: [] };

function buildFilterValues() {
    allFilterValues = { type: new Set(), year: new Set(), region: new Set(), grade: new Set(), examType: new Set(), questionNum: new Set() };
    for (var i = 0; i < questionBank.length; i++) {
        var q = questionBank[i];
        if (q.type) allFilterValues.type.add(q.type);
        if (q.meta && q.meta.year) allFilterValues.year.add(q.meta.year);
        if (q.meta && q.meta.region) allFilterValues.region.add(q.meta.region);
        if (q.grade) allFilterValues.grade.add(q.grade);
        if (q.meta && q.meta.examType) allFilterValues.examType.add(q.meta.examType);
        if (q.meta && q.meta.questionNum) allFilterValues.questionNum.add(q.meta.questionNum);
    }
    // Convert sets to sorted arrays
    for (var key in allFilterValues) {
        allFilterValues[key] = Array.from(allFilterValues[key]).sort();
    }
}

function countQuestionsByFilter(filterKey, filterValue) {
    var count = 0;
    var kf = state.filters.knowledge;
    var descendantLeaves = kf ? knowledgeDescendantsMap[kf] : null;
    for (var i = 0; i < questionBank.length; i++) {
        var q = questionBank[i];
        // Respect current knowledge filter (check all knowledgeList)
        if (kf) {
            var kl = q.knowledgeList && q.knowledgeList.length > 0 ? q.knowledgeList : (q.knowledge ? [q.knowledge] : []);
            var matchesK = descendantLeaves ? kl.some(function(k) { return k === kf || descendantLeaves.indexOf(k) !== -1; }) : kl.indexOf(kf) !== -1;
            if (!matchesK) continue;
        }
        var match = false;
        switch (filterKey) {
            case 'type': match = q.type === filterValue; break;
            case 'year': match = q.meta && q.meta.year === filterValue; break;
            case 'region': match = q.meta && q.meta.region === filterValue; break;
            case 'grade': match = q.grade === filterValue; break;
            case 'examType': match = q.meta && q.meta.examType === filterValue; break;
            case 'questionNum': match = q.meta && q.meta.questionNum === filterValue; break;
        }
        if (match) count++;
    }
    return count;
}

function renderFilterBar() {
    var filterDefs = [
        { key: 'type', containerId: 'typeFilters' },
        { key: 'year', containerId: 'yearFilters' },
        { key: 'region', containerId: 'regionFilters' },
        { key: 'grade', containerId: 'gradeFilters' },
        { key: 'examType', containerId: 'examTypeFilters' },
        { key: 'questionNum', containerId: 'questionNumFilters' }
    ];

    for (var f = 0; f < filterDefs.length; f++) {
        var fd = filterDefs[f];
        var container = document.getElementById(fd.containerId);
        if (!container) continue;
        var values = allFilterValues[fd.key] || [];
        var html = '';
        // "全部" option
        var allActive = state.filters[fd.key] === '' ? ' active' : '';
        html += '<span class="filter-tag' + allActive + '" data-key="' + fd.key + '" data-value="">全部</span>';
        for (var v = 0; v < values.length; v++) {
            var val = values[v];
            var isActive = state.filters[fd.key] === val ? ' active' : '';
            var cnt = countQuestionsByFilter(fd.key, val);
            var escVal = val.replace(/'/g, "\\'");
            html += '<span class="filter-tag' + isActive + '" data-key="' + fd.key + '" data-value="' + escVal + '">' + val + '<span class="tag-count">(' + cnt + ')</span></span>';
        }
        container.innerHTML = html;
    }
}

function toggleFilter(key, value) {
    // Toggle: if already active, deselect; otherwise select
    if (state.filters[key] === value) {
        state.filters[key] = '';
    } else {
        state.filters[key] = value;
    }
    state.currentPage = 1;
    renderFilterBar();
    applyFiltersAndRender();
}

// Filter toggle (expand/collapse)
function initFilterToggle() {
    var toggle = document.getElementById("filterToggle");
    var bar = document.getElementById("filterBar");
    if (!toggle || !bar) return;
    toggle.addEventListener("click", function(e) {
        if (e.target.closest(".filter-tag")) return;
        bar.classList.toggle("collapsed");
    });
}

// Event delegation for filter tags
function initFilterEvents() {
    var body = document.getElementById("filterBarBody");
    if (!body) return;
    body.addEventListener("click", function(e) {
        var tag = e.target.closest(".filter-tag");
        if (!tag) return;
        var key = tag.dataset.key;
        var value = tag.dataset.value;
        toggleFilter(key, value);
    });
}

function getDifficultyText(diff) {
    var m = { easy: "\u7b80\u5355", medium: "\u4e2d\u7b49", hard: "\u56f0\u96be" };
    return m[diff] || diff;
}
function getDifficultyClass(diff) {
    return "tag-" + diff;
}

function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

// ========== MathJax Rendering ==========
async function typesetMath(container) {
    if (window.MathJax && MathJax.typesetPromise) {
        try {
            await MathJax.typesetPromise([container]);
        } catch (e) {
            console.warn("MathJax typeset failed:", e);
        }
    }
    renderTikzInContainer(container);
}

// TikZ rendering: one temp iframe per tikz block
// Uses postMessage + MutationObserver inside iframe for reliable detection
// (TikZJax CDN only scans for script[type=text/tikz] once on window.onload)

function makeTikzDraggable(svg) {
    if (svg.dataset.tikzDrag === '1') return;
    svg.dataset.tikzDrag = '1';

    // Ensure SVG starts with relative positioning
    if (getComputedStyle(svg).position === 'static') {
        svg.style.position = 'relative';
        svg.style.left = '0px';
        svg.style.top = '0px';
    }
    // Set z-index only within the card's stacking context
    svg.style.cursor = 'grab';

    function startDrag(e) {
        if (e.button !== 0) return;
        e.preventDefault();
        var card = svg.closest('.question-card, .parsed-question-card');
        if (!card) return;

        var cs = getComputedStyle(svg);
        var origLeft = parseInt(svg.style.left, 10) || parseInt(cs.left, 10) || 0;
        var origTop = parseInt(svg.style.top, 10) || parseInt(cs.top, 10) || 0;
        var startX = e.clientX;
        var startY = e.clientY;

        // Compute natural position (where SVG sits at left:0,top:0)
        var cardRect = card.getBoundingClientRect();
        var svgRect = svg.getBoundingClientRect();
        var naturalLeft = svgRect.left - cardRect.left - origLeft;
        var naturalTop = svgRect.top - cardRect.top - origTop;
        var svgW = svgRect.width;
        var svgH = svgRect.height;

        svg.classList.add('tikz-dragging');

        function onMove(e2) {
            var dx = e2.clientX - startX;
            var dy = e2.clientY - startY;

            // Visual position relative to card
            var visualLeft = naturalLeft + origLeft + dx;
            var visualTop = naturalTop + origTop + dy;

            // Clamp to card's content area
            var cRect = card.getBoundingClientRect();
            var maxLeft = cRect.width - svgW;
            var maxTop = cRect.height - svgH;
            if (maxLeft < 0) maxLeft = 0;
            if (maxTop < 0) maxTop = 0;
            visualLeft = Math.max(0, Math.min(visualLeft, maxLeft));
            visualTop = Math.max(0, Math.min(visualTop, maxTop));

            svg.style.left = (visualLeft - naturalLeft) + 'px';
            svg.style.top = (visualTop - naturalTop) + 'px';
        }

        function onUp() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            svg.classList.remove('tikz-dragging');
        }

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    svg.addEventListener('mousedown', startDrag);
}

function renderTikzInContainer(container) {
    if (!container) return;
    container.querySelectorAll('script[type="text/tikz"]').forEach(function(script) {
        var code = script.textContent;
        var ph = document.createElement('span');
        ph.className = 'tikz-rendering';
        ph.textContent = '[TikZ渲染中...]';
        script.parentNode.replaceChild(ph, script);
        renderOneTikz(code, function(svgHtml) {
            var card = ph.closest('.parsed-question-card, .question-card');
            var svgEl = null;
            if (card) {
                var gallery = card.querySelector('.tikz-images');
                if (!gallery) {
                    gallery = document.createElement('div');
                    gallery.className = 'tikz-images';
                    card.appendChild(gallery);
                }
                gallery.insertAdjacentHTML('beforeend', svgHtml);
                svgEl = gallery.lastElementChild;
                ph.remove();
            } else {
                ph.insertAdjacentHTML('afterend', svgHtml);
                svgEl = ph.nextElementSibling;
                ph.remove();
            }
            if (svgEl && svgEl.tagName.toLowerCase() === 'svg') {
                makeTikzDraggable(svgEl);
            }
        });
    });
}

function renderOneTikz(code, callback) {
    var iframe = document.createElement('iframe');
    iframe.style.cssText = 'border:none;width:0;height:0;position:absolute;left:-9999px;';
    iframe.src = 'about:blank';
    document.body.appendChild(iframe);

    var safeCode = code.replace(/<\//g, '<\\/');
    var doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write('<!DOCTYPE html><html><head>' +
        '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@planktimerr/tikzjax@1.0.7/dist/fonts.css">' +
        '<script>' +
        // Fix document.currentScript for Chrome document.write deprecation
        'if(document.currentScript===undefined||document.currentScript===null){' +
        'var _scr=document.getElementsByTagName("script");' +
        'document.currentScript=_scr[_scr.length-1]}' +
        // Fix btoa: use ArrayBuffer.isView (cross-realm safe) instead of instanceof
        'try{' +
        'var _ob=window.btoa;' +
        'window.btoa=function(s){' +
        'if(s&&typeof s==="object"){' +
        'if(ArrayBuffer.isView(s)){' +
        'var r="";for(var i=0;i<s.length;i++)r+=String.fromCharCode(s[i]);' +
        'return _ob(r)}' +
        'if(typeof s.toString==="function")' +
        'return _ob(s.toString("binary"))}' +
        'return _ob(s)}' +
        '}catch(e){console.warn("btoa patch error:",e)}' +
        '<\/script>' +
        '<script src="https://cdn.jsdelivr.net/npm/@planktimerr/tikzjax@1.0.7/dist/tikzjax.js"><\/script>' +
        '</head><body>' +
        '<script type="text/tikz">' + safeCode + '<\/script>' +
        '</body></html>');
    doc.close();

    var pollTimer = setInterval(function() {
        try {
            var d = iframe.contentDocument || iframe.contentWindow.document;
            var svg = d.querySelector('svg');
            if (svg) {
                clearInterval(pollTimer);
                clearTimeout(timeoutTimer);
                var clone = svg.cloneNode(true);
                if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
                callback(clone.outerHTML);
            }
        } catch(e) {
            console.warn('TikZ poll error:', e);
        }
    }, 300);

    var timeoutTimer = setTimeout(function() {
        clearInterval(pollTimer);
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        callback('<span style="color:red">[TikZ渲染超时]</span>');
    }, 120000);
}
function renderQuestionCards(questions) {
    var container = document.getElementById('questionCards');
    if (!container) return;

    if (questions.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon"><span class="icon icon-search icon-lg" aria-hidden="true"></span></div><p>\u6ca1\u6709\u627e\u5230\u5339\u914d\u7684\u9898\u76ee</p></div>';
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
        var isExpanded = state.expandedSolutions.has(q.id);
        var solutionDisplay = isExpanded ? 'show' : '';
        var solutionArrow = '<span class="icon-solution-arrow' + (isExpanded ? ' expanded' : '') + '"></span>';

        var optionsHtml = '';
        if (q.options && q.options.length > 0) {
            optionsHtml = '<ul class="options-list">';
            q.options.forEach(function(opt) {
                var isCorrect = opt.label === q.answer;
                var style = isCorrect ? 'style="background:#f0f9eb;border-color:#e1f3d8;"' : '';
                optionsHtml += '<li ' + style + '><span class="option-label">' + escapeHtml(opt.label) + '</span>' + escapeHtml(opt.text) + '</li>';
            });
            optionsHtml += '</ul>';
        }

        var answerHtml = '';
        if (q.answer) {
            answerHtml = '<p><strong>\u7b54\u6848\uff1a</strong><span style="color:#67c23a;font-weight:600;">' + escapeHtml(q.answer) + '</span></p>';
        }

        var solutionHtml = '';
        if (q.solution) {
            solutionHtml = '<div class="solution-toggle" onclick="toggleSolution(' + q.id + ')"><span>' + solutionArrow + '</span> <span>\u67e5\u770b\u8be6\u7ec6\u89e3\u6790</span></div>';
            solutionHtml += '<div class="solution-content ' + solutionDisplay + '"><br>' + prepareDisplayText(q.solution, { newlines: true }) + '</div>';
        }

        var knowledgeList = q.knowledgeList && q.knowledgeList.length > 0 ? q.knowledgeList : (q.knowledge ? [q.knowledge] : []);

        html += '<div class="question-card" data-id="' + q.id + '">';
        html += '<div class="card-header"><div class="card-tags">';
        knowledgeList.forEach(function(kn) {
            var fp = getKnowledgePath(kn);
            html += '<span class="tag tag-knowledge" title="' + escapeHtml(fp) + '">' + escapeHtml(fp) + '</span>';
        });
        if (q.meta) {
            if (q.meta.year) html += '<span class="tag tag-meta-year" title="年份" style="background:#ecf5ff;color:#409eff;border:1px solid #d9ecff;">' + escapeHtml(q.meta.year) + '</span>';
            if (q.meta.region) html += '<span class="tag tag-meta-region" title="地区" style="background:#f0f9eb;color:#67c23a;border:1px solid #e1f3d8;">' + escapeHtml(q.meta.region) + '</span>';
            if (q.meta.grade) html += '<span class="tag tag-meta-grade" title="年级" style="background:#fdf6ec;color:#e6a23c;border:1px solid #faecd8;">' + escapeHtml(q.meta.grade) + '</span>';
            if (q.meta.examType) html += '<span class="tag tag-meta-exam" title="考试类型" style="background:#fef0f0;color:#f56c6c;border:1px solid #fde2e2;">' + escapeHtml(q.meta.examType) + '</span>';
            if (q.meta.questionNum) html += '<span class="tag tag-meta-num" title="题号" style="background:#f4f4f5;color:#909399;border:1px solid #e9e9eb;">' + escapeHtml(q.meta.questionNum) + '</span>';
            if (q.meta.multiSelect) html += '<span class="tag tag-meta-multi" title="多选" style="background:#fdfaff;color:#9c36cc;border:1px solid #f0d6f5;">多选</span>';
        }
        html += '</div><div class="card-meta"><span><span class="icon icon-calendar" aria-hidden="true"></span> ' + escapeHtml(q.year || '') + '</span>';
        if (q.source) {
            html += '<span class="copy-source-btn" onclick="copySource(' + q.id + ')"><span class="icon icon-clipboard" aria-hidden="true"></span> 复制源码</span>';
        }
        html += '<span class="remark-tag" onclick="editRemark(' + q.id + ')">' + (q.remark ? escapeHtml(q.remark) : '<span class="remark-empty">+ 备注</span>') + '</span>';
        html += '</div></div>';
        html += '<div class="card-body"><div class="question-text">' + prepareDisplayText(q.question) + '</div>';
        html += optionsHtml + answerHtml;
        html += '<div class="solution-section">' + solutionHtml + '</div></div>';
        html += '<div class="card-footer"><button class="btn-edit" onclick="showEditModal(' + q.id + ')"><span class="icon icon-pen" aria-hidden="true"></span> \u7f16\u8f91</button></div></div>';
    });

    // Pagination info

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

    var html = '';
    html += '<button class="page-btn' + (state.currentPage === 1 ? ' disabled' : '') + '" onclick="goToPage(1)"' + (state.currentPage === 1 ? ' disabled' : '') + '>首页</button>';
    html += '<button class="page-btn' + (state.currentPage === 1 ? ' disabled' : '') + '" onclick="goToPage(' + (state.currentPage - 1) + ')"' + (state.currentPage === 1 ? ' disabled' : '') + '>上一页</button>';

    var pages = [];
    pages.push(1);
    if (state.currentPage - 2 > 1) pages.push('...');
    for (var p = Math.max(2, state.currentPage - 1); p <= Math.min(totalPages - 1, state.currentPage + 1); p++) {
        pages.push(p);
    }
    if (state.currentPage + 2 < totalPages) pages.push('...');
    if (totalPages > 1) pages.push(totalPages);

    var seen = {};
    pages.forEach(function(pg) {
        if (seen[pg] !== undefined) return;
        seen[pg] = true;
        if (pg === '...') {
            html += '<span class="page-ellipsis">...</span>';
        } else {
            html += '<button class="page-btn' + (pg === state.currentPage ? ' active' : '') + '" onclick="goToPage(' + pg + ')">' + pg + '</button>';
        }
    });

    html += '<button class="page-btn' + (state.currentPage === totalPages ? ' disabled' : '') + '" onclick="goToPage(' + (state.currentPage + 1) + ')"' + (state.currentPage === totalPages ? ' disabled' : '') + '>下一页</button>';
    html += '<button class="page-btn' + (state.currentPage === totalPages ? ' disabled' : '') + '" onclick="goToPage(' + totalPages + ')"' + (state.currentPage === totalPages ? ' disabled' : '') + '>末页</button>';

    nav.innerHTML = html;

    var pageInfo = document.getElementById('pageInfo');
    if (pageInfo) {
        pageInfo.textContent = '第 ' + state.currentPage + ' / ' + totalPages + ' 页';
    }

    var goInput = document.getElementById('goPageInput');
    if (goInput) {
        goInput.max = totalPages;
    }
}
function goToPage(page) {
    var filtered = getFilteredQuestions();
    var totalPages = Math.ceil(filtered.length / state.pageSize);
    if (page < 1 || page > totalPages) return;
    state.currentPage = page;
    applyFiltersAndRender();
}

function goPrevPage() {
    var filtered = getFilteredQuestions();
    var totalPages = Math.ceil(filtered.length / state.pageSize);
    if (state.currentPage > 1) goToPage(state.currentPage - 1);
}

function goNextPage() {
    var filtered = getFilteredQuestions();
    var totalPages = Math.ceil(filtered.length / state.pageSize);
    if (state.currentPage < totalPages) goToPage(state.currentPage + 1);
}

function goToLastPage() {
    var filtered = getFilteredQuestions();
    var totalPages = Math.ceil(filtered.length / state.pageSize);
    if (totalPages > 1) goToPage(totalPages);
}

function goToPageInput() {
    var input = document.getElementById('goPageInput');
    if (!input) return;
    var page = parseInt(input.value);
    var filtered = getFilteredQuestions();
    var totalPages = Math.ceil(filtered.length / state.pageSize);
    if (page >= 1 && page <= totalPages) {
        goToPage(page);
        input.value = '';
    } else {
        input.value = '';
        input.placeholder = '超出范围';
        setTimeout(function() { input.placeholder = '页码'; }, 1500);
    }
}


function updateQuestionCount(count) {
    var el = document.getElementById("questionCount");
    if (el) el.textContent = "\u5171 " + count + " \u9898";
}

// ========== Toggle Solution ==========
function toggleSolution(id) {
    if (state.expandedSolutions.has(id)) {
        state.expandedSolutions.delete(id);
    } else {
        state.expandedSolutions.add(id);
    }
    applyFiltersAndRender();
}

function copySource(id) {
    var q = questionBank.find(function(q) { return q.id === id; });
    if (!q || !q.source) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(q.source).then(function() {
            var btn = document.querySelector('.question-card[data-id="' + id + '"] .copy-source-btn');
            if (btn) { btn.innerHTML = '<span class="icon icon-check" aria-hidden="true"></span> 已复制'; btn.style.color = '#67c23a'; }
        });
    }
}

function editRemark(id) {
    var q = questionBank.find(function(q) { return q.id === id; });
    if (!q) return;
    var newRemark = prompt('请输入备注：', q.remark || '');
    if (newRemark === null) return;
    q.remark = newRemark.trim();
    saveQuestionBank();
    applyFiltersAndRender();
}

// ========== Edit Modal ==========
var _editingQuestionId = null;

function showEditModal(id) {
    var q = questionBank.find(function(q) { return q.id === id; });
    if (!q) return;
    _editingQuestionId = id;
    document.getElementById('editSource').value = q.source || '';
    document.getElementById('editRemark').value = q.remark || '';
    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    _editingQuestionId = null;
}

function saveQuestionEdit() {
    var id = _editingQuestionId;
    if (id === null) return;
    var q = questionBank.find(function(q) { return q.id === id; });
    if (!q) return;
    var newSource = document.getElementById('editSource').value.trim();
    if (!newSource) { alert('源码不能为空'); return; }
    if (!confirm('确认保存修改？')) return;
    // Re-parse the source to update all fields
    var parsed = parseSingleExample(newSource);
    if (!parsed) { alert('源码解析失败，请检查格式'); return; }
    // Preserve id, knowledge, and remark
    q.remark = document.getElementById('editRemark').value.trim();
    q.source = newSource;
    q.type = parsed.type;
    q.question = parsed.question;
    q.options = parsed.options;
    q.answer = parsed.answer;
    q.solution = parsed.solution;
    q.knowledgeNames = parsed.knowledgeNames;
    q.meta = parsed.meta;
    if (parsed.knowledgeNames && parsed.knowledgeNames.length > 0) {
        q.knowledgeList = parsed.knowledgeNames.slice();
    }
    saveQuestionBank();
    closeEditModal();
    applyFiltersAndRender();
}

function deleteQuestion() {
    var id = _editingQuestionId;
    if (id === null) return;
    if (!confirm('确认删除该题目？此操作不可撤销！')) return;
    var idx = questionBank.findIndex(function(q) { return q.id === id; });
    if (idx === -1) return;
    questionBank.splice(idx, 1);
    saveQuestionBank();
    closeEditModal();
    applyFiltersAndRender();
}

// ========== Filter Logic ==========
function getFilteredQuestions() {
    var questions = Array.from(questionBank);
    if (state.filters.type) {
        questions = questions.filter(function(q) { return q.type === state.filters.type; });
    }
    if (state.filters.year) {
        questions = questions.filter(function(q) { return q.meta && q.meta.year === state.filters.year; });
    }
    if (state.filters.region) {
        questions = questions.filter(function(q) { return q.meta && q.meta.region === state.filters.region; });
    }
    if (state.filters.grade) {
        questions = questions.filter(function(q) { return q.grade === state.filters.grade; });
    }
    if (state.filters.difficulty) {
        questions = questions.filter(function(q) { return q.difficulty === state.filters.difficulty; });
    }
    if (state.filters.examType) {
        questions = questions.filter(function(q) { return q.meta && q.meta.examType === state.filters.examType; });
    }
    if (state.filters.questionNum) {
        questions = questions.filter(function(q) { return q.meta && q.meta.questionNum === state.filters.questionNum; });
    }
    if (state.filters.knowledge) {
        var kf = state.filters.knowledge;
        var descendantLeaves = knowledgeDescendantsMap[kf];
        questions = questions.filter(function(q) {
            var kl = q.knowledgeList && q.knowledgeList.length > 0 ? q.knowledgeList : (q.knowledge ? [q.knowledge] : []);
            if (descendantLeaves) {
                // Parent node: match if question's knowledge is the node itself OR a descendant leaf
                return kl.some(function(k) { return k === kf || descendantLeaves.indexOf(k) !== -1; });
            } else {
                return kl.indexOf(kf) !== -1;
            }
        });
    }
    if (state.searchQuery) {
        var query = state.searchQuery.toLowerCase();
        questions = questions.filter(function(q) {
            var kl = q.knowledgeList && q.knowledgeList.length > 0 ? q.knowledgeList : (q.knowledge ? [q.knowledge] : []);
            var kMatch = kl.some(function(k) { return k.toLowerCase().includes(query) || getKnowledgePath(k).toLowerCase().includes(query); });
            return q.question.toLowerCase().includes(query) || kMatch || (q.grade && q.grade.includes(query));
        });
    }
    return questions;
}

function applyFiltersAndRender() {
    var questions = getFilteredQuestions();
    renderQuestionCards(questions);
    renderFilterBar();
}

// ========== Knowledge Filter ==========
function setKnowledgeFilter(knowledge) {
    state.filters.knowledge = knowledge;
    state.currentPage = 1;

    // Clear all active states first
    document.querySelectorAll(".knowledge-item, .category-title").forEach(function(el) {
        el.classList.remove("active");
    });

    // Try to highlight as a knowledge-item (folder or leaf)
    var el = document.querySelector('.knowledge-item[data-knowledge="' + knowledge + '"]');
    if (!el) {
        // Maybe it's a category title
        el = document.querySelector('.category-title[data-toggle="' + knowledge + '"]');
        if (el) el.classList.add("active");
    }
    if (el) {
        el.classList.add("active");
        // Walk up and activate parent folders, expand them if collapsed
        var parent = el.parentElement;
        while (parent) {
            if (parent.classList.contains("sub-items") || parent.classList.contains("category-items")) {
                var siblingLi = parent.previousElementSibling;
                if (siblingLi && siblingLi.classList.contains("knowledge-folder")) {
                    siblingLi.classList.add("active");
                    if (parent.classList.contains("hidden")) {
                        parent.classList.remove("hidden");
                        siblingLi.classList.add("expanded");
                    }
                }
            }
            parent = parent.parentElement;
        }
    }

    applyFiltersAndRender();
}

// Build knowledge path map and parent->descendants map from DOM knowledge panel
function buildKnowledgePathMap() {
    var panel = document.getElementById("knowledgeList");
    if (!panel) return;
    // Reset descendants map
    for (var k in knowledgeDescendantsMap) delete knowledgeDescendantsMap[k];

    function collectAllDescendants(ul) {
        if (!ul) return [];
        var leaves = [];
        var items = ul.querySelectorAll(":scope > li.knowledge-item");
        items.forEach(function(li) {
            if (li.classList.contains("knowledge-folder")) {
                var toggleId = li.getAttribute("data-toggle");
                var childUl = toggleId ? document.getElementById(toggleId) : null;
                if (childUl) {
                    leaves = leaves.concat(collectAllDescendants(childUl));
                }
            } else {
                var name = li.getAttribute("data-knowledge");
                if (name) leaves.push(name);
            }
        });
        return leaves;
    }

    var categories = panel.querySelectorAll(".knowledge-category");
    categories.forEach(function(category) {
        var categoryName = category.querySelector(".category-title") && category.querySelector(".category-title").getAttribute("data-toggle");
        if (!categoryName) return;
        var catUl = category.querySelector("ul.category-items");
        if (!catUl) return;

        // L1: category level
        var allL1Leaves = collectAllDescendants(catUl);
        knowledgeDescendantsMap[categoryName] = allL1Leaves;

        var l2Folders = catUl.querySelectorAll(":scope > li.knowledge-folder");
        l2Folders.forEach(function(l2Li) {
            var l2Name = l2Li.getAttribute("data-knowledge");
            var l2ToggleId = l2Li.getAttribute("data-toggle");
            var l2Ul = l2ToggleId ? document.getElementById(l2ToggleId) : null;
            if (!l2Ul || !l2Name) return;

            // L2: subcategory level
            var allL2Leaves = collectAllDescendants(l2Ul);
            knowledgeDescendantsMap[l2Name] = allL2Leaves;

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
                            var fullPath = categoryName + " - " + l2Name + " - " + l3Name + " - " + l4Name;
                            knowledgePathMap[l4Name] = fullPath;
                            knowledgePathReverseMap[fullPath] = l4Name;
                        }
                    });
                }
                if (!l3Ul) {
                    var fullPath = categoryName + " - " + l2Name + " - " + l3Name;
                    knowledgePathMap[l3Name] = fullPath;
                    knowledgePathReverseMap[fullPath] = l3Name;
                }

                // L3: sub-subcategory level
                var allL3Leaves = collectAllDescendants(l3Ul);
                knowledgeDescendantsMap[l3Name] = allL3Leaves;
            });

            var l3Leaves = l2Ul.querySelectorAll(":scope > li.knowledge-item:not(.knowledge-folder)");
            l3Leaves.forEach(function(leaf) {
                var name = leaf.getAttribute("data-knowledge");
                if (name && !knowledgePathMap[name]) {
                    var fullPath = categoryName + " - " + l2Name + " - " + name;
                    knowledgePathMap[name] = fullPath;
                    knowledgePathReverseMap[fullPath] = name;
                }
            });
        });
    });
}

// Recursively collect all leaf knowledge names under a UL
function collectAllDescendants(ul) {
    if (!ul) return [];
    var leaves = [];
    var items = ul.querySelectorAll(":scope > li.knowledge-item");
    items.forEach(function(li) {
        if (li.classList.contains("knowledge-folder")) {
            var toggleId = li.getAttribute("data-toggle");
            var childUl = toggleId ? document.getElementById(toggleId) : null;
            if (childUl) {
                leaves = leaves.concat(collectAllDescendants(childUl));
            }
        } else {
            var name = li.getAttribute("data-knowledge");
            if (name) leaves.push(name);
        }
    });
    return leaves;
}
function getKnowledgePath(knowledgeName) {
    if (!knowledgeName) return knowledgeName || "";
    if (knowledgePathMap[knowledgeName]) return knowledgePathMap[knowledgeName];
    return knowledgeName;
}

// ========== Tab Switching ==========
function switchTab(tabName) {
    state.currentTab = tabName;
    document.querySelectorAll(".nav-item").forEach(function(el) {
        el.classList.toggle("active", el.dataset.tab === tabName);
    });
    document.querySelectorAll("[data-panel]").forEach(function(panel) {
        panel.style.display = panel.dataset.panel === tabName ? "flex" : "none";
    });
    var fp = document.getElementById("filterPanel");
    if (fp) fp.style.display = tabName === "question-bank" ? "block" : "none";
    var kp = document.getElementById("knowledgePanel");
    if (kp) kp.style.display = tabName === "question-bank" ? "flex" : "none";
    if (tabName === "question-bank") applyFiltersAndRender();

    // Typeset MathJax when switching to materials tab
    if (tabName === "materials") {
        var mc = document.querySelector(".materials-content");
        if (mc) typesetMath(mc);
    }

    // Initialize paper maker knowledge search when switching to paper-maker tab
    if (tabName === "paper-maker") {
        initPaperKpSearch();
        renderPaperKpTags();
    }

}

// ========== Paper Generation ==========
// Paper maker knowledge point state: array of { leaf: string, counts: { single:0, multi:0, fill:0, essay:0 } }
var paperKpState = [];

function renderPaperKpTags() {
    var container = document.getElementById('paperKpTags');
    if (!container) return;
    var html = '';
    paperKpState.forEach(function(item, idx) {
        var fp = knowledgePathMap[item.leaf] || item.leaf;
        html += '<div class="paper-kp-tag" data-kp-idx="' + idx + '">';
        html += '<span class="kp-name" title="' + escapeHtml(fp) + '">' + escapeHtml(item.leaf) + '</span>';
        html += '<span class="kp-counts">';
        html += '<label>单选 <input type="number" class="kp-type-input" data-idx="' + idx + '" data-type="single" value="' + item.counts.single + '" min="0"></label>';
        html += '<label>多选 <input type="number" class="kp-type-input" data-idx="' + idx + '" data-type="multi" value="' + item.counts.multi + '" min="0"></label>';
        html += '<label>填空 <input type="number" class="kp-type-input" data-idx="' + idx + '" data-type="fill" value="' + item.counts.fill + '" min="0"></label>';
        html += '<label>解答 <input type="number" class="kp-type-input" data-idx="' + idx + '" data-type="essay" value="' + item.counts.essay + '" min="0"></label>';
        html += '</span>';
        html += '<span class="kp-remove" data-idx="' + idx + '"><span class="icon icon-times" aria-hidden="true"></span></span>';
        html += '</div>';
    });
    container.innerHTML = html;

    // Attach change handlers for count inputs
    container.querySelectorAll('.kp-type-input').forEach(function(inp) {
        inp.addEventListener('change', function() {
            var idx = parseInt(this.dataset.idx);
            var type = this.dataset.type;
            var val = parseInt(this.value) || 0;
            if (idx >= 0 && idx < paperKpState.length) {
                paperKpState[idx].counts[type] = val;
            }
        });
    });

    // Attach remove handlers
    container.querySelectorAll('.kp-remove').forEach(function(el) {
        el.addEventListener('click', function() {
            var idx = parseInt(this.dataset.idx);
            if (idx >= 0 && idx < paperKpState.length) {
                paperKpState.splice(idx, 1);
                renderPaperKpTags();
            }
        });
    });
}

function initPaperKpSearch() {
    var input = document.getElementById('paperKpSearchInput');
    var dd = document.getElementById('paperKpDropdown');
    if (!input || !dd) return;

    // Remove old listeners by cloning
    var newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);
    input = newInput;
    input.id = 'paperKpSearchInput';

    input.addEventListener('input', function() {
        var query = this.value.trim().toLowerCase();
        if (!query) { dd.style.display = 'none'; return; }
        var matches = [];
        for (var leaf in knowledgePathMap) {
            var fp = knowledgePathMap[leaf];
            if (leaf.toLowerCase().indexOf(query) !== -1 || fp.toLowerCase().indexOf(query) !== -1) {
                // Exclude already selected
                var already = paperKpState.some(function(item) { return item.leaf === leaf; });
                if (!already) {
                    matches.push({ leaf: leaf, path: fp });
                }
            }
            if (matches.length >= 10) break;
        }
        if (matches.length === 0) { dd.style.display = 'none'; return; }
        var ddHtml = '';
        matches.forEach(function(m) {
            ddHtml += '<div class="paper-kp-dropdown-item" data-leaf="' + escapeHtml(m.leaf) + '">' + escapeHtml(m.path) + '</div>';
        });
        dd.innerHTML = ddHtml;
        dd.style.display = 'block';
    });

    input.addEventListener('blur', function() {
        setTimeout(function() { dd.style.display = 'none'; }, 200);
    });

    input.addEventListener('focus', function() {
        if (this.value.trim()) this.dispatchEvent(new Event('input'));
    });

    dd.addEventListener('mousedown', function(e) {
        var item = e.target.closest('.paper-kp-dropdown-item');
        if (!item) return;
        var leaf = item.dataset.leaf;
        // Check not already added
        var already = paperKpState.some(function(ex) { return ex.leaf === leaf; });
        if (!already) {
            paperKpState.push({ leaf: leaf, counts: { single: 0, multi: 0, fill: 0, essay: 0 } });
            renderPaperKpTags();
        }
        input.value = '';
        input.focus();
        dd.style.display = 'none';
    });
}

function generatePaper() {
    var container = document.getElementById("paperArea");
    if (!container) return;

    // Read global type counts
    var globalSingle = parseInt(document.getElementById("paperSingleChoice").value) || 0;
    var globalMulti = parseInt(document.getElementById("paperMultiChoice").value) || 0;
    var globalFill = parseInt(document.getElementById("paperFillBlank").value) || 0;
    var globalEssay = parseInt(document.getElementById("paperEssay").value) || 0;

    // Read per-KP counts from rendered inputs (already synced via change handlers)
    // paperKpState is already up-to-date

    var typeMap = { '单选题': 'single', '多选题': 'multi', '填空题': 'fill', '解答题': 'essay' };
    var reverseTypeMap = { single: '单选题', multi: '多选题', fill: '填空题', essay: '解答题' };

    function randomPick(arr, count) {
        var s = arr.slice().sort(function() { return Math.random() - 0.5; });
        return s.slice(0, Math.min(count, s.length));
    }

    function filterByType(qs, typeName) {
        return qs.filter(function(q) { return q.type === typeName; });
    }

    var selected = [];

    if (paperKpState.length === 0) {
        // Global mode: no knowledge point filter
        var pool = questionBank.slice();
        selected = selected.concat(randomPick(filterByType(pool, '单选题'), globalSingle));
        selected = selected.concat(randomPick(filterByType(pool, '多选题'), globalMulti));
        selected = selected.concat(randomPick(filterByType(pool, '填空题'), globalFill));
        selected = selected.concat(randomPick(filterByType(pool, '解答题'), globalEssay));
    } else {
        // Per-knowledge-point mode
        paperKpState.forEach(function(kp) {
            var leaf = kp.leaf;
            var descendantLeaves = knowledgeDescendantsMap[leaf];
            var pool = questionBank.filter(function(q) {
                var kl = q.knowledgeList && q.knowledgeList.length > 0 ? q.knowledgeList : (q.knowledge ? [q.knowledge] : []);
                if (descendantLeaves) {
                    return kl.some(function(k) { return k === leaf || descendantLeaves.indexOf(k) !== -1; });
                } else {
                    return kl.indexOf(leaf) !== -1;
                }
            });
            selected = selected.concat(randomPick(filterByType(pool, '单选题'), kp.counts.single));
            selected = selected.concat(randomPick(filterByType(pool, '多选题'), kp.counts.multi));
            selected = selected.concat(randomPick(filterByType(pool, '填空题'), kp.counts.fill));
            selected = selected.concat(randomPick(filterByType(pool, '解答题'), kp.counts.essay));
        });
        // If per-KP counts are all zero, fall back to global
        var hasAnyKpCount = paperKpState.some(function(kp) {
            return kp.counts.single > 0 || kp.counts.multi > 0 || kp.counts.fill > 0 || kp.counts.essay > 0;
        });
        if (!hasAnyKpCount && (globalSingle > 0 || globalMulti > 0 || globalFill > 0 || globalEssay > 0)) {
            // Use global counts but scoped to selected knowledge points
            var kpLeaves = [];
            paperKpState.forEach(function(kp) {
                var dl = knowledgeDescendantsMap[kp.leaf];
                if (dl) {
                    kpLeaves = kpLeaves.concat(dl);
                } else {
                    kpLeaves.push(kp.leaf);
                }
            });
            var pool = questionBank.filter(function(q) {
                var kl = q.knowledgeList && q.knowledgeList.length > 0 ? q.knowledgeList : (q.knowledge ? [q.knowledge] : []);
                return kl.some(function(k) { return kpLeaves.indexOf(k) !== -1; });
            });
            selected = [];
            selected = selected.concat(randomPick(filterByType(pool, '单选题'), globalSingle));
            selected = selected.concat(randomPick(filterByType(pool, '多选题'), globalMulti));
            selected = selected.concat(randomPick(filterByType(pool, '填空题'), globalFill));
            selected = selected.concat(randomPick(filterByType(pool, '解答题'), globalEssay));
        }
    }

    if (selected.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon"><span class="icon icon-warning icon-lg" aria-hidden="true"></span></div><p>\u8bf7\u81f3\u5c11\u9009\u62e9\u4e00\u4e2a\u9898\u76ee\u6570\u91cf</p></div>';
        return;
    }

    var html = '<div class="paper-info">\u5df2\u53d6\u7b54 <strong>' + selected.length + '</strong> \u9053\u9898</div>';
    selected.forEach(function(q, i) {
        html += '<div class="paper-question" data-qid="' + q.id + '">';
        html += '<span class="paper-q-num">' + (i + 1) + '.</span>';
        html += '<div class="paper-q-body">';
        html += '<div class="paper-q-text">' + prepareDisplayText(q.question) + '</div>';

        // Options
        if (q.options && q.options.length > 0) {
            html += '<div class="paper-options">';
            q.options.forEach(function(opt) {
                html += '<div class="paper-option">' + escapeHtml(opt.label) + '. ' + escapeHtml(opt.text) + '</div>';
            });
            html += '</div>';
        }

        // Answer
        if (q.answer) {
            html += '<div class="paper-answer"><strong>\u7b54\u6848\uff1a</strong> <span>' + escapeHtml(q.answer) + '</span></div>';
        }

        // Solution
        if (q.solution) {
            html += '<div class="paper-solution"><strong>\u89e3\u6790\uff1a</strong> <span>' + prepareDisplayText(q.solution) + '</span></div>';
        }

        // Type + Difficulty tag
        var metaParts = [];
        if (q.type) metaParts.push('<span class="tag tag-type" style="font-size:11px;padding:1px 6px;">' + escapeHtml(q.type) + '</span>');
        if (q.difficulty) {
            var diffLabel = { easy: '\u7b80\u5355', medium: '\u4e2d\u7b49', hard: '\u56f0\u96be' }[q.difficulty] || q.difficulty;
            var diffColor = { easy: '#67c23a', medium: '#e6a23c', hard: '#f56c6c' }[q.difficulty] || '#909399';
            metaParts.push('<span class="paper-diff-tag" style="background:' + diffColor + ';color:#fff;padding:1px 6px;border-radius:3px;font-size:11px;">' + diffLabel + '</span>');
        }
        if (metaParts.length > 0) {
            html += '<div class="paper-meta" style="margin-top:6px;display:flex;gap:4px;align-items:center;">' + metaParts.join('') + '</div>';
        }

        html += '</div></div>';
    });

    container.innerHTML = html;
    typesetMath(container);
}

function printPaper() {
    var content = document.getElementById("paperArea").innerHTML;
    var win = window.open("", "_blank");
    var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>\u6253\u5370\u8bd5\u5377</title>';
    html += '<style>';
    html += '@media print {';
    html += '  body { margin: 0; padding: 20px; }';
    html += '  .paper-info, .paper-meta, .btn-print { display: none !important; }';
    html += '  .paper-question { page-break-inside: avoid; }';
    html += '}';
    html += 'body { font-family: "SimSun", serif; max-width: 780px; margin: 0 auto; padding: 40px 20px; line-height: 1.8; color: #000; }';
    html += 'h1 { text-align: center; margin-bottom: 30px; font-size: 22px; }';
    html += '.paper-info { text-align: center; padding: 8px; margin-bottom: 20px; border-bottom: 1px solid #ccc; font-size: 14px; color: #666; }';
    html += '.paper-question { margin: 20px 0; padding: 10px 0; page-break-inside: avoid; }';
    html += '.paper-q-num { font-weight: bold; margin-right: 10px; }';
    html += '.paper-q-body { display: block; }';
    html += '.paper-q-text { margin-bottom: 8px; }';
    html += '.paper-options { margin: 8px 0 8px 24px; }';
    html += '.paper-option { display: inline-block; width: 50%; margin-bottom: 4px; }';
    html += '.paper-answer { margin-top: 10px; padding: 8px 12px; background: #f9f9f9; border-left: 3px solid #67c23a; font-size: 14px; }';
    html += '.paper-solution { margin-top: 10px; padding: 8px 12px; background: #f9f9f9; border-left: 3px solid #409eff; font-size: 14px; color: #555; }';
    html += '.paper-diff-tag { font-size: 12px; padding: 1px 6px; border-radius: 3px; }';
    html += 'table { border-collapse: collapse; width: 100%; margin: 8px 0; }';
    html += 'td { border: 1px solid #333; padding: 6px 10px; text-align: center; }';
    html += '</style>';
    html += '</head><body>';
    html += '<h1>\u6570\u5b66\u8bd5\u5377</h1>';
    html += content;
    html += '</body></html>';
    win.document.write(html);
    win.document.close();
    setTimeout(function () { win.print(); }, 2000);
}

// ========== Import/Export Question Bank ==========
function showProgress(title, current, total) {
    var overlay = document.getElementById('progressOverlay');
    var titleEl = document.getElementById('progressTitle');
    var fill = document.getElementById('progressFill');
    var textEl = document.getElementById('progressText');
    if (!overlay || !fill) return;
    overlay.style.display = 'flex';
    if (titleEl) titleEl.innerHTML = title;
    var pct = total > 0 ? Math.min(100, Math.round(current / total * 100)) : 0;
    fill.style.width = pct + '%';
    if (textEl) textEl.textContent = current + ' / ' + total;
}
function hideProgress() {
    var overlay = document.getElementById('progressOverlay');
    if (overlay) overlay.style.display = 'none';
}

function showExportMenu() {
    if (!questionBank || questionBank.length === 0) { alert('题库为空，无法导出'); return; }
    var menu = document.createElement('div');
    menu.className = 'export-menu';
    menu.innerHTML = '<div class="export-menu-title">选择导出格式</div>' +
        '<div class="export-menu-item" onclick="exportQuestionBankJson();this.closest(\'.export-menu\').remove()"><span class="icon icon-document" aria-hidden="true"></span> JSON 文件</div>' +
        '<div class="export-menu-item" onclick="exportQuestionBankSource();this.closest(\'.export-menu\').remove()"><span class="icon icon-scroll" aria-hidden="true"></span> 源码 (.tex)</div>' +
        '<div class="export-menu-item cancel" onclick="this.closest(\'.export-menu\').remove()">取消</div>';
    document.body.appendChild(menu);
    // Position near the button
    var btn = document.querySelector('.btn-export-data');
    if (btn) {
        var rect = btn.getBoundingClientRect();
        menu.style.left = rect.left + 'px';
        menu.style.top = (rect.bottom + 4) + 'px';
    }
    // Close on outside click
    setTimeout(function() {
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', closeMenu); }
        });
    }, 10);
}

function exportQuestionBankJson() {
    showProgress('正在导出 JSON...', 0, 1);
    setTimeout(function() {
        var data = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            totalQuestions: questionBank.length,
            questions: questionBank
        };
        var jsonStr = JSON.stringify(data, null, 2);
        var blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'question_bank_' + new Date().toISOString().slice(0,10) + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showProgress('<span class="icon icon-check" aria-hidden="true"></span> 导出完成', 1, 1);
        setTimeout(hideProgress, 1200);
    }, 100);
}

function exportQuestionBankSource() {
    var total = questionBank.length;
    if (total === 0) { alert('没有可导出的题目'); return; }
    showProgress('正在导出源码...', 0, total);
    setTimeout(function() {
        var lines = [];
        questionBank.forEach(function(q, i) {
            if (q.source) {
                lines.push(q.source);
            } else {
                // Fallback: reconstruct basic example from fields
                lines.push('\\begin{example}{' + ({'单选题':'1','多选题':'2','填空题':'3','解答题':'4'}[q.type] || '4') + '}' +
                    (q.meta && q.meta.year ? '[' + q.meta.year + ']' : '[]') +
                    (q.meta && q.meta.region ? '[' + q.meta.region + ']' : '[]') +
                    (q.meta && q.meta.grade ? '[' + q.meta.grade + ']' : '[]') +
                    (q.meta && q.meta.examType ? '[' + q.meta.examType + ']' : '[]') +
                    (q.meta && q.meta.questionNum ? '[' + q.meta.questionNum + ']' : '[]') +
                    (q.meta && q.meta.multiSelect ? '[多选]' : '[]') + '\n' +
                    q.question + '\n' +
                    (q.answer ? '\\begin{proof}\n\\begin{answer} ' + q.answer + ' \\end{answer}\n' : '') +
                    (q.solution ? '\\begin{solutions} ' + q.solution + ' \\end{solutions}\n' : '') +
                    (q.answer || q.solution ? '\\end{proof}' : '') +
                    '\n\\end{example}');
            }
            showProgress('正在导出源码...', i + 1, total);
        });
        var blob = new Blob([lines.join('\n\n')], { type: 'text/plain;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'question_bank_source_' + new Date().toISOString().slice(0,10) + '.tex';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showProgress('<span class="icon icon-check" aria-hidden="true"></span> 导出完成', total, total);
        setTimeout(hideProgress, 1200);
    }, 100);
}

function importTexFile(event) {
    var file = event.target.files[0];
    if (!file) return;
    showProgress('正在读取 ' + file.name + '...', 0, 1);
    var reader = new FileReader();
    reader.onload = function(e) {
        var content = e.target.result;
        var input = document.getElementById('latexInput');
        if (input) {
            input.value = content;
            // Trigger input event for auto-parse
            var evt = new Event('input', { bubbles: true });
            input.dispatchEvent(evt);
        }
        showProgress('<span class="icon icon-check" aria-hidden="true"></span> 已加载 ' + file.name, 1, 1);
        setTimeout(hideProgress, 1000);
    };
    reader.readAsText(file, 'utf-8');
    event.target.value = '';
}

function clearAllData() {
    var input = prompt('请输入 "确认清空" 以清空所有题目数据（此操作不可撤销）：');
    if (input !== '确认清空') {
        if (input !== null) alert('输入错误，操作已取消');
        return;
    }
    localStorage.clear();
    questionBank = [];
    nextId = 1;
    saveQuestionBank();
    state.filters = { type: '', year: '', region: '', grade: '', examType: '', questionNum: '', knowledge: '', difficulty: '' };
    state.currentPage = 1;
    renderFilterBar();
    applyFiltersAndRender();
    var statusEl = document.getElementById('importStatus');
    if (statusEl) { statusEl.innerHTML = '<span class="icon icon-check" aria-hidden="true"></span> 已清空所有题目数据'; statusEl.style.color = '#67c23a'; }
    setTimeout(function() { if (statusEl) { statusEl.textContent = ''; } }, 3000);
}

var _pendingImport = null;

function closeImportModal() {
    document.getElementById('importModal').style.display = 'none';
    var pi = _pendingImport;
    _pendingImport = null;
    if (pi) {
        if (pi.statusEl) pi.statusEl.innerHTML = '<span class="icon icon-cross" aria-hidden="true"></span> 已取消导入';
        setTimeout(function(){ if(pi.statusEl) pi.statusEl.textContent = ''; }, 3000);
        hideProgress();
    }
}

function doImportMerge() {
    var pi = _pendingImport;
    if (!pi) return;
    _pendingImport = null;
    document.getElementById('importModal').style.display = 'none';
    finishImport(pi.questions, pi.statusEl, false);
}

function doImportReplace() {
    var pi = _pendingImport;
    if (!pi) return;
    _pendingImport = null;
    document.getElementById('importModal').style.display = 'none';
    finishImport(pi.questions, pi.statusEl, true);
}

function finishImport(imported, statusEl, replace) {
    if (replace) {
        questionBank = imported.slice();
    } else {
        questionBank = questionBank.concat(imported);
    }
    nextId = questionBank.length > 0 ? Math.max(...questionBank.map(function(q){return q.id})) + 1 : 1;
    saveQuestionBank();
    buildFilterValues();
    renderFilterBar();
    applyFiltersAndRender();
    var msg = '<span class="icon icon-check" aria-hidden="true"></span> 已导入 ' + imported.length + ' 题，当前共 ' + questionBank.length + ' 题';
    if (statusEl) statusEl.innerHTML = msg;
    setTimeout(function(){ if(statusEl) statusEl.textContent = ''; }, 5000);
    hideProgress();
}

function importQuestionBank(event) {
    var file = event.target.files[0];
    if (!file) return;
    var statusEl = document.getElementById('importStatus');
    if (statusEl) statusEl.textContent = '正在读取...';
    showProgress('正在导入 ' + file.name + '...', 0, 1);
    var reader = new FileReader();
    reader.onload = function(e) {
        try {
            var data = JSON.parse(e.target.result);
            var imported = [];
            if (data.questions && Array.isArray(data.questions)) {
                imported = data.questions;
            } else if (Array.isArray(data)) {
                imported = data;
            } else {
                throw new Error('无法识别的数据格式');
            }
            var total = imported.length;
            showProgress('正在处理导入...', 0, total);
            // Validate and assign IDs
            var maxId = questionBank.length > 0 ? Math.max(...questionBank.map(function(q){return q.id})) : 0;
            imported.forEach(function(q, i) {
                q.id = ++maxId;
                if (!q.knowledgeList) q.knowledgeList = [];
                if (!q.knowledge) q.knowledge = '未分类';
                if (!q.options) q.options = [];
                if (!q.answer) q.answer = '';
                if (!q.solution) q.solution = '';
                if (!q.year) q.year = '';
                if (!q.difficulty) q.difficulty = 'medium';
                if (!q.grade) q.grade = '未分类';
                if (!q.type) q.type = '';
                if (!q.remark) q.remark = '';
                showProgress('正在处理导入...', i + 1, total);
            });
            showProgress('正在合并题库...', total, total);
            // Show import modal with merge/replace options
            _pendingImport = { questions: imported, statusEl: statusEl };
            var modal = document.getElementById('importModal');
            var msgEl = document.getElementById('importModalMessage');
            msgEl.innerHTML = '检测到 <strong>' + imported.length + '</strong> 道题。<br>当前题库共 <strong>' + questionBank.length + '</strong> 道题。<br><br>请选择导入方式：';
            modal.style.display = 'flex';
        } catch(err) {
            if (statusEl) statusEl.innerHTML = '<span class="icon icon-cross" aria-hidden="true"></span> 导入失败: ' + escapeHtml(err.message);
            setTimeout(function(){ if(statusEl) statusEl.textContent = ''; }, 5000);
            hideProgress();
        }
    };
    reader.readAsText(file, 'utf-8');
    // Reset input so same file can be re-imported
    event.target.value = '';
}

// ========== Add Question ==========
// 初始化 nextId，取题库最大 ID + 1
var nextId = questionBank.length > 0 ? Math.max(...questionBank.map(function(q){return q.id})) + 1 : 1;

function addQuestion(e) {
    e.preventDefault();

    var grade = document.getElementById("newGrade").value;
    var difficulty = document.getElementById("newDifficulty").value;
    var type = document.getElementById("newType").value;
    var knowledge = document.getElementById("newKnowledge").value || "\u672a\u5206\u7c7b";
    var question = document.getElementById("newQuestion").value;
    var answer = document.getElementById("newAnswer").value;
    var year = document.getElementById("newYear").value || "2024";
    var solution = document.getElementById("newSolution").value;

    var opts = [];
    ["optA", "optB", "optC", "optD"].forEach(function(id, i) {
        var val = document.getElementById(id).value.trim();
        if (val) {
            opts.push({ label: String.fromCharCode(65 + i), text: val });
        }
    });

    var newQ = {
        id: nextId++,
        grade: grade, difficulty: difficulty, type: type, knowledge: knowledge,
        knowledgeCategory: "algebra",
        year: year, question: question, options: opts, answer: answer, solution: solution
    };

    questionBank.push(newQ);
    saveQuestionBank();

    var c = document.getElementById("addedQuestions");
    var msg = '<div class="added-question-item"><span class="icon icon-check" aria-hidden="true"></span> \u9898\u76ee\u5df2\u6210\u529f\u6dfb\u52a0\uff01\u5f53\u524d\u9898\u5e93\u5171 ' + questionBank.length + ' \u9898</div>';
    c.innerHTML = msg + (c.innerHTML || "");

    document.getElementById("addQuestionForm").reset();

    if (state.currentTab === "question-bank") {
        applyFiltersAndRender();
    }

    return false;
}

// Extract content between balanced braces, handling escaped \} and nested {}
function extractBraceContent(str, startPos) {
    var depth = 1;
    var i = startPos;
    while (i < str.length && depth > 0) {
        if (str[i] === '\\' && i + 1 < str.length && (str[i+1] === '{' || str[i+1] === '}')) {
            i += 2;
        } else if (str[i] === '{') {
            depth++;
            i++;
        } else if (str[i] === '}') {
            depth--;
            if (depth > 0) i++;
        } else {
            i++;
        }
    }
    return depth === 0 ? str.substring(startPos, i) : null;
}

// ========== LaTeX Smart Parse ==========
var parsedQuestionsCache = [];
var parsedSelectedKnowledge = []; // per-question selected leaf names

function extractKaodianFromText(text) {
    var names = [];
    var re = /\\kaodian\{/g;
    var m;
    var added = false;
    while ((m = re.exec(text)) !== null) {
        var start = m.index + m[0].length;
        var content = extractBraceContent(text, start);
        if (content) {
            content.split(';').forEach(function(path) {
                var trimmed = path.trim();
                var name = lookupKnowledgeByPath(trimmed);
                if (!name) {
                    ensureKnowledgePath(trimmed);
                    // Rebuild maps so the second lookup finds the newly created element
                    buildKnowledgePathMap();
                    name = lookupKnowledgeByPath(trimmed);
                    added = true;
                }
                if (name && names.indexOf(name) === -1) names.push(name);
            });
            re.lastIndex = start + content.length + 1;
        }
    }
    // buildKnowledgePathMap() already called inside the loop when new paths were created
    // No need to call again here — removed redundant outer call

    return names;
}

function parseSingleExample(source, externalProof) {
    var typeMap = { '1': '单选题', '2': '多选题', '3': '填空题', '4': '解答题' };
    var re = /\\begin\{example\}\{(\d)\}((?:\[[^\]]*\])*)([\s\S]*?)\\end\{example\}/;
    var m = re.exec(source);
    if (!m) return null;
    var qType = typeMap[m[1]] || '解答题';
    var bracketStr = m[2] || '';
    var allContent = m[3].trim();

    // Merge external proof (Mode 2: proof outside \end{example})
    if (externalProof) allContent += '\n' + externalProof;

    var proofContent = '';
    var proofRe = /\\begin\{proof\}([\s\S]*?)\\end\{proof\}/;
    var proofM = proofRe.exec(allContent);
    if (proofM) {
        proofContent = proofM[1];
        var proofStart = proofM.index;
        var proofEnd = proofM.index + proofM[0].length;
        var qBody = allContent.substring(0, proofStart).trim();
    } else {
        var qBody = allContent;
    }

    var meta = { year: '', region: '', grade: '', examType: '', questionNum: '', multiSelect: false };
    var brRe = /\[([^\]]*)\]/g;
    var brM;
    var brIdx = 0;
    var brLabels = ['year', 'region', 'grade', 'examType', 'questionNum'];
    while ((brM = brRe.exec(bracketStr)) !== null) {
        var val = brM[1].trim();
        if (brIdx < brLabels.length) {
            meta[brLabels[brIdx]] = val;
        } else if (brIdx === 5 && val) {
            meta.multiSelect = true;
        }
        brIdx++;
    }

    var knowledgeNames = extractKaodianFromText(qBody + '\n' + proofContent);

    var question = qBody.replace(/\\blankbox/g, '(\\quad)').replace(/\\blankline/g, '______').replace(/\\begin\{choices\}[\s\S]*?\\end\{choices\}/g, '').replace(/\\kaodian\{[^}]*\}/g, '').trim();

    var options = [];
    if (qType === '单选题' || qType === '多选题') {
        var choiceRe = /\\begin\{choices\}([\s\S]*?)\\end\{choices\}/g;
        var cm;
        var searchContent = qBody + '\n' + proofContent;
        while ((cm = choiceRe.exec(searchContent)) !== null) {
            var choiceBlock = cm[1];
            var labels = 'ABCDEFGH';
            var idx = 0;
            var ciRe = /\\choice\{/g;
            var ciMatch;
            while ((ciMatch = ciRe.exec(choiceBlock)) !== null) {
                var start = ciMatch.index + ciMatch[0].length;
                var content = extractBraceContent(choiceBlock, start);
                if (content !== null) {
                    options.push({ label: labels[idx], text: content.trim() });
                    idx++;
                    ciRe.lastIndex = start + content.length + 1;
                }
            }
            if (options.length === 0) {
                var itemRe = /\\item\s+/g;
                var iiMatch;
                while ((iiMatch = itemRe.exec(choiceBlock)) !== null) {
                    var nextIdx = choiceBlock.indexOf('\\item', iiMatch.index + 1);
                    var endIdx = choiceBlock.indexOf('\\end{choices}', iiMatch.index + 1);
                    var stop = -1;
                    if (nextIdx !== -1 && endIdx !== -1) stop = Math.min(nextIdx, endIdx);
                    else if (nextIdx !== -1) stop = nextIdx;
                    else stop = endIdx;
                    if (stop === -1) stop = choiceBlock.length;
                    var text = choiceBlock.substring(iiMatch.index + iiMatch[0].length, stop).trim();
                    if (text) {
                        options.push({ label: labels[idx], text: text });
                        idx++;
                    }
                }
            }
        }
    }

    var answer = '';
    var ansRe = /\\begin\{answer\}([\s\S]*?)\\end\{answer\}/;
    var ansM = ansRe.exec(proofContent);
    if (ansM) answer = ansM[1].trim();

    var solution = '';
    var solRe = /\\begin\{solutions\}([\s\S]*?)\\end\{solutions\}/;
    var solM = solRe.exec(proofContent);
    if (solM) solution = solM[1].trim().replace(/\n\s*/g, '\n');

    return { type: qType, question: question, options: options, answer: answer, solution: solution, knowledgeNames: knowledgeNames, meta: meta, source: m[0] };
}

function parseLatexInput() {
    var input = document.getElementById('latexInput');
    var resultSpan = document.getElementById('parseResult');
    if (!input) return;
    var raw = input.value.trim();
    if (!raw) { resultSpan.textContent = '请先粘贴 LaTeX 内容'; resultSpan.style.color = '#e6a23c'; return; }

    var questions = [];
    var re = /\\begin\{example\}\{(\d)\}((?:\[[^\]]*\])*)([\s\S]*?)\\end\{example\}/g;
    var m;
    var lastIndex = 0;
    while ((m = re.exec(raw)) !== null) {
        var exampleEnd = m.index + m[0].length;
        // Look ahead for external proof block (Mode 2: proof after \end{example})
        var ahead = raw.substring(exampleEnd);
        var extProof = '';
        var extRe = /^\s*\\begin\{proof\}([\s\S]*?)\\end\{proof\}/;
        var extM = extRe.exec(ahead);
        if (extM) extProof = extM[0];
        var parsed = parseSingleExample(m[0], extProof);
        if (parsed) questions.push(parsed);
        // Update lastIndex to skip past external proof if found
        var consumed = extM ? exampleEnd + extM[0].length : exampleEnd;
        if (consumed > re.lastIndex) re.lastIndex = consumed;
    }

    // Rebuild filter values after parsing
    buildFilterValues();
    renderFilterBar();

    if (questions.length === 0) {
        resultSpan.textContent = '未识别到题目，请检查格式'; resultSpan.style.color = '#f56c6c';
        return;
    }

    parsedQuestionsCache = questions;
    renderParsedPreview(questions);
    resultSpan.innerHTML = '<span class="icon icon-check" aria-hidden="true"></span> 已解析 ' + questions.length + ' 题';
    resultSpan.style.color = '#67c23a';
}

function renderParsedPreview(questions) {
    var container = document.getElementById('parsePreview');
    if (!container) return;

    var countEl = document.getElementById('previewCount');
    if (countEl) countEl.textContent = '（共 ' + questions.length + ' 题）';

    parsedSelectedKnowledge = [];
    var html = '';
    questions.forEach(function(q, i) {
        // Initialize selected knowledge from auto-parsed kaodian
        parsedSelectedKnowledge[i] = q.knowledgeNames && q.knowledgeNames.length > 0 ? q.knowledgeNames.slice() : [];

        var optionsHtml = '';
        if (q.options && q.options.length > 0) {
            optionsHtml = '<ul class="options-list">';
            q.options.forEach(function(opt) {
                optionsHtml += '<li><span class="option-label">' + escapeHtml(opt.label) + '</span>' + escapeHtml(opt.text) + '</li>';
            });
            optionsHtml += '</ul>';
        }

        html += '<div class="parsed-question-card" data-parse-idx="' + i + '">';
        html += '<div class="parsed-q-header">题目 ' + (i + 1) + ' <span class="parsed-q-type tag tag-type">' + q.type + '</span></div>';
        var metaStr = formatMetaDisplay(q.meta);
        if (metaStr) {
            html += '<div class="parsed-q-meta-info" style="padding:4px 16px 0;font-size:12px;color:#909399;">' + escapeHtml(metaStr) + '</div>';
        }
        html += '<div class="parsed-q-body">' + prepareDisplayText(q.question) + '</div>';
        html += optionsHtml;
        if (q.answer) {
            html += '<div class="parsed-q-answer"><strong>答案：</strong><span style="color:#67c23a;font-weight:600;">' + escapeHtml(q.answer) + '</span></div>';
        }
        if (q.solution) {
            html += '<div class="parsed-q-solution"><strong>解析：</strong><div class="parsed-sol-content">' + prepareDisplayText(q.solution, { newlines: true }) + '</div></div>';
        }
        // Knowledge search widget
        html += '<div class="parsed-q-meta">';
        html += '<div class="form-row" style="margin-top:10px;">';
        html += '<div class="form-group" style="min-width:100px;"><label>难度</label><select class="parsed-difficulty" data-idx="' + i + '"><option value="easy">简单</option><option value="medium" selected>中等</option><option value="hard">困难</option></select></div>';
        html += '<div class="form-group" style="flex:1;"><label>知识点 <span style="font-weight:normal;color:#909399;font-size:11px;">（可多选）</span></label>';
        html += '<div class="knowledge-search-wrapper">';
        html += '<div class="knowledge-tags" id="knowledgeTags_' + i + '">';
        parsedSelectedKnowledge[i].forEach(function(kn) {
            var fp = knowledgePathMap[kn] || kn;
            html += '<span class="knowledge-tag" data-leaf="' + escapeHtml(kn) + '">' + escapeHtml(fp) + ' <span class="remove-tag" data-idx="' + i + '" data-leaf="' + escapeHtml(kn) + '">\u00d7</span></span>';
        });
        html += '</div>';
        html += '<div class="knowledge-input-wrapper">';
        html += '<input class="knowledge-search-input" data-idx="' + i + '" placeholder="搜索并选择知识点..." autocomplete="off">';
        html += '<div class="knowledge-dropdown" id="knowledgeDropdown_' + i + '" style="display:none;"></div>';
        html += '</div>';
        html += '</div></div></div>';
        html += '<div class="form-row" style="margin-top:8px;"><div class="form-group" style="flex:1;"><label>备注</label><input class="parsed-remark" data-idx="' + i + '" placeholder="自定义备注（可选）" style="width:100%;padding:4px 8px;border:1px solid #dcdfe6;border-radius:4px;font-size:13px;"></div></div>';
        html += '<button class="btn-submit btn-add-to-bank" onclick="addParsedToBank(' + i + ')" style="margin-top:8px;font-size:13px;padding:6px 16px;"><span class="icon icon-download" aria-hidden="true"></span> 添加到题库</button>';
        html += '</div></div>';
    });

    container.innerHTML = html;
    typesetMath(container);

    // Attach knowledge search handlers
    container.querySelectorAll('.knowledge-search-input').forEach(function(inp) {
        inp.addEventListener('input', function() {
            var idx = parseInt(this.dataset.idx);
            var query = this.value.trim().toLowerCase();
            var dd = document.getElementById('knowledgeDropdown_' + idx);
            if (!query) { dd.style.display = 'none'; return; }
            var matches = [];
            for (var leaf in knowledgePathMap) {
                var fp = knowledgePathMap[leaf];
                if (leaf.toLowerCase().indexOf(query) !== -1 || fp.toLowerCase().indexOf(query) !== -1) {
                    if (parsedSelectedKnowledge[idx].indexOf(leaf) === -1) {
                        matches.push({ leaf: leaf, path: fp });
                    }
                }
                if (matches.length >= 10) break;
            }
            if (matches.length === 0) { dd.style.display = 'none'; return; }
            var ddHtml = '';
            matches.forEach(function(m) {
                ddHtml += '<div class="knowledge-dropdown-item" data-idx="' + idx + '" data-leaf="' + escapeHtml(m.leaf) + '">' + escapeHtml(m.path) + '</div>';
            });
            dd.innerHTML = ddHtml;
            dd.style.display = 'block';
        });
        inp.addEventListener('blur', function() {
            var idx = parseInt(this.dataset.idx);
            var dd = document.getElementById('knowledgeDropdown_' + idx);
            setTimeout(function() { if (dd) dd.style.display = 'none'; }, 200);
        });
        inp.addEventListener('focus', function() {
            if (this.value.trim()) this.dispatchEvent(new Event('input'));
        });
    });

    container.querySelectorAll('.knowledge-dropdown').forEach(function(dd) {
        dd.addEventListener('mousedown', function(e) {
            var item = e.target.closest('.knowledge-dropdown-item');
            if (!item) return;
            var idx = parseInt(item.dataset.idx);
            var leaf = item.dataset.leaf;
            if (parsedSelectedKnowledge[idx].indexOf(leaf) === -1) {
                parsedSelectedKnowledge[idx].push(leaf);
            }
            var tagsEl = document.getElementById('knowledgeTags_' + idx);
            if (tagsEl) {
                var fp = knowledgePathMap[leaf] || leaf;
                tagsEl.innerHTML += '<span class="knowledge-tag" data-leaf="' + escapeHtml(leaf) + '">' + escapeHtml(fp) + ' <span class="remove-tag" data-idx="' + idx + '" data-leaf="' + escapeHtml(leaf) + '">\u00d7</span></span>';
            }
            var inp = document.querySelector('.knowledge-search-input[data-idx="' + idx + '"]');
            if (inp) { inp.value = ''; inp.focus(); }
            dd.style.display = 'none';
        });
    });

    container.querySelectorAll('.remove-tag').forEach(function(el) {
        el.addEventListener('click', function(e) {
            e.stopPropagation();
            var idx = parseInt(this.dataset.idx);
            var leaf = this.dataset.leaf;
            var pos = parsedSelectedKnowledge[idx].indexOf(leaf);
            if (pos !== -1) parsedSelectedKnowledge[idx].splice(pos, 1);
            var tag = this.parentElement;
            if (tag.parentElement) tag.parentElement.removeChild(tag);
        });
    });
}

function addParsedToBank(idx) {
    var q = parsedQuestionsCache[idx];
    if (!q) return;

    var card = document.querySelector('.parsed-question-card[data-parse-idx="' + idx + '"]');
    if (!card) return;

    var sel = parsedSelectedKnowledge[idx] || [];
    var knowledge = sel.length > 0 ? sel[0] : '未分类';
    var difficulty = card.querySelector('.parsed-difficulty').value || 'medium';

    var remark = card.querySelector('.parsed-remark');
    var newQ = {
        id: nextId++,
        grade: q.meta && q.meta.grade ? q.meta.grade : '未分类',
        difficulty: difficulty,
        type: q.type,
        knowledge: knowledge,
        knowledgeList: sel.length > 0 ? sel.slice() : [],
        knowledgeCategory: 'algebra',
        year: q.meta && q.meta.year ? q.meta.year : new Date().getFullYear().toString(),
        question: q.question,
        options: q.options.map(function(o) { return { label: o.label, text: o.text }; }),
        answer: q.answer,
        solution: q.solution,
        meta: q.meta,
        source: q.source,
        remark: remark ? remark.value.trim() : ''
    };

    questionBank.push(newQ);
    saveQuestionBank();

    // Rebuild filter values after adding
    buildFilterValues();
    renderFilterBar();

    var btn = card.querySelector('.btn-add-to-bank');
    btn.innerHTML = '<span class="icon icon-check" aria-hidden="true"></span> 已添加';
    btn.disabled = true;
    btn.style.opacity = '0.6';
    btn.style.cursor = 'default';

    var msg = document.getElementById('addedQuestions');
    if (!msg) {
        msg = document.getElementById('parseResult');
        if (msg) {
            msg.innerHTML = '<span class="icon icon-check" aria-hidden="true"></span> 已成功添加至题库（未分类），当前题库共 ' + questionBank.length + ' 题';
            msg.style.color = '#67c23a';
        }
    }

    if (state.currentTab === 'question-bank') {
        applyFiltersAndRender();
    }
}

function addAllParsedToBank() {
    var input = document.getElementById('latexInput');
    if (input && input.value.trim()) {
        // Re-parse only if cache is empty or hasn't been parsed yet
        if (!parsedQuestionsCache || parsedQuestionsCache.length === 0) {
            parseLatexInput();
        }
    }
    var questions = parsedQuestionsCache;
    if (!questions || questions.length === 0) {
        var rs = document.getElementById('parseResult');
        if (rs) { rs.textContent = '没有可添加的题目'; rs.style.color = '#e6a23c'; }
        return;
    }
    var count = 0;
    questions.forEach(function(q, qi) {
        var sel = parsedSelectedKnowledge && parsedSelectedKnowledge[qi] && parsedSelectedKnowledge[qi].length > 0 ? parsedSelectedKnowledge[qi] : (q.knowledgeNames || []);
        var knowledge = sel.length > 0 ? sel[0] : '未分类';
        var newQ = {
            id: nextId++,
            grade: q.meta && q.meta.grade ? q.meta.grade : '未分类',
            difficulty: 'medium',
            type: q.type,
            knowledge: knowledge,
            knowledgeList: sel.length > 0 ? sel.slice() : [],
            knowledgeCategory: 'algebra',
            year: q.meta && q.meta.year ? q.meta.year : new Date().getFullYear().toString(),
            question: q.question,
            options: q.options ? q.options.map(function(o) { return { label: o.label, text: o.text }; }) : [],
            answer: q.answer || '',
            solution: q.solution || '',
            meta: q.meta || {},
            source: q.source,
            remark: ''
        };
        questionBank.push(newQ);
    saveQuestionBank();
        count++;
    });

    buildFilterValues();
    renderFilterBar();

    document.getElementById('latexInput').value = '';
    document.getElementById('parsePreview').innerHTML = '<div class="preview-placeholder"><div class="placeholder-icon"><span class="icon icon-document" aria-hidden="true"></span></div><p>粘贴 LaTeX 后自动解析</p></div>';
    document.getElementById('previewCount').textContent = '';
    var rs = document.getElementById('parseResult');
    if (rs) {
        rs.innerHTML = '<span class="icon icon-check" aria-hidden="true"></span> 已添加 ' + count + ' 题至题库，当前共 ' + questionBank.length + ' 题';
        rs.style.color = '#67c23a';
    }
    parsedQuestionsCache = [];
    if (state.currentTab === 'question-bank') applyFiltersAndRender();
}

// ========== Initialization ==========
document.addEventListener("DOMContentLoaded", function () {

    var si = document.getElementById("searchInput");
    if (si) {
        si.addEventListener("input", function () {
            state.searchQuery = this.value.trim();
            applyFiltersAndRender();
        });
    }

    // Knowledge folder toggle (L2/L3 expand/collapse) + filter
    document.querySelectorAll(".knowledge-folder").forEach(function (el) {
        el.addEventListener("click", function (e) {
            e.stopPropagation();
            var toggleId = this.getAttribute("data-toggle");
            if (!toggleId) return;
            var tgt = document.getElementById(toggleId);
            if (!tgt) return;
            var isHidden = tgt.classList.contains("hidden");
            if (isHidden) {
                tgt.classList.remove("hidden");
                this.classList.add("expanded");
            } else {
                tgt.classList.add("hidden");
                this.classList.remove("expanded");
            }
            // Filter questions by this node (including all descendants)
            if (this.dataset.knowledge) {
                setKnowledgeFilter(this.dataset.knowledge);
            }
        });
    });

    // Leaf knowledge item click (filter questions)
    document.querySelectorAll(".knowledge-item:not(.knowledge-folder)").forEach(function (el) {
        el.addEventListener("click", function () {
            setKnowledgeFilter(this.dataset.knowledge);
        });
    });

    // Category title click: toggle expand/collapse + filter
    document.querySelectorAll(".category-title").forEach(function (el) {
        el.addEventListener("click", function () {
            this.classList.toggle("collapsed");
            var tid = this.getAttribute("data-toggle");
            var tgt = document.getElementById(tid);
            if (tgt) tgt.classList.toggle("hidden");
            // Filter by category name
            if (this.dataset.toggle) {
                setKnowledgeFilter(this.dataset.toggle);
            }
        });
    });

    document.querySelectorAll(".nav-item").forEach(function (el) {
        el.addEventListener("click", function () {
            switchTab(this.dataset.tab);
        });
    });

    // Real-time parse for 录题中心 LaTeX input with debounce
    var latexInput = document.getElementById('latexInput');
    var parseTimer = null;
    if (latexInput) {
        latexInput.addEventListener('input', function () {
            if (parseTimer) clearTimeout(parseTimer);
            parseTimer = setTimeout(function() {
                parseLatexInput();
            }, 500);
        });
    }

    // Migrate: ensure all questions have the remark field
    questionBank.forEach(function(q) {
        if (q.remark === undefined) q.remark = '';
    });

    applyFiltersAndRender();

    // Build filter bar values
    buildFilterValues();
    renderFilterBar();
    initFilterEvents();
    initFilterToggle();

    // Build knowledge path map from DOM
    buildKnowledgePathMap();
});
