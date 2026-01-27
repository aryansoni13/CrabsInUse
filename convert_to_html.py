#!/usr/bin/env python3
import re
import html
from datetime import datetime

def md_to_html(text):
    """Convert markdown to HTML with proper formatting"""
    # Escape HTML first
    text = html.escape(text)
    
    # Headers
    text = re.sub(r'^# (.+)$', r'<h1>\1</h1>', text, flags=re.MULTILINE)
    text = re.sub(r'^## (.+)$', r'<h2>\1</h2>', text, flags=re.MULTILINE)
    text = re.sub(r'^### (.+)$', r'<h3>\1</h3>', text, flags=re.MULTILINE)
    text = re.sub(r'^#### (.+)$', r'<h4>\1</h4>', text, flags=re.MULTILINE)
    
    # Bold text
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    
    # Code blocks
    text = re.sub(r'```(\w+)?\n(.*?)\n```', r'<pre><code>\2</code></pre>', text, flags=re.DOTALL)
    
    # Inline code
    text = re.sub(r'`([^`]+)`', r'<code>\1</code>', text)
    
    # Process lists
    lines = text.split('\n')
    result_lines = []
    in_list = False
    
    for line in lines:
        if re.match(r'^- ', line):
            if not in_list:
                result_lines.append('<ul>')
                in_list = True
            result_lines.append(f'<li>{line[2:]}</li>')
        else:
            if in_list:
                result_lines.append('</ul>')
                in_list = False
            result_lines.append(line)
    
    if in_list:
        result_lines.append('</ul>')
    
    text = '\n'.join(result_lines)
    
    # Convert line breaks to paragraphs
    paragraphs = text.split('\n\n')
    html_paragraphs = []
    for p in paragraphs:
        p = p.strip()
        if p and not p.startswith('<'):
            p = f'<p>{p}</p>'
        html_paragraphs.append(p)
    
    return '\n\n'.join(html_paragraphs)

def create_html_document():
    # Read the markdown file
    md_file = '/home/shivay/Desktop/Dev/Crabs/CRABS_PRD.md'
    with open(md_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    html_body = md_to_html(content)
    
    # Create complete HTML document
    html_content = f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>CRABS Construction ERP System - PRD</title>
    <style>
        @page {{
            size: A4;
            margin: 2cm;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
            max-width: none;
            margin: 0;
            padding: 0;
        }}
        .container {{
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }}
        h1 {{
            color: #1e40af;
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 10px;
            margin-top: 40px;
            page-break-before: always;
        }}
        h1:first-child {{
            margin-top: 0;
            page-break-before: auto;
        }}
        h2 {{
            color: #1e40af;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 8px;
            margin-top: 35px;
            margin-bottom: 20px;
        }}
        h3 {{
            color: #374151;
            margin-top: 30px;
            margin-bottom: 15px;
        }}
        h4 {{
            color: #4b5563;
            margin-top: 25px;
            margin-bottom: 12px;
        }}
        p {{
            margin: 12px 0;
            text-align: justify;
        }}
        ul, ol {{
            margin: 15px 0;
            padding-left: 30px;
        }}
        li {{
            margin: 8px 0;
        }}
        code {{
            background: #f1f5f9;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
            font-size: 0.9em;
            color: #e11d48;
        }}
        pre {{
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            overflow-x: auto;
            margin: 20px 0;
        }}
        pre code {{
            background: none;
            padding: 0;
            color: #1f2937;
        }}
        strong {{
            color: #1f2937;
            font-weight: 600;
        }}
        .header {{
            text-align: center;
            margin-bottom: 40px;
            padding: 30px 0;
            border-bottom: 4px solid #3b82f6;
        }}
        .header h1 {{
            margin: 0;
            font-size: 2.5em;
            color: #1e40af;
            border: none;
            page-break-before: auto;
        }}
        .header p {{
            margin: 10px 0 0 0;
            font-size: 1.2em;
            color: #6b7280;
        }}
        .footer {{
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 0.9em;
        }}
        @media print {{
            body {{ margin: 0; }}
            .container {{ padding: 0; }}
            h1 {{ page-break-before: always; }}
            h1:first-child {{ page-break-before: auto; }}
            .no-print {{ display: none; }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>CRABS Construction ERP System</h1>
            <p>Product Requirements Document (PRD)</p>
            <p style="font-size: 1em; margin-top: 15px;">Version 1.0 • November 14, 2024</p>
        </div>
        {html_body}
        <div class="footer">
            <p>Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}</p>
            <p>CRABS Construction ERP System - Product Requirements Document</p>
        </div>
    </div>
</body>
</html>'''
    
    # Write HTML file
    html_file = '/home/shivay/Desktop/Dev/Crabs/CRABS_PRD.html'
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print(f'Professional HTML file created: {html_file}')
    print('Open this file in Chrome/Firefox and use Print -> Save as PDF for best results')
    return html_file

if __name__ == '__main__':
    create_html_document()