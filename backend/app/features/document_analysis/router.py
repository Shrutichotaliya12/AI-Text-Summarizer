import json
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
import io
import csv
import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from sqlalchemy.orm import Session
from app.shared.database import get_db
from pydantic import BaseModel
import re
from app.shared.models import Document, Summary, DocumentAnalysis, DocumentChunk
from app.utils.semantic_search import score_and_rank_chunks
from app.features.authentication.router import get_current_user, User
from app.features.document_analysis.analyzer import run_document_nlp_analysis

router = APIRouter()

from app.utils.document_parser import extract_text_from_bytes

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
        # Re-extract pages if original file bytes are present
        pages = []
        if doc.original_file_bytes:
            parsed = extract_text_from_bytes(doc.original_file_bytes, doc.name, "")
            pages = parsed["pages"]
        if not pages:
            pages = [doc.text]
            
        # Run NLP parsing and cache
        nlp_res = run_document_nlp_analysis(doc.text, doc.name, doc.type, pages)
        if nlp_res["text_statistics"].get("pagesProcessed", 0) > doc.page_count:
            nlp_res["text_statistics"]["pagesProcessed"] = doc.page_count
            
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
        
    pages = []
    if doc.original_file_bytes:
        parsed = extract_text_from_bytes(doc.original_file_bytes, doc.name, "")
        pages = parsed["pages"]
    if not pages:
        pages = [doc.text]
        
    # Calculate new NLP analysis
    nlp_res = run_document_nlp_analysis(doc.text, doc.name, doc.type, pages)
    if nlp_res["text_statistics"].get("pagesProcessed", 0) > doc.page_count:
        nlp_res["text_statistics"]["pagesProcessed"] = doc.page_count
    
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
    analysis.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    
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

class AskRequest(BaseModel):
    question: str

@router.get("/{doc_id}/search")
def search_document(
    doc_id: str,
    q: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc_id).all()
    if not chunks:
        return {"results": []}
        
    ranked = score_and_rank_chunks(q, chunks, limit=5)
    results = []
    for chunk, score in ranked:
        if score > 0:
            results.append({
                "page": chunk.page_number,
                "text": chunk.text[:200] + "..." if len(chunk.text) > 200 else chunk.text,
                "score": score
            })
    return {"results": results}
    
@router.post("/{doc_id}/ask")
def ask_document(
    doc_id: str,
    payload: AskRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc_id).all()
    if not chunks:
        return {"answer": "Could not find sufficient information in this document.", "sources": []}
        
    ranked = score_and_rank_chunks(payload.question, chunks, limit=4)
    best_chunks = [c for c, score in ranked if score > 0.05]
    
    if not best_chunks:
        return {"answer": "Could not find sufficient information in this document.", "sources": []}
        
    query_words = [w.lower() for w in re.findall(r"\b\w{3,}\b", payload.question)]
    answer_sentences = []
    sources = set()
    
    for chunk in best_chunks:
        sentences = re.split(r"(?<=[.!?]) +", chunk.text.replace("\n", " "))
        for s in sentences:
            s_lower = s.lower()
            # If any query word is in the sentence, use it as part of answer
            if any(qw in s_lower for qw in query_words) and len(s.split()) > 4:
                if s not in answer_sentences:
                    answer_sentences.append(s.strip())
                    sources.add(chunk.page_number)
        if len(answer_sentences) >= 3:
            break
            
    if not answer_sentences:
        answer = "**Partial match found:**\n\n- *" + best_chunks[0].text[:300].replace("\n", " ").strip() + "...*"
        sources.add(best_chunks[0].page_number)
    else:
        answer = f"**Direct Answer:**\n{answer_sentences[0]}\n\n"
        if len(answer_sentences) > 1:
            answer += "**Additional Details:**\n"
            for s in answer_sentences[1:4]:
                answer += f"- {s}\n"
        
    return {
        "answer": answer,
        "sources": sorted(list(sources))
    }

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
    topics = json.loads(analysis.topics)
    lang = json.loads(analysis.language_analysis)

    format = format.lower()

    if format == "json":
        data = {
            "document_name": doc.name,
            "text_statistics": stats,
            "readability_scores": scores,
            "keywords": keywords,
            "pos_distribution": pos,
            "entities": entities,
            "sentiment": sentiment,
            "topics": topics,
            "language": lang
        }
        return Response(content=json.dumps(data, indent=2), media_type="application/json", headers={"Content-Disposition": f"attachment; filename=nlp_analysis_{doc_id}.json"})

    elif format == "txt":
        lines = [
            f"NLP ANALYSIS REPORT - {doc.name}",
            "=" * 50,
            f"Upload Date: {doc.upload_time}",
            f"Document Type: {stats.get('documentType', 'Unknown')}",
            f"Total Words: {stats.get('totalWords', 0)}",
            f"Total Sentences: {stats.get('sentenceCount', 0)}",
            f"Readability Difficulty: {scores.get('readingDifficulty', 'Unknown')}",
            f"Detected Language: {lang.get('language', 'Unknown')}",
            f"Overall Sentiment: {sentiment.get('sentiment', 'Unknown')}",
            f"Detected Tone: {sentiment.get('tone', 'Unknown')}",
            f"Writing Style: {sentiment.get('writingStyle', 'Unknown')}",
            f"Complexity: {sentiment.get('complexity', 'Unknown')}",
            f"Objectivity: {sentiment.get('objectivity', 'Unknown')}",
            "",
            "AI OVERVIEW:",
            "-" * 20,
            stats.get('overview', 'N/A'),
            "",
            "KEY TAKEAWAYS:",
            "-" * 20
        ]
        for t in stats.get("takeaways", []):
            lines.append(f"- {t['text']} (Page {t['page']})")
            
        lines.append("")
        lines.append("TOP KEYWORDS:")
        lines.append("-" * 20)
        for kw in keywords[:15]:
            lines.append(f"- {kw['keyword']}: {kw['frequency']} mentions")
            
        lines.append("")
        lines.append("TOPICS:")
        lines.append("-" * 20)
        lines.append(f"Main Topic: {topics.get('mainTopic')}")
        for t in topics.get("distribution", []):
            lines.append(f"- {t['topic']} ({t['distribution']}% / Count: {t.get('count', 0)}): {', '.join(t['subtopics'])}")
            
        return Response(content="\n".join(lines), media_type="text/plain", headers={"Content-Disposition": f"attachment; filename=nlp_analysis_{doc_id}.txt"})

    elif format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write Overview
        writer.writerow(["Section", "Metric", "Value"])
        writer.writerow(["Document", "Name", doc.name])
        writer.writerow(["Document", "Type", stats.get('documentType', doc.type)])
        writer.writerow(["Document", "Upload Date", doc.upload_time])
        writer.writerow(["Document", "Overview", stats.get('overview', '')])
        writer.writerow(["Tone", "Sentiment", sentiment.get('sentiment')])
        writer.writerow(["Tone", "Tone", sentiment.get('tone')])
        writer.writerow(["Tone", "Writing Style", sentiment.get('writingStyle')])
        writer.writerow(["Tone", "Complexity", sentiment.get('complexity')])
        writer.writerow(["Tone", "Objectivity", sentiment.get('objectivity')])
        writer.writerow([])
        
        # Write Stats
        for k, v in stats.items():
            if k not in ['structure', 'takeaways', 'facts']:
                writer.writerow(["Text Statistics", k, v])
        writer.writerow([])
        
        # Write Readability
        for k, v in scores.items():
            writer.writerow(["Readability", k, v])
        writer.writerow([])
        
        # Write Keywords
        writer.writerow(["Keyword", "Frequency", "TF-IDF Score", "Importance"])
        for kw in keywords:
            writer.writerow([kw["keyword"], kw["frequency"], kw["tfIdfScore"], kw["importanceScore"]])
            
        return Response(content=output.getvalue(), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename=nlp_analysis_{doc_id}.csv"})

    elif format in ["excel", "xlsx"]:
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            # 1. Overview Sheet
            pd.DataFrame([
                {"Metric": "Document Name", "Value": doc.name},
                {"Metric": "File Type", "Value": doc.type},
                {"Metric": "Document Type", "Value": stats.get("documentType", "")},
                {"Metric": "Upload Date", "Value": str(doc.upload_time)},
                {"Metric": "Total Words", "Value": stats.get("totalWords")},
                {"Metric": "Total Sentences", "Value": stats.get("sentenceCount")},
                {"Metric": "Main Topic", "Value": topics.get("mainTopic")},
                {"Metric": "Language", "Value": lang.get("language")},
                {"Metric": "Sentiment", "Value": sentiment.get("sentiment")},
                {"Metric": "Tone", "Value": sentiment.get("tone")},
                {"Metric": "Writing Style", "Value": sentiment.get("writingStyle")},
                {"Metric": "Complexity", "Value": sentiment.get("complexity")},
                {"Metric": "Objectivity", "Value": sentiment.get("objectivity")}
            ]).to_excel(writer, sheet_name="Overview", index=False)
            
            # 2. Statistics Sheet
            stats_df = pd.DataFrame([{k: v} for k, v in stats.items() if k not in ['structure', 'takeaways', 'facts']])
            scores_df = pd.DataFrame(list(scores.items()), columns=["Metric", "Value"])
            pd.DataFrame(list({k: v for k, v in stats.items() if k not in ['structure', 'takeaways', 'facts']}.items()), columns=["Metric", "Value"]).to_excel(writer, sheet_name="Statistics", index=False)
            
            # 3. Takeaways Sheet
            takeaways = stats.get("takeaways", [])
            if takeaways:
                pd.DataFrame(takeaways).to_excel(writer, sheet_name="Takeaways", index=False)
            else:
                pd.DataFrame([{"Message": "No takeaways found"}]).to_excel(writer, sheet_name="Takeaways", index=False)
                
            # 3.5 Facts Sheet
            facts = stats.get("facts", [])
            if facts:
                pd.DataFrame(facts).to_excel(writer, sheet_name="Facts", index=False)
                
            # 4. Keywords Sheet
            pd.DataFrame(keywords).to_excel(writer, sheet_name="Keywords", index=False)
            
            # 5. Entities Sheet
            ent_records = []
            for category, items in entities.items():
                for item in items:
                    if isinstance(item, dict):
                        ent_records.append({
                            "Category": category, 
                            "Entity": item.get("entity", ""), 
                            "Count": item.get("count", 0), 
                            "Pages": str(item.get("pages", []))
                        })
                    else:
                        ent_records.append({"Category": category, "Entity": str(item)})
            if ent_records:
                pd.DataFrame(ent_records).to_excel(writer, sheet_name="Entities", index=False)
            else:
                pd.DataFrame([{"Message": "No entities found"}]).to_excel(writer, sheet_name="Entities", index=False)
                
            # 6. Topics Sheet
            dist = topics.get("distribution", [])
            topics_data = []
            for d in dist:
                topics_data.append({
                    "Topic": d["topic"], 
                    "Distribution %": d["distribution"],
                    "Mention Count": d.get("count", 0),
                    "Subtopics": ", ".join(d["subtopics"])
                })
            pd.DataFrame(topics_data).to_excel(writer, sheet_name="Topics", index=False)
            
            # 7. Sections Sheet
            structure = stats.get("structure", [])
            if structure:
                struct_records = []
                for s in structure:
                     struct_records.append({
                         "Section": s.get("section"), 
                         "Level": s.get("level"), 
                         "Pages": f"{s.get('start_page', '')}-{s.get('end_page', '')}", 
                         "Description": s.get("description")
                     })
                pd.DataFrame(struct_records).to_excel(writer, sheet_name="Sections", index=False)
            else:
                pd.DataFrame([{"Section": "Full Document", "Pages": "1"}]).to_excel(writer, sheet_name="Sections", index=False)

        val = output.getvalue()
        output.close()
        return Response(content=val, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f"attachment; filename=nlp_analysis_{doc_id}.xlsx"})

    elif format == "pdf":
        output = io.BytesIO()
        doc_pdf = SimpleDocTemplate(output, pagesize=letter)
        styles = getSampleStyleSheet()
        elements = []
        
        # Title
        title_style = styles['Title']
        elements.append(Paragraph(f"NLP Intelligence Report", title_style))
        elements.append(Paragraph(f"Document: {doc.name}", styles['Normal']))
        elements.append(Spacer(1, 20))
        
        # Overview Table
        elements.append(Paragraph("Document Overview", styles['Heading2']))
        overview_data = [
            ["Type", str(stats.get('documentType', doc.type))],
            ["Total Words", str(stats.get('totalWords'))],
            ["Language", lang.get('language')],
            ["Sentiment", sentiment.get('sentiment')],
            ["Tone", sentiment.get('tone')]
        ]
        t = Table(overview_data, colWidths=[200, 300])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.whitesmoke),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.lightgrey)
        ]))
        elements.append(t)
        elements.append(Spacer(1, 20))
        
        # Takeaways
        elements.append(Paragraph("Key Takeaways", styles['Heading2']))
        takeaways = stats.get("takeaways", [])
        if takeaways:
            for t_item in takeaways:
                elements.append(Paragraph(f"- {t_item['text']} (Page {t_item['page']})", styles['Normal']))
        else:
            elements.append(Paragraph("None detected.", styles['Normal']))
        elements.append(Spacer(1, 20))
        
        # Keywords
        elements.append(Paragraph("Top Keywords", styles['Heading2']))
        kw_data = [["Keyword", "Frequency"]]
        for kw in keywords[:10]:
            kw_data.append([kw['keyword'], str(kw['frequency'])])
        
        t_kw = Table(kw_data, colWidths=[200, 300])
        t_kw.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#5b6bff')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.lightgrey)
        ]))
        elements.append(t_kw)
        elements.append(Spacer(1, 20))
        
        # Build PDF
        doc_pdf.build(elements)
        val = output.getvalue()
        output.close()
        
        return Response(content=val, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=nlp_analysis_{doc_id}.pdf"})

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported export format: {format}")
