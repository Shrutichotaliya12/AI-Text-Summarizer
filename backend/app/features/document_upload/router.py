import time
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, File, UploadFile, HTTPException, status, Depends
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.shared.database import get_db
from app.shared.models import Document, ActivityLog, UserSettings, DocumentChunk
from app.features.authentication.router import get_current_user, User
from app.features.notifications.router import create_notification
from app.utils.semantic_search import split_into_chunks
from app.utils.document_parser import extract_text_from_bytes

router = APIRouter()

class UrlRequest(BaseModel):
    url: str
    type: str # "web" or "youtube"

class DocumentUpdatePayload(BaseModel):
    name: str = None
    display_name: str = None
    tags: str = None
    notes: str = None
    is_favorite: bool = None
    text: str = None



@router.post("/")
async def upload_document(
    file: UploadFile = File(...), 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    filename = file.filename
    contents = await file.read()
    
    # 1. Validation: Max size 10MB
    MAX_FILE_SIZE = 10 * 1024 * 1024
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds the maximum limit of 10MB."
        )
        
    # 2. Validation: Empty file
    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes)."
        )
        
    size_mb = len(contents) / (1024 * 1024)
    size_str = f"{size_mb:.2f} MB" if size_mb > 0.9 else f"{len(contents)/1024:.0f} KB"
    
    # 3. Validation: Duplicate upload detection
    existing = db.query(Document).filter(
        Document.user_id == current_user.id,
        Document.name == filename,
        Document.size == size_str,
        Document.deleted_at == None
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A document with this name and size has already been uploaded."
        )

    # 4. Text extraction & type check
    allowed_exts = ["pdf", "docx", "doc", "txt", "csv", "xls", "xlsx", "md", "html", "json", "png", "jpg", "jpeg", "webp"]
    ext = filename.split(".")[-1].lower() if "." in filename else "txt"
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format .{ext}. Supported formats are {', '.join(allowed_exts)}"
        )

    text = ""
    pages = 1
    
    try:
        mime_type = file.content_type or ""
        text = extract_text_from_bytes(contents, filename, mime_type)
        if ext == "pdf":
            pages = max(1, len(text) // 1500)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to extract text. The file may be corrupted or unreadable."
        )


    word_count = len(text.split())
    char_count = len(text)
    
    new_doc = Document(
        user_id=current_user.id,
        name=filename,
        display_name=filename,
        text=text,
        size=size_str,
        type=ext,
        word_count=word_count,
        char_count=char_count,
        upload_time=new_date_str(),
        last_modified=datetime.now(timezone.utc).replace(tzinfo=None),
        status="ready",
        page_count=pages,
        original_file_bytes=contents,
        is_favorite=False
    )
    
    db.add(new_doc)
    
    # Log activity and notification
    log = ActivityLog(user_id=current_user.id, action="DOCUMENT_UPLOAD", details=f"Uploaded file {filename}")
    db.add(log)
    create_notification(db, current_user.id, f"Document {filename} uploaded successfully")
    
    db.commit()
    db.refresh(new_doc)
    
    # Store text chunks for semantic indexing
    chunks_data = split_into_chunks(text, filename)
    for c_data in chunks_data:
        db_chunk = DocumentChunk(
            document_id=new_doc.id,
            chunk_index=c_data["chunk_index"],
            text=c_data["text"],
            page_number=c_data["page_number"]
        )
        db.add(db_chunk)
    db.commit()
    
    return {
        "status": "success",
        "id": new_doc.id,
        "filename": new_doc.name,
        "size": new_doc.size,
        "word_count": new_doc.word_count,
        "text": new_doc.text
    }

@router.post("/scrape")
def scrape_url(
    payload: UrlRequest, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not payload.url.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL string cannot be empty."
        )

    domain = payload.url.replace("https://", "").replace("http://", "").split("/")[0]
    
    if payload.type == "youtube":
        text = f"[Transcribed YouTube Video: {payload.url}]\nWelcome back to another lecture. Today we discuss deep neural network embeddings."
        doc_name = f"YT Video: {domain}"
        doc_type = "youtube"
    else:
        text = f"[Scraped Webpage: {payload.url}]\nArticle title: Production AI deployment frameworks.\nTransformers are highly scalable."
        doc_name = f"Web Scrape: {domain}"
        doc_type = "web"

    word_count = len(text.split())
    char_count = len(text)
    
    new_doc = Document(
        user_id=current_user.id,
        name=doc_name,
        display_name=doc_name,
        text=text,
        size="N/A",
        type=doc_type,
        word_count=word_count,
        char_count=char_count,
        upload_time=new_date_str(),
        last_modified=datetime.now(timezone.utc).replace(tzinfo=None),
        status="ready",
        page_count=1,
        is_favorite=False
    )
    
    db.add(new_doc)
    
    log = ActivityLog(user_id=current_user.id, action="URL_SCRAPE", details=f"Scraped URL {payload.url}")
    db.add(log)
    create_notification(db, current_user.id, f"Document from scraped URL {domain} created successfully")
    
    db.commit()
    db.refresh(new_doc)

    # Store text chunks for web scrape semantic indexing
    chunks_data = split_into_chunks(text, doc_name)
    for c_data in chunks_data:
        db_chunk = DocumentChunk(
            document_id=new_doc.id,
            chunk_index=c_data["chunk_index"],
            text=c_data["text"],
            page_number=c_data["page_number"]
        )
        db.add(db_chunk)
    db.commit()

    return {
        "status": "success",
        "id": new_doc.id,
        "url": payload.url,
        "word_count": new_doc.word_count,
        "text": new_doc.text
    }

@router.get("/document/{doc_id}")
def get_single_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch a single document with its full extracted text."""
    doc = db.query(Document).filter(
        Document.id == doc_id,
        Document.user_id == current_user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {
        "id": doc.id,
        "name": doc.name,
        "display_name": doc.display_name or doc.name,
        "size": doc.size,
        "type": doc.type,
        "wordCount": doc.word_count,
        "charCount": doc.char_count,
        "text": doc.text or "",
        "uploadTime": doc.upload_time,
        "lastModified": doc.last_modified.isoformat() if doc.last_modified else doc.upload_time,
        "status": doc.status,
        "tags": doc.tags.split(",") if doc.tags else [],
        "notes": doc.notes or "",
        "pageCount": doc.page_count,
        "isFavorite": doc.is_favorite,
    }

@router.get("/")

def get_user_documents(
    search: str = None,
    filter_type: str = None,
    page: int = 1,
    page_size: int = 12,
    sort_by: str = "upload_time",
    sort_order: str = "desc",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Document).filter(Document.user_id == current_user.id, Document.deleted_at == None)
    
    # 1. Search filter
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Document.name.ilike(search_pattern)) |
            (Document.tags.ilike(search_pattern)) |
            (Document.text.ilike(search_pattern))
        )
        
    # 2. File Type / Preferences filters
    if filter_type:
        if filter_type == "pdf":
            query = query.filter(Document.type == "pdf")
        elif filter_type == "docx":
            query = query.filter(Document.type == "docx")
        elif filter_type == "txt":
            query = query.filter(Document.type.in_(["txt", "md"]))
        elif filter_type == "favorites":
            query = query.filter(Document.is_favorite == True)
        elif filter_type == "large":
            query = query.filter(Document.size.like("% MB"))
        elif filter_type == "recent_upload":
            cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=1)
            query = query.filter(Document.last_modified >= cutoff)
            
    # 3. Sorting mappings
    sort_attr = sort_by
    if sort_by == "uploadTime" or sort_by == "upload_time":
        sort_attr = "upload_time"
    elif sort_by == "lastModified":
        sort_attr = "last_modified"
    elif sort_by == "wordCount":
        sort_attr = "word_count"
    elif sort_by == "name":
        sort_attr = "name"
        
    sort_col = getattr(Document, sort_attr, Document.upload_time)
    if sort_order == "desc":
        query = query.order_by(sort_col.desc())
    else:
        query = query.order_by(sort_col.asc())
        
    total_count = query.count()
    
    # 4. Pagination offset
    offset = (page - 1) * page_size
    docs = query.offset(offset).limit(page_size).all()
    
    return {
        "documents": [
            {
                "id": d.id,
                "name": d.name,
                "display_name": d.display_name or d.name,
                "size": d.size,
                "type": d.type,
                "wordCount": d.word_count,
                "charCount": d.char_count,
                "uploadTime": d.upload_time,
                "lastModified": d.last_modified.isoformat() if d.last_modified else d.upload_time,
                "status": d.status,
                "tags": d.tags.split(",") if d.tags else [],
                "notes": d.notes or "",
                "pageCount": d.page_count,
                "isFavorite": d.is_favorite
            }
            for d in docs
        ],
        "total_count": total_count,
        "page": page,
        "page_size": page_size
    }

@router.put("/{doc_id}")
def update_user_document(
    doc_id: str,
    payload: DocumentUpdatePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
        
    if payload.name is not None:
        doc.name = payload.name
    if payload.display_name is not None:
        doc.display_name = payload.display_name
    if payload.tags is not None:
        doc.tags = payload.tags
    if payload.notes is not None:
        doc.notes = payload.notes
    if payload.is_favorite is not None:
        doc.is_favorite = payload.is_favorite
    if payload.text is not None:
        doc.text = payload.text
        doc.word_count = len(payload.text.split())
        doc.char_count = len(payload.text)
        
    doc.last_modified = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(doc)
    
    return {
        "status": "success", 
        "message": "Document updated successfully.",
        "document": {
            "id": doc.id,
            "name": doc.name,
            "display_name": doc.display_name or doc.name,
            "tags": doc.tags.split(",") if doc.tags else [],
            "notes": doc.notes or "",
            "isFavorite": doc.is_favorite
        }
    }

@router.delete("/{doc_id}")
def delete_user_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
        
    doc.deleted_at = datetime.now(timezone.utc).replace(tzinfo=None)
    
    log = ActivityLog(user_id=current_user.id, action="DOCUMENT_DELETE", details=f"Soft-deleted document {doc.name}")
    db.add(log)
    
    db.commit()
    return {"status": "success", "message": "Document moved to Trash."}

@router.get("/trash")
def get_trash_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Auto-cleanup based on UserSettings trash_clear_days
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    clear_days = user_settings.trash_clear_days if (user_settings and user_settings.trash_clear_days is not None) else 30
    cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=clear_days)
    db.query(Document).filter(Document.user_id == current_user.id, Document.deleted_at < cutoff).delete()
    db.commit()

    docs = db.query(Document).filter(Document.user_id == current_user.id, Document.deleted_at != None).all()
    return {
        "documents": [
            {
                "id": d.id,
                "name": d.name,
                "size": d.size,
                "type": d.type,
                "wordCount": d.word_count,
                "charCount": d.char_count,
                "uploadTime": d.upload_time,
                "deletedAt": d.deleted_at.isoformat() if d.deleted_at else ""
            }
            for d in docs
        ]
    }

@router.delete("/trash/empty")
def empty_trash_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.query(Document).filter(Document.user_id == current_user.id, Document.deleted_at != None).delete()
    db.commit()
    return {"status": "success", "message": "Recycle bin emptied successfully."}

@router.post("/{doc_id}/restore")
def restore_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    
    doc.deleted_at = None
    log = ActivityLog(user_id=current_user.id, action="DOCUMENT_RESTORE", details=f"Restored document {doc.name}")
    db.add(log)
    db.commit()
    return {"status": "success", "message": "Document restored successfully."}

@router.delete("/{doc_id}/permanent")
def permanently_delete_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    
    db.delete(doc)
    log = ActivityLog(user_id=current_user.id, action="DOCUMENT_PERMANENT_DELETE", details=f"Permanently deleted document {doc.name}")
    db.add(log)
    db.commit()
    return {"status": "success", "message": "Document permanently deleted."}

@router.get("/{doc_id}/download")
def download_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    media_types = {
        "pdf": "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "txt": "text/plain",
        "md": "text/markdown"
    }
    content_type = media_types.get(doc.type.lower(), "application/octet-stream")
    
    data = doc.original_file_bytes if doc.original_file_bytes else doc.text.encode("utf-8", errors="ignore")
    
    return Response(
        content=data,
        media_type=content_type,
        headers={"Content-Disposition": f"attachment; filename={doc.name}"}
    )

def new_date_str():
    return time.strftime("%Y-%m-%d %H:%M:%S")
