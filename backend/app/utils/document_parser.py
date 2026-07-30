import io
import json
import pandas as pd
from bs4 import BeautifulSoup
import docx
import pypdf

def extract_text_from_bytes(file_bytes: bytes, file_name: str, mime_type: str) -> str:
    """
    Extracts text from various file formats using the provided file bytes.
    """
    file_ext = file_name.split('.')[-1].lower() if '.' in file_name else ''
    
    try:
        if file_ext == 'pdf' or mime_type == 'application/pdf':
            return _extract_pdf(file_bytes)
        
        elif file_ext in ['docx', 'doc'] or 'wordprocessingml' in mime_type:
            return _extract_docx(file_bytes)
            
        elif file_ext == 'csv' or mime_type == 'text/csv':
            return _extract_csv(file_bytes)
            
        elif file_ext in ['xlsx', 'xls'] or 'spreadsheetml' in mime_type:
            return _extract_excel(file_bytes)
            
        elif file_ext in ['md', 'markdown'] or mime_type == 'text/markdown':
            # Markdown text is essentially raw text
            return file_bytes.decode('utf-8', errors='ignore')
            
        elif file_ext in ['html', 'htm'] or mime_type == 'text/html':
            return _extract_html(file_bytes)
            
        elif file_ext == 'json' or mime_type == 'application/json':
            return _extract_json(file_bytes)
            
        elif file_ext in ['png', 'jpg', 'jpeg', 'webp'] or 'image' in mime_type:
            return "Image File (Text extraction not supported currently)"
            
        else:
            # Fallback to plain text
            return file_bytes.decode('utf-8', errors='ignore')
            
    except Exception as e:
        raise ValueError(f"Failed to extract text from {file_name}: {str(e)}")

def _extract_pdf(file_bytes: bytes) -> str:
    text = ""
    reader = pypdf.PdfReader(io.BytesIO(file_bytes))
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
    return text.strip()

def _extract_docx(file_bytes: bytes) -> str:
    doc = docx.Document(io.BytesIO(file_bytes))
    return "\n".join([para.text for para in doc.paragraphs])

def _extract_csv(file_bytes: bytes) -> str:
    df = pd.read_csv(io.BytesIO(file_bytes))
    return df.to_string(index=False)

def _extract_excel(file_bytes: bytes) -> str:
    df = pd.read_excel(io.BytesIO(file_bytes))
    return df.to_string(index=False)

def _extract_html(file_bytes: bytes) -> str:
    soup = BeautifulSoup(file_bytes.decode('utf-8', errors='ignore'), 'html.parser')
    return soup.get_text(separator=' ', strip=True)

def _extract_json(file_bytes: bytes) -> str:
    data = json.loads(file_bytes.decode('utf-8', errors='ignore'))
    return json.dumps(data, indent=2)
