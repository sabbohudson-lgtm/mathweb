/*
 * 题库数据 - 从 localStorage 持久化加载
 */
var _stored = null;
try {
    _stored = localStorage.getItem('math_question_bank');
} catch(e) {}

const questionBank = _stored ? JSON.parse(_stored) : [];

// 自动保存函数
function saveQuestionBank() {
    try {
        localStorage.setItem('math_question_bank', JSON.stringify(questionBank));
    } catch(e) {
        console.warn('localStorage 写入失败:', e);
    }
}
