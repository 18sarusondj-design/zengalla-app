import re

with open('Frontend/src/features/customer/pages/Checkout.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

div_starts = len(re.findall(r'<div', content))
div_ends = len(re.findall(r'</div', content))
form_starts = len(re.findall(r'<form', content))
form_ends = len(re.findall(r'</form', content))
frag_starts = len(re.findall(r'<>', content))
frag_ends = len(re.findall(r'</>', content))

print(f"div: {div_starts} / {div_ends}")
print(f"form: {form_starts} / {form_ends}")
print(f"frag: {frag_starts} / {frag_ends}")
