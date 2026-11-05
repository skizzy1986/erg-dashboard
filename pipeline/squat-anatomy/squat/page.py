"""Concatenate the page sources into the template the build fills with data (was page/assemble.py)."""
from pathlib import Path

PARTS = ['1-head.html', '2-markup.html', '3-core.js', '4-ui.js']


def assemble_template(page_dir):
    D = Path(page_dir)
    return ''.join((D / p).read_text(encoding='utf-8') + ('\n' if p == '3-core.js' else '') for p in PARTS)
