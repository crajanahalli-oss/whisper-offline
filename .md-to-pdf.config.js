module.exports = {
  pdf_options: {
    format: 'A4',
    margin: {
      top: '20mm',
      right: '20mm',
      bottom: '20mm',
      left: '20mm'
    },
    printBackground: true,
    preferCSSPageSize: true
  },
  stylesheet: `
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #333;
      max-width: 100%;
    }

    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
      margin-top: 30px;
      page-break-after: avoid;
    }

    h2 {
      color: #34495e;
      border-bottom: 2px solid #95a5a6;
      padding-bottom: 8px;
      margin-top: 25px;
      page-break-after: avoid;
    }

    h3 {
      color: #34495e;
      margin-top: 20px;
      page-break-after: avoid;
    }

    h4, h5 {
      color: #7f8c8d;
      margin-top: 15px;
      page-break-after: avoid;
    }

    pre {
      background-color: #f8f9fa;
      border: 1px solid #dee2e6;
      border-left: 4px solid #3498db;
      border-radius: 4px;
      padding: 12px;
      overflow-x: auto;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 9pt;
      line-height: 1.4;
      page-break-inside: avoid;
      margin: 15px 0;
      white-space: pre-wrap;
      word-wrap: break-word;
      max-width: 100%;
    }

    code {
      background-color: #f8f9fa;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 90%;
      color: #e74c3c;
    }

    pre code {
      background-color: transparent;
      padding: 0;
      color: #333;
    }

    table {
      border-collapse: collapse;
      width: 100%;
      margin: 15px 0;
      page-break-inside: avoid;
      font-size: 10pt;
    }

    th {
      background-color: #3498db;
      color: white;
      padding: 10px;
      text-align: left;
      font-weight: 600;
    }

    td {
      border: 1px solid #ddd;
      padding: 8px;
    }

    tr:nth-child(even) {
      background-color: #f8f9fa;
    }

    blockquote {
      border-left: 4px solid #3498db;
      padding-left: 15px;
      margin: 15px 0;
      color: #555;
      font-style: italic;
      background-color: #f8f9fa;
      padding: 10px 15px;
    }

    ul, ol {
      margin: 10px 0;
      padding-left: 25px;
    }

    li {
      margin: 5px 0;
    }

    strong {
      color: #2c3e50;
      font-weight: 600;
    }

    hr {
      border: none;
      border-top: 2px solid #e0e0e0;
      margin: 25px 0;
    }

    @media print {
      body {
        font-size: 10pt;
      }

      pre {
        page-break-inside: avoid;
      }

      h1, h2, h3, h4, h5, h6 {
        page-break-after: avoid;
      }

      table {
        page-break-inside: avoid;
      }
    }
  `,
  body_class: 'markdown-body'
};
