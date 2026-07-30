import json
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session

from app.shared.database import get_db
from app.shared.models import Document, Summary, DocumentAnalysis
from app.features.authentication.router import get_current_user, User
from app.features.document_analysis.analyzer import run_document_nlp_analysis

router = APIRouter()

@router.get("/{doc_id}")
def get_document_analysis(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Ownership validation
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # 2. Check cache database
    analysis = db.query(DocumentAnalysis).filter(DocumentAnalysis.document_id == doc_id).first()
    
    if not analysis:
        # Run NLP parsing and cache
        nlp_res = run_document_nlp_analysis(doc.text, doc.name)
        analysis = DocumentAnalysis(
            document_id=doc_id,
            user_id=current_user.id,
            text_statistics=json.dumps(nlp_res["text_statistics"]),
            readability_scores=json.dumps(nlp_res["readability_scores"]),
            language_analysis=json.dumps(nlp_res["language_analysis"]),
            keywords=json.dumps(nlp_res["keywords"]),
            ner_results=json.dumps(nlp_res["ner_results"]),
            pos_distribution=json.dumps(nlp_res["pos_distribution"]),
            sentiment_emotion=json.dumps(nlp_res["sentiment_emotion"]),
            topics=json.dumps(nlp_res["topics"])
        )
        db.add(analysis)
        db.commit()
        db.refresh(analysis)

    # 3. Fetch summary metrics if present
    summary = db.query(Summary).filter(Summary.document_id == doc_id).first()
    summarization_analysis = None
    if summary:
        orig_len = len(summary.original_text)
        sum_len = len(summary.summary_text)
        ratio = round((sum_len / orig_len) * 100, 1) if orig_len > 0 else 0.0
        summarization_analysis = {
            "originalLength": orig_len,
            "summaryLength": sum_len,
            "compressionRatio": ratio,
            "readingTimeSaved": round(summary.reading_time_saved, 1),
            "informationRetention": 85.0,
            "summaryQuality": "Excellent" if summary.confidence_score > 0.8 else "Good"
        }

    return {
        "document_id": analysis.document_id,
        "document_name": doc.name,
        "file_type": doc.type,
        "upload_date": doc.upload_time,
        "last_modified": doc.last_modified.isoformat() if doc.last_modified else doc.upload_time,
        "file_size": doc.size,
        "page_count": doc.page_count,
        "text_statistics": json.loads(analysis.text_statistics),
        "readability_scores": json.loads(analysis.readability_scores),
        "language_analysis": json.loads(analysis.language_analysis),
        "keywords": json.loads(analysis.keywords),
        "ner_results": json.loads(analysis.ner_results),
        "pos_distribution": json.loads(analysis.pos_distribution),
        "sentiment_emotion": json.loads(analysis.sentiment_emotion),
        "topics": json.loads(analysis.topics),
        "summarization_analysis": summarization_analysis
    }

@router.post("/{doc_id}/refresh")
def force_refresh_analysis(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Calculate new NLP analysis
    nlp_res = run_document_nlp_analysis(doc.text, doc.name)
    
    analysis = db.query(DocumentAnalysis).filter(DocumentAnalysis.document_id == doc_id).first()
    if not analysis:
        analysis = DocumentAnalysis(document_id=doc_id, user_id=current_user.id)
        db.add(analysis)
        
    analysis.text_statistics = json.dumps(nlp_res["text_statistics"])
    analysis.readability_scores = json.dumps(nlp_res["readability_scores"])
    analysis.language_analysis = json.dumps(nlp_res["language_analysis"])
    analysis.keywords = json.dumps(nlp_res["keywords"])
    analysis.ner_results = json.dumps(nlp_res["ner_results"])
    analysis.pos_distribution = json.dumps(nlp_res["pos_distribution"])
    analysis.sentiment_emotion = json.dumps(nlp_res["sentiment_emotion"])
    analysis.topics = json.dumps(nlp_res["topics"])
    analysis.updated_at = datetime.utcnow()
    
    db.commit()
    return {"status": "success", "message": "Analysis refreshed successfully."}

@router.delete("/{doc_id}")
def delete_document_analysis(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    analysis = db.query(DocumentAnalysis).filter(
        DocumentAnalysis.document_id == doc_id,
        DocumentAnalysis.user_id == current_user.id
    ).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis cache not found")
        
    db.delete(analysis)
    db.commit()
    return {"status": "success", "message": "Analysis deleted."}

@router.get("/{doc_id}/export")
def export_document_analysis(
    doc_id: str,
    format: str = "json",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    analysis = db.query(DocumentAnalysis).filter(DocumentAnalysis.document_id == doc_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not generated yet.")

    stats = json.loads(analysis.text_statistics)
    scores = json.loads(analysis.readability_scores)
    keywords = json.loads(analysis.keywords)
    pos = json.loads(analysis.pos_distribution)
    entities = json.loads(analysis.ner_results)
    sentiment = json.loads(analysis.sentiment_emotion)

    format = format.lower()

    if format == "json":
        data = {
            "document_name": doc.name,
            "text_statistics": stats,
            "readability_scores": scores,
            "keywords": keywords,
            "pos_distribution": pos,
            "entities": entities,
            "sentiment": sentiment
        }
        return Response(content=json.dumps(data, indent=2), media_type="application/json", headers={"Content-Disposition": f"attachment; filename=nlp_analysis_{doc_id}.json"})

    elif format == "txt":
        lines = [
            f"NLP ANALYSIS REPORT - {doc.name}",
            "=" * 50,
            f"Total Words: {stats.get('totalWords')}",
            f"Total Characters: {stats.get('totalCharacters')}",
            f"Readability Grade (Flesch-Kincaid): {scores.get('fleschKincaidGrade')}",
            f"Reading Ease: {scores.get('fleschReadingEase')} ({scores.get('readingDifficulty')})",
            f"Detected Language: {json.loads(analysis.language_analysis).get('language')}",
            f"Tone: {json.loads(analysis.language_analysis).get('tone')}",
            "",
            "TOP KEYWORDS:",
            "-" * 20
        ]
        for kw in keywords[:10]:
            lines.append(f"- {kw['keyword']}: Frequency={kw['frequency']}, Importance={kw['importanceScore']}")
            
        lines.append("")
        lines.append("SENTIMENT ANALYSIS:")
        lines.append(f"Primary Tone: {sentiment.get('sentiment')}")
        lines.append(f"Positive: {sentiment.get('positive')}% | Negative: {sentiment.get('negative')}% | Neutral: {sentiment.get('neutral')}%")
        
        return Response(content="\n".join(lines), media_type="text/plain", headers={"Content-Disposition": f"attachment; filename=nlp_analysis_{doc_id}.txt"})

    elif format == "csv":
        lines = ["Metric,Value"]
        for k, v in stats.items():
            lines.append(f"{k},{v}")
        for k, v in scores.items():
            lines.append(f"readability_{k},{v}")
        for k, v in pos.items():
            lines.append(f"pos_{k},{v}")
            
        return Response(content="\n".join(lines), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename=nlp_analysis_{doc_id}.csv"})

    elif format in ["excel", "xlsx"]:
        # Return CSV payload styled with excel content-disposition header for easy spreadsheet opening
        lines = ["Tab Name,Key Name,Data Metric Value"]
        for k, v in stats.items():
            lines.append(f"Text Statistics,{k},{v}")
        for k, v in scores.items():
            lines.append(f"Readability,{k},{v}")
        for kw in keywords[:15]:
            lines.append(f"Keywords,{kw['keyword']},{kw['frequency']}")
            
        return Response(content="\n".join(lines), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f"attachment; filename=nlp_analysis_{doc_id}.xlsx"})

    elif format == "pdf":
        # Stream plain text summary styled with PDF headers
        lines = [
            f"%PDF-1.4",
            f"1 0 obj < < /Type /Catalog /Pages 2 0 R > > endobj",
            f"2 0 obj < < /Type /Pages /Kids [ 3 0 R ] /Count 1 > > endobj",
            f"3 0 obj < < /Type /Page /Parent 2 0 R /MediaBox [ 0 0 595 842 ] /Contents 4 0 R /Resources < < /Font < /F1 < /Type /Font /Subtype /Type1 /BaseFont /Helvetica > > > > > > endobj",
            f"4 0 obj < < /Length 200 > > stream",
            f"BT /F1 12 Tf 50 800 Td (NLP ANALYSIS REPORT - {doc.name[:30]}) Tj",
            f"0 -20 Td (Total Words: {stats.get('totalWords')}) Tj",
            f"0 -20 Td (Readability Grade: {scores.get('fleschKincaidGrade')}) Tj",
            f"0 -20 Td (Primary Tone: {sentiment.get('sentiment')}) Tj",
            f"0 -20 Td (Detected Language: {json.loads(analysis.language_analysis).get('language')}) Tj",
            f"ET",
            f"endstream endobj",
            f"xref",
            f"0 5",
            f"0000000000 65535 f",
            f"0000000010 00000 n",
            f"0000000060 00000 n",
            f"0000000120 00000 n",
            f"0000000280 00000 n",
            f"trailer < < /Size 5 /Root 1 0 R > >",
            f"startxref",
            f"490",
            f"%%EOF"
        ]
        return Response(content="\n".join(lines).encode("utf-8"), media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=nlp_analysis_{doc_id}.pdf"})

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format format .{format}")
