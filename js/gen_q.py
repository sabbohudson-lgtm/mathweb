import os
D = chr(36)
BS = chr(92)
lines = []
lines.append(chr(47)+chr(42))
lines.append(' * \u9898\u5e93\u6570\u636e')
lines.append(chr(42)+chr(47))
lines.append('const questionBank = [')

def mk(i, g, d, t, k, c, y, q, opts, a, s):
    ol = []
    if opts:
        for x in opts:
            ol.append(chr(123)+' label: '+chr(34)+x['l']+chr(34)+', text: '+chr(34)+x['t'].replace(chr(36),D).replace(chr(92),chr(92)+chr(92)))
    os2 = ', '.join(ol)
    q2 = q.replace(chr(36),D).replace(chr(92),chr(92)+chr(92))
    s2 = s.replace(chr(36),D).replace(chr(92),chr(92)+chr(92))
    return '    { id: '+str(i)+', grade: '+chr(34)+g+chr(34)+', difficulty: '+chr(34)+d+chr(34)+', type: '+chr(34)+t+chr(34)+', knowledge: '+chr(34)+k+chr(34)+', knowledgeCategory: '+chr(34)+c+chr(34)+', year: '+chr(34)+y+chr(34)+', question: '+chr(34)+q2+chr(34)+', options: ['+os2+'], answer: '+chr(34)+a+chr(34)+', solution: '+chr(34)+s2+chr(34)+' }'

# Build question with proper escaping
bs = chr(92)
q1 = '已知椭圆 '+D+'C: '+D+bs+'frac{x^2}{a^2} + '+D+bs+'frac{y^2}{b^2} = 1 '+D+bs+';(a > b > 0)'+D+' 的右焦点为 '+D+'F'+D+', 上顶点为 '+D+'B'+D+', 若 '+D+bs+'triangle BFO'+D+' 为等边三角形, 则椭圆 '+D+'C'+D+' 的离心率为\uff08\u3000\u3000\uff09'
o1 = [{'l':'A','t':D+bs+'frac{1}{2}'+D},{'l':'B','t':D+bs+'frac{'+bs+'sqrt{2}}{2}'+D},{'l':'C','t':D+bs+'frac{'+bs+'sqrt{3}}{2}'+D},{'l':'D','t':D+bs+'frac{'+bs+'sqrt{5}-1}{2}'+D}]
s1 = '由题意, '+D+bs+'triangle BFO'+D+' 为等边三角形, 故 '+D+'b = c'+D+'. '
lines.append(mk(1, '\u9ad8\u4e09', 'hard', '\u591a\u9009\u9898', '\u89e3\u6790\u51e0\u4f55', 'geometry', '2024', q1, o1, 'C', s1))

lines.append('];')

path = r'E:\\LaTeXVScode\\网页题库\\js\\questions.js'
with open(path, 'w', encoding='utf-8') as f:
    f.write(chr(10).join(lines))
print('OK')
