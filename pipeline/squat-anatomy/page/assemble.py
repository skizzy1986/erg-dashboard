"""Write page/template.html from the page sources: python3 page/assemble.py.

`python -m squat build` assembles the template in memory, so the build no longer needs this file.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from squat.page import assemble_template  # noqa: E402

D = Path(__file__).parent
html = assemble_template(D)
(D / 'template.html').write_text(html, encoding='utf-8')
print('wrote page/template.html', len(html), 'chars')
