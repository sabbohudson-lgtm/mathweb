import os

content = r"""// ========== Global State ==========
const state = {
    currentTab: "question-bank",
    filters: { grade: "", difficulty: "", knowledge: "" },
    searchQuery: "",
    expandedSolutions: new Set()
};

// ========== Utility Functions ==========
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

function esc(text) {
    return text ? escapeHtml(text) : "";
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
}

// ========== Render Question Cards ==========
function renderQuestionCards(questions) {
    var container = document.getElementById("questionCards");
    if (!container) return;

    if (questions.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">\ud83d\udd0d</div><p>\u6ca1\u6709\u627e\u5230\u5339\u914d\u7684\u9898\u76ee</p></div>';
        updateQuestionCount(0);
        return;
    }

    var html = "";
    questions.forEach(function(q) {
        var diffClass = getDifficultyClass(q.difficulty);
        var diffText = getDifficultyText(q.difficulty);
        var isExpanded = state.expandedSolutions.has(q.id);
        var solutionDisplay = isExpanded ? "show" : "";
        var solutionArrow = isExpanded ? "\u25bc" : "\u25b6";

        var optionsHtml = "";
        if (q.options && q.options.length > 0) {
            optionsHtml = '<ul class="options-list">';
            q.options.forEach(function(opt) {
                var isCorrect = opt.label === q.answer;
                var style = isCorrect ? 'style="background:#f0f9eb;border-color:#e1f3d8;"' : '';
                optionsHtml += '<li ' + style + '><span class="option-label">' + esc(opt.label) + '</span>' + esc(opt.text) + '</li>';
            });
            optionsHtml += '</ul>';
        }

        var answerHtml = "";
        if (q.answer) {
            answerHtml = '<p><strong>\u7b54\u6848\uff1a</strong><span style="color:#67c23a;font-weight:600;">' + esc(q.answer) + '</span></p>';
        }

        var solutionHtml = "";
        if (q.solution) {
            solutionHtml = '<div class="solution-toggle" onclick="toggleSolution(' + q.id + ')"><span>' + solutionArrow + '</span> <span>\u67e5\u770b\u8be6\u7ec6\u89e3\u6790</span></div>';
            solutionHtml += '<div class="solution-content ' + solutionDisplay + '"><br>' + esc(q.solution).replace(/\n/g, "<br>") + '</div>';
        }

        html += '<div class="question-card" data-id="' + q.id + '">';
        html += '<div class="card-header"><div class="card-tags">';
        html += '<span class="tag tag-grade">' + esc(q.grade) + '</span>';
        html += '<span class="tag tag-difficulty ' + diffClass + '">' + diffText + '</span>';
        html += '<span class="tag tag-type">' + esc(q.type) + '</span>';
        html += '<span class="tag tag-knowledge">' + esc(q.knowledge) + '</span>';
        html += '</div><div class="card-meta"><span>\ud83d\udcc5 ' + esc(q.year || "") + '</span></div></div>';
        html += '<div class="card-body"><div class="question-text">' + esc(q.question) + '</div>';
        html += optionsHtml + answerHtml;
        html += '<div class="solution-section">' + solutionHtml + '</div></div></div>';
    });

    container.innerHTML = html;
    updateQuestionCount(questions.length);
    typesetMath(container);
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

// ========== Filter Logic ==========
function getFilteredQuestions() {
    var questions = Array.from(questionBank);
    if (state.filters.grade) {
        questions = questions.filter(function(q) { return q.grade === state.filters.grade; });
    }
    if (state.filters.difficulty) {
        questions = questions.filter(function(q) { return q.difficulty === state.filters.difficulty; });
    }
    if (state.filters.knowledge) {
        questions = questions.filter(function(q) { return q.knowledge === state.filters.knowledge; });
    }
    if (state.searchQuery) {
        var query = state.searchQuery.toLowerCase();
        questions = questions.filter(function(q) {
            return q.question.toLowerCase().includes(query) ||
                   q.knowledge.toLowerCase().includes(query) ||
                   (q.grade && q.grade.includes(query));
        });
    }
    return questions;
}

function applyFiltersAndRender() {
    var questions = getFilteredQuestions();
    renderQuestionCards(questions);
}

// ========== Knowledge Filter ==========
function setKnowledgeFilter(knowledge) {
    state.filters.knowledge = knowledge;
    document.querySelectorAll(".knowledge-item").forEach(function(el) {
        el.classList.toggle("active", el.dataset.knowledge === knowledge);
    });
    applyFiltersAndRender();
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
}

// ========== Paper Generation ==========
function generatePaper() {
    var container = document.getElementById("paperArea");
    if (!container) return;

    var easyCount = parseInt(document.getElementById("easyCount").value) || 0;
    var mediumCount = parseInt(document.getElementById("mediumCount").value) || 0;
    var hardCount = parseInt(document.getElementById("hardCount").value) || 0;

    var easyQs = questionBank.filter(function(q) { return q.difficulty === "easy"; });
    var mediumQs = questionBank.filter(function(q) { return q.difficulty === "medium"; });
    var hardQs = questionBank.filter(function(q) { return q.difficulty === "hard"; });

    function randomPick(arr, count) {
        var s = arr.slice().sort(function() { return Math.random() - 0.5; });
        return s.slice(0, Math.min(count, s.length));
    }

    var selected = randomPick(easyQs, easyCount).concat(randomPick(mediumQs, mediumCount)).concat(randomPick(hardQs, hardCount));

    if (selected.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">\u26a0\ufe0f</div><p>\u8bf7\u81f3\u5c11\u9009\u62e9\u4e00\u4e2a\u9898\u76ee\u6570\u91cf</p></div>';
        return;
    }

    var html = '<div class="paper-info">\u5df2\u53d6\u7b54 <strong>' + selected.length + '</strong> \u9053\u9898</div>';
    selected.forEach(function(q, i) {
        html += '<div class="paper-question"><span class="paper-q-num">' + (i + 1) + '.</span><span class="paper-q-text">' + esc(q.question) + '</span></div>';
    });

    container.innerHTML = html;
    typesetMath(container);
}

function printPaper() {
    var content = document.getElementById("paperArea").innerHTML;
    var win = window.open("", "_blank");
    var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>\u6253\u5370\u8bd5\u5377</title>';
    html += '<style>body{font-family:sans-serif;max-width:800px;margin:40px auto;padding:20px}';
    html += '.paper-question{margin:20px 0;page-break-inside:avoid}';
    html += '.paper-q-num{font-weight:bold;margin-right:8px}</style>';
    html += '</head><body><h1 style="text-align:center">\u6570\u5b66\u8bd5\u5377</h1>';
    html += content + '</body></html>';
    win.document.write(html);
    win.document.close();
    setTimeout(function () { win.print(); }, 2000);
}

// ========== Add Question ==========
var nextId = questionBank.length + 1;

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

    var c = document.getElementById("addedQuestions");
    var msg = '<div class="added-question-item">\u2705 \u9898\u76ee\u5df2\u6210\u529f\u6dfb\u52a0\uff01\u5f53\u524d\u9898\u5e93\u5171 ' + questionBank.length + ' \u9898</div>';
    c.innerHTML = msg + (c.innerHTML || "");

    document.getElementById("addQuestionForm").reset();

    if (state.currentTab === "question-bank") {
        applyFiltersAndRender();
    }

    return false;
}

// ========== Initialization ==========
document.addEventListener("DOMContentLoaded", function () {
    var btn = document.getElementById("applyFilter");
    if (btn) btn.addEventListener("click", applyFiltersAndRender);

    var gf = document.getElementById("gradeFilter");
    var df = document.getElementById("difficultyFilter");
    if (gf) gf.addEventListener("change", applyFiltersAndRender);
    if (df) df.addEventListener("change", applyFiltersAndRender);

    var si = document.getElementById("searchInput");
    if (si) {
        si.addEventListener("input", function () {
            state.searchQuery = this.value.trim();
            applyFiltersAndRender();
        });
    }

    document.querySelectorAll(".knowledge-item").forEach(function (el) {
        el.addEventListener("click", function () {
            setKnowledgeFilter(this.dataset.knowledge);
        });
    });

    document.querySelectorAll(".category-title").forEach(function (el) {
        el.addEventListener("click", function () {
            this.classList.toggle("collapsed");
            var tid = this.getAttribute("data-toggle");
            var tgt = document.getElementById(tid);
            if (tgt) tgt.classList.toggle("hidden");
        });
    });

    document.querySelectorAll(".nav-item").forEach(function (el) {
        el.addEventListener("click", function () {
            switchTab(this.dataset.tab);
        });
    });

    applyFiltersAndRender();
});
"""

with open(r"E:\LaTeXVScode\网页题库\js\app.js", "w", encoding="utf-8") as f:
    f.write(content)
print("OK, wrote", len(content), "chars")
