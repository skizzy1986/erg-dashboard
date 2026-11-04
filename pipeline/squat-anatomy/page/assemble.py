"""Concatenate the page sources into the template that pipeline/v3/build3.py fills with data.
Usage: python3 page/assemble.py  ->  page/template.html"""
import os
D = os.path.dirname(os.path.abspath(__file__))
parts = ['1-head.html', '2-markup.html', '3-core.js', '4-ui.js']
html = ''.join(open(os.path.join(D, p), encoding='utf-8').read() + ('\n' if p == '3-core.js' else '') for p in parts)
open(os.path.join(D, 'template.html'), 'w', encoding='utf-8').write(html)
print('wrote page/template.html', len(html), 'chars')
