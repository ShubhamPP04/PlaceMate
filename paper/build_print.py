"""Rebuild paper_print.html from the docx, binding each table to its caption
and forbidding page/column breaks inside the pair."""
import re
import subprocess

html = subprocess.run(
    ["pandoc", "-t", "html", "PlaceMate_Research_Paper.docx"],
    capture_output=True, text=True,
).stdout

body_start = html.index("<p>")
blocks = re.split(r"(?=<p>|<table)", html[body_start:])
title, rest = blocks[:5], "".join(blocks[5:])

# caption p1 + caption p2 + <table ...>...</table>  →  keep together
n = len(re.findall(
    r'(<p><span class="smallcaps">TABLE [IVX]+</span></p>\s*'
    r"<p>.*?</p>\s*<table[^>]*>.*?</table>)",
    rest, re.S,
))
rest = re.sub(
    r'(<p><span class="smallcaps">TABLE [IVX]+</span></p>\s*'
    r"<p>.*?</p>\s*<table[^>]*>.*?</table>)",
    r'<div style="break-inside: avoid;">\1</div>',
    rest, flags=re.S,
)
print(f"wrapped {n} table(s) in keep-together divs")
assert n == 2, "expected both tables to be wrapped"

# keep headings with what follows (docx equivalents use keepNext):
# subsection headings are italic-only paragraphs, section headings are
# smallcaps paragraphs that are not table captions
rest = re.sub(
    r"<p>(<em>(?:(?!</p>).)*</em>)</p>",
    r'<p style="break-after: avoid;">\1</p>',
    rest, flags=re.S,
)
rest = re.sub(
    r'<p>(<span class="smallcaps">(?!TABLE)(?:(?!</p>).)*</span>)</p>',
    r'<p style="break-after: avoid;">\1</p>',
    rest, flags=re.S,
)

css = """
<style>
  @page { size: letter; margin: 0.75in; }
  body { font-family: 'Times New Roman', serif; font-size: 10pt; text-align: justify;
         columns: 2; column-gap: 0.3in; margin: 0; }
  .head { column-span: all; text-align: center; margin-bottom: 14pt; }
  .head p { margin: 2pt 0; text-align: center; }
  .head p:first-child { font-weight: bold; font-size: 18pt; margin-bottom: 8pt; }
  table { border-collapse: collapse; margin: 6pt auto; font-size: 8.5pt; width: 100%;
          break-inside: avoid; }
  td, th { border: 0.5pt solid #666; padding: 2pt 4pt; text-align: center; }
</style>
"""
doc = (
    "<!doctype html><html><head><meta charset='utf-8'>" + css + "</head><body>"
    "<div class='head'>" + "".join(title) + "</div>" + rest + "</body></html>"
)
open("paper_print.html", "w").write(doc)
print("paper_print.html written")
