import io
import json
import pandas as pd
from bs4 import BeautifulSoup
import docx
import pypdf

def extract_text_from_bytes(file_bytes: bytes, file_name: str, mime_type: str) -> dict:
    """
    Extracts text from various file formats using the provided file bytes.
    Returns a dict with text, page_count, ocr_required, and extraction_successful.
    """
    file_ext = file_name.split('.')[-1].lower() if '.' in file_name else ''
    
    result = {
        "text": "",
        "pages": [],
        "page_count": 1,
        "ocr_required": False,
        "extraction_successful": False
    }
    
    try:
        if file_ext == 'pdf' or mime_type == 'application/pdf':
            pdf_data = _extract_pdf(file_bytes)
            result["text"] = pdf_data["text"]
            result["pages"] = pdf_data["pages"]
            result["page_count"] = pdf_data["page_count"]
            if not result["text"].strip():
                result["ocr_required"] = True
                
        elif file_ext in ['docx', 'doc'] or 'wordprocessingml' in mime_type:
            result["text"] = _extract_docx(file_bytes)
            
        elif file_ext == 'csv' or mime_type == 'text/csv':
            result["text"] = _extract_csv(file_bytes)
            
        elif file_ext in ['xlsx', 'xls'] or 'spreadsheetml' in mime_type:
            result["text"] = _extract_excel(file_bytes)
            
        elif file_ext in ['md', 'markdown'] or mime_type == 'text/markdown':
            result["text"] = file_bytes.decode('utf-8', errors='ignore')
            
        elif file_ext in ['html', 'htm'] or mime_type == 'text/html':
            result["text"] = _extract_html(file_bytes)
            
        elif file_ext == 'json' or mime_type == 'application/json':
            result["text"] = _extract_json(file_bytes)
            
        elif file_ext in ['png', 'jpg', 'jpeg', 'webp'] or 'image' in mime_type:
            result["ocr_required"] = True
            result["text"] = ""
            
        else:
            result["text"] = file_bytes.decode('utf-8', errors='ignore')
            
        result["text"] = result["text"].strip()
        if not result["pages"]:
            result["pages"] = [result["text"]] if result["text"] else []
        result["extraction_successful"] = len(result["text"]) > 0
        
        return result
            
    except Exception as e:
        # Don't fail completely on corrupt, return failed extraction
        result["extraction_successful"] = False
        return result

def _extract_pdf(file_bytes: bytes) -> dict:
    text = ""
    pages = []
    reader = pypdf.PdfReader(io.BytesIO(file_bytes))
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
            pages.append(page_text)
        else:
            pages.append("")
    return {"text": text.strip(), "pages": pages, "page_count": len(reader.pages)}

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
