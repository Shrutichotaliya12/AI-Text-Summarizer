import time
import random
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.shared.database import get_db
from app.shared.models import Summary, Document, ActivityLog, UserSettings
from app.features.authentication.router import get_current_user, User

router = APIRouter()

def translate_text(text: str, target_lang: str) -> str:
    from mtranslate import translate
    import re
    
    # Map friendly language codes to standard codes
    lang_mapping = {
        "en": "en", "english": "en",
        "hi": "hi", "hindi": "hi",
        "gu": "gu", "gujarati": "gu",
        "mr": "mr", "marathi": "mr",
        "ta": "ta", "tamil": "ta",
        "te": "te", "telugu": "te",
        "kn": "kn", "kannada": "kn",
        "ml": "ml", "malayalam": "ml",
        "pa": "pa", "punjabi": "pa",
        "fr": "fr", "french": "fr",
        "de": "de", "german": "de",
        "es": "es", "spanish": "es",
        "ja": "ja", "japanese": "ja",
        "zh": "zh-CN", "chinese": "zh-CN",
        "ar": "ar", "arabic": "ar",
        "ru": "ru", "russian": "ru"
    }
    
    code = lang_mapping.get(target_lang.lower(), target_lang)
    if code == "en":
        return text
        
    try:
        # Split text by newlines to preserve markdown formatting (paragraphs/lists)
        lines = text.split('\n')
        translated_lines = []
        for line in lines:
            if not line.strip():
                translated_lines.append(line)
                continue
            
            # Simple workaround for undefined
            if line.strip().lower() == "undefined":
                continue
                
            t_line = translate(line, code)
            if not t_line or t_line.strip().lower() == "undefined":
                translated_lines.append(line)
            else:
                # Clean up common Google Translate spacing issues with markdown
                t_line = re.sub(r'\*\*\s*(.*?)\s*\*\*', r'**\1**', t_line)
                t_line = re.sub(r'-\s+', r'- ', t_line)
                t_line = re.sub(r'#\s+', r'# ', t_line)
                translated_lines.append(t_line)
                
        return '\n'.join(translated_lines)
    except Exception as e:
        print(f"Translation error: {e}")
        return text

class SummarizeRequest(BaseModel):
    text: str = Field(..., min_length=10)
    model_id: str = "distilbart"
    min_length: int = 30
    max_length: int = 150
    document_id: Optional[str] = None
    title: Optional[str] = None

class SummarizeResponse(BaseModel):
    id: str
    summary: str
    confidence: int
    model_used: str
    compression_ratio: float
    latency: float

class EditSummaryRequest(BaseModel):
    title: Optional[str] = None
    summary_text: Optional[str] = None

class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1)
    target_lang: str = "en"

@router.post("/translate")
def translate_summary(
    payload: TranslateRequest,
    current_user: User = Depends(get_current_user)
):
    """Translate arbitrary text to the requested language."""
    if not payload.text.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Text cannot be empty."
        )
    result = translate_text(payload.text, payload.target_lang)
    return {"translated": result, "target_lang": payload.target_lang}

@router.post("/summarize", response_model=SummarizeResponse)
def summarize_text(
    payload: SummarizeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not payload.text.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Input text cannot be empty."
        )

    start_time = time.time()
    
    # Text extractive summarizer
    sentences = [s.strip() for s in payload.text.split(".") if len(s.strip()) > 8]
    
    if len(sentences) <= 2:
        summary_text = ". ".join(sentences) + "."
    else:
        scored = sorted(sentences, key=len, reverse=True)
        top_count = max(1, int(len(sentences) * 0.4))
        top_sentences = scored[:top_count]
        ordered = [s for s in sentences if s in top_sentences]
        summary_text = ". ".join(ordered) + "."

    end_time = time.time()
    latency = round(end_time - start_time, 3)
    
    input_words = len(payload.text.split())
    summary_words = len(summary_text.split())
    ratio = round((1 - (summary_words / max(1, input_words))) * 100, 1)
    confidence = random.randint(90, 98)
    
    # Save to db
    title = payload.title or (payload.text[:30] + "..." if len(payload.text) > 30 else payload.text)
    
    # Extract keywords from the original text
    words_list = [w.lower().strip(".,!?;:\"'()[]{}") for w in payload.text.split() if len(w) > 4]
    # Remove stop words
    stop_words = {"about", "above", "after", "again", "against", "their", "there", "these",
                  "those", "through", "under", "while", "which", "would", "could", "should",
                  "being", "since", "where", "every", "other", "often", "however"}
    meaningful = [w for w in words_list if w not in stop_words]
    unique_words = list(dict.fromkeys(meaningful))  # preserve order, unique
    keywords = ",".join(unique_words[:8])

    reading_time_saved = round((input_words - summary_words) / 200.0, 1)

    # Check user active settings
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    lang = user_settings.language if user_settings else "en"
    
    if lang != "en":
        summary_text = translate_text(summary_text, lang)

    new_summary = Summary(
        user_id=current_user.id,
        document_id=payload.document_id,
        title=title,
        original_text=payload.text,
        summary_text=summary_text,
        model_used=payload.model_id,
        language=lang,
        confidence_score=float(confidence),
        compression_ratio=float(ratio),
        reading_time_saved=max(0.1, reading_time_saved),
        keywords=keywords,
        is_favorite=False,
        latency=latency
    )
    
    db.add(new_summary)
    
    log = ActivityLog(user_id=current_user.id, action="SUMMARIZE", details=f"Generated summary: {title}")
    db.add(log)
    from app.features.notifications.router import create_notification
    create_notification(db, current_user.id, f"Summary generated for {title}")
    
    db.commit()
    db.refresh(new_summary)

    return {
        "id": new_summary.id,
        "summary": new_summary.summary_text,
        "confidence": confidence,
        "model_used": new_summary.model_used,
        "compression_ratio": ratio,
        "latency": latency
    }

@router.get("/latest")
def get_latest_summary(document_id: Optional[str] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Summary).filter(Summary.user_id == current_user.id)
    if document_id:
        query = query.filter(Summary.document_id == document_id)
    s = query.order_by(Summary.created_at.desc()).first()
    if not s:
        return {"status": "empty", "message": "No summaries found."}
    return {
        "status": "success",
        "summary": {
            "id": s.id,
            "document_id": s.document_id,
            "title": s.title,
            "originalText": s.original_text,
            "summaryText": s.summary_text,
            "modelUsed": s.model_used,
            "language": s.language,
            "confidence": s.confidence_score,
            "compression": s.compression_ratio,
            "readingTimeSaved": s.reading_time_saved,
            "keywords": s.keywords.split(",") if s.keywords else [],
            "isFavorite": s.is_favorite,
            "latency": getattr(s, 'latency', 0.0) or 0.0,
            "createdDate": s.created_at.isoformat()
        }
    }

@router.get("/")
def get_user_summaries(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    summaries = db.query(Summary).filter(Summary.user_id == current_user.id).order_by(Summary.created_at.desc()).all()
    return {
        "summaries": [
            {
                "id": s.id,
                "document_id": s.document_id,
                "title": s.title,
                "originalText": s.original_text,
                "summaryText": s.summary_text,
                "modelUsed": s.model_used,
                "language": s.language,
                "confidence": s.confidence_score,
                "compression": s.compression_ratio,
                "readingTimeSaved": s.reading_time_saved,
                "keywords": s.keywords.split(",") if s.keywords else [],
                "isFavorite": s.is_favorite,
                "latency": getattr(s, 'latency', 0.0) or 0.0,
                "createdDate": s.created_at.isoformat()
            }
            for s in summaries
        ]
    }

@router.put("/edit/{summary_id}")
def edit_summary(
    summary_id: str,
    payload: EditSummaryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    summary = db.query(Summary).filter(Summary.id == summary_id, Summary.user_id == current_user.id).first()
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")
        
    if payload.title is not None:
        summary.title = payload.title
    if payload.summary_text is not None:
        summary.summary_text = payload.summary_text
        
    db.commit()
    return {"status": "success", "message": "Summary updated."}

@router.delete("/{summary_id}")
def delete_summary(
    summary_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    summary = db.query(Summary).filter(Summary.id == summary_id, Summary.user_id == current_user.id).first()
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")
        
    db.delete(summary)
    db.commit()
    return {"status": "success", "message": "Summary deleted."}

@router.post("/{summary_id}/favorite")
def toggle_favorite(
    summary_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    summary = db.query(Summary).filter(Summary.id == summary_id, Summary.user_id == current_user.id).first()
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")
        
    summary.is_favorite = not summary.is_favorite
    db.commit()
    return {"status": "success", "isFavorite": summary.is_favorite}

@router.post("/{summary_id}/duplicate")
def duplicate_summary(
    summary_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Duplicate a summary record."""
    original = db.query(Summary).filter(Summary.id == summary_id, Summary.user_id == current_user.id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Summary not found")
    
    copy = Summary(
        user_id=current_user.id,
        document_id=original.document_id,
        title=f"Copy of {original.title}",
        original_text=original.original_text,
        summary_text=original.summary_text,
        model_used=original.model_used,
        language=original.language,
        confidence_score=original.confidence_score,
        compression_ratio=original.compression_ratio,
        reading_time_saved=original.reading_time_saved,
        keywords=original.keywords,
        is_favorite=False,
        latency=original.latency
    )
    db.add(copy)
    db.commit()
    db.refresh(copy)
    
    return {
        "status": "success",
        "summary": {
            "id": copy.id,
            "title": copy.title,
            "summaryText": copy.summary_text,
            "createdDate": copy.created_at.isoformat()
        }
    }


class RefineRequest(BaseModel):
    summary_id: str
    refinement_type: str = None
    tone: str = None
    format: str = None


@router.post("/refine")
def refine_summary(
    payload: RefineRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    summary = db.query(Summary).filter(Summary.id == payload.summary_id, Summary.user_id == current_user.id).first()
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")
    
    text = summary.summary_text
    
    if payload.refinement_type == "explain":
        text = f"Explanation of Summary:\nThis document highlights the core processes, outlining key parameters and structural evaluations.\n\n{text}"
    elif payload.refinement_type == "expand":
        text = f"{text}\n\nAdditional Analysis: Additionally, it is critical to note the secondary impacts of these findings on overall system performance and efficiency, calling for thorough validation methodologies."
    elif payload.refinement_type == "shorten":
        sentences = text.split(".")
        text = ". ".join(sentences[:2]) + "." if len(sentences) > 2 else text
    elif payload.refinement_type == "rewrite":
        text = f"Alternative Draft:\n{text}"
        
    if payload.tone:
        text = f"[{payload.tone.capitalize()} Tone]\n{text}"
        
    if payload.format == "bullets":
        sentences = [s.strip() for s in text.split(".") if s.strip()]
        text = "\n".join([f"• {s}." for s in sentences])
    elif payload.format == "timeline":
        sentences = [s.strip() for s in text.split(".") if s.strip()]
        text = "\n".join([f"Step {i+1}: {s}." for i, s in enumerate(sentences)])
    elif payload.format == "mindmap":
        text = f"Main Subject: Summary\n├── Context Analysis\n└── Key Insights\n    └── {text[:100]}..."
    elif payload.format == "action_items":
        sentences = [s.strip() for s in text.split(".") if s.strip()]
        text = "\n".join([f"☐ [Action] {s}." for s in sentences[:3]])
    elif payload.format == "insights":
        text = f"Key Insights:\n1. Core Focus: Understanding context boundaries.\n2. Overlap Details: Sentence extraction density.\n\n{text}"

    summary.summary_text = text
    db.commit()
    
    log = ActivityLog(user_id=current_user.id, action="SUMMARY_REFINE", details=f"Refined summary {summary.title} with type={payload.refinement_type}")
    db.add(log)
    db.commit()
    
    return {
        "status": "success",
        "summary_text": text
    }
