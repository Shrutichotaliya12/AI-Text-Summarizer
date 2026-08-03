import re
import math
from collections import Counter
from typing import List

# Synsets and vocabulary helpers for lexicons
STOP_WORDS = {
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", 
    "is", "are", "was", "were", "be", "been", "am", "it", "this", "that", "these", "those",
    "as", "from", "into", "through", "during", "then", "them", "they", "their", "he", "she", 
    "you", "your", "we", "our", "us", "i", "my", "me", "has", "have", "had", "do", "does", "did",
    "would", "should", "could", "will", "can", "their", "there",
    "text", "user", "using", "application", "data", "information", "page", "document", "file", 
    "time", "way", "new", "used", "make", "take", "get", "like", "also", "well", "one", "two", "use",
    "shown", "large", "system", "result", "results", "analysis"
}

POSITIVE_WORDS = {
    "great", "excellent", "awesome", "good", "beautiful", "wonderful", "perfect", "love", "like", "happy",
    "success", "successful", "outstanding", "brilliant", "fantastic", "positive", "recommend", "best",
    "efficiency", "efficient", "robust", "scalable", "intelligent", "pleased", "innovative", "advantage"
}

NEGATIVE_WORDS = {
    "bad", "terrible", "awful", "worst", "poor", "hate", "sad", "angry", "failure", "fail", "failed",
    "negative", "defect", "error", "bug", "issue", "slow", "inefficient", "risk", "danger", "hazardous",
    "disappointed", "problem", "difficult", "corrupted", "unsupported", "waste", "break", "broken"
}

TECH_KEYWORDS = {"software", "hardware", "python", "react", "fastapi", "sqlite", "mongodb", "ai", "machine", "learning", "neural", "server", "web", "database", "api", "cloud", "deployment", "vite", "typescript", "framework", "git"}
BUSINESS_KEYWORDS = {"finance", "stock", "market", "revenue", "profit", "business", "growth", "investment", "shares", "dividend", "quarterly", "management", "cost", "marketing", "sales", "enterprise"}
ACADEMIC_KEYWORDS = {"research", "methodology", "hypothesis", "analysis", "study", "experiment", "evidence", "data", "conclusion", "abstract", "journal", "literature", "theory", "empirical"}

def count_syllables_in_word(word: str) -> int:
    word = word.lower().strip(".:,;!?()[]{}'\"")
    if not word:
        return 0
    vowels = "aeiouy"
    count = 0
    if word[0] in vowels:
        count += 1
    for index in range(1, len(word)):
        if word[index] in vowels and word[index - 1] not in vowels:
            count += 1
    if word.endswith("e"):
        count -= 1
    if count <= 0:
        count = 1
    return count

def detect_document_type(text: str, filename: str) -> str:
    text_lower = text.lower()[:5000]
    
    inv_matches = sum(1 for w in ["invoice", "bill to", "amount due", "balance", "receipt"] if w in text_lower)
    if inv_matches >= 2: return "Invoice"
    
    res_matches = sum(1 for w in ["experience", "education", "skills", "resume", "curriculum vitae"] if w in text_lower)
    if res_matches >= 2: return "Resume"
    
    rep_matches = sum(1 for w in ["abstract", "methodology", "conclusion", "references", "hypothesis"] if w in text_lower)
    if rep_matches >= 3: return "Research Paper"
    
    leg_matches = sum(1 for w in ["whereas", "hereby", "contract", "agreement", "party", "liability", "termination"] if w in text_lower)
    if leg_matches >= 3: return "Legal Document"
    
    tech_matches = sum(1 for w in ["api", "configuration", "system", "architecture", "deployment", "version", "software"] if w in text_lower)
    if tech_matches >= 3: return "Technical Document"
    
    biz_matches = sum(1 for w in ["revenue", "quarterly", "executive summary", "fiscal", "profit", "stakeholder"] if w in text_lower)
    if biz_matches >= 3: return "Business Report"
    
    return "Standard Document"

def extract_overview(sentences: List[str], clean_words: List[str]) -> str:
    if not sentences: return ""
    word_counts = Counter(clean_words)
    total_clean = len(clean_words) or 1
    
    scored_sentences = []
    framing_keywords = ["this paper", "this document", "the objective", "we present", "in conclusion", "to summarize", "this report", "aim of this"]
    
    for s in sentences:
        s_clean = s.strip()
        if len(s_clean.split()) < 8 or len(s_clean.split()) > 45: continue
        if re.match(r'^(?:[0-9]+\.)+\s*', s_clean): continue
        if "...." in s_clean or "    " in s_clean or "....." in s_clean: continue
        if s_clean.isupper(): continue
        # Must have at least one verb or be a substantial sentence
        if not re.search(r'\b(?:is|are|was|were|has|have|had|will|would|can|could|we|they|show|present|describe|evaluate|analyze)\b', s_clean.lower()): continue
        
        score = 0
        s_lower = s_clean.lower()
        
        if any(fw in s_lower for fw in framing_keywords):
            score += 5.0
            
        for w in re.findall(r"\b[a-zA-Z']+\b", s_clean):
            w = w.lower()
            if w in word_counts:
                tf = word_counts[w] / total_clean
                score += tf
        scored_sentences.append((s_clean, score))
        
    scored_sentences.sort(key=lambda x: x[1], reverse=True)
    top = [s[0] for s in scored_sentences[:4]]
    ordered = [s for s in sentences if s.strip() in top]
    if not ordered:
        return ""
    
    # Build structured markdown
    top_words = list(dict.fromkeys([w.lower().strip(".,!?;:\"'()[]{}") for w in clean_words if len(w) > 5]))
    main_topic = top_words[0].capitalize() if top_words else "the selected document"
    
    md_res = f"## Document Overview\n\nThis document presents an analysis regarding **{main_topic}**.\n\n### Key Focus Areas\n"
    for s in ordered[:3]:
        md_res += f"- {s.strip()}\n"
        
    if len(ordered) > 3:
        md_res += "\n### Additional Details\n"
        for s in ordered[3:5]:
            md_res += f"- {s.strip()}\n"
            
    return md_res

def clean_takeaway_text(text: str) -> str:
    # Remove leading numbers, bullet points, chapter markers
    cleaned = re.sub(r'^(?:[0-9]+(?:\.[0-9]+)*|\-|\*|[A-Z]?\.)\s*', '', text).strip()
    cleaned = re.sub(r'^(?:chapter|section|abstract|introduction|conclusion)\s*[0-9]*\s*[-:]?\s*', '', cleaned, flags=re.IGNORECASE).strip()
    return cleaned

def run_document_nlp_analysis(text: str, filename: str, doc_type_mime: str = "", pages: List[str] = None) -> dict:
    if pages is None:
        pages = [text]
        
    doc_page_count = len(pages)
    
    ocr_required = False
    if doc_type_mime.lower() == "pdf" and len(text.strip()) == 0:
        ocr_required = True
        
    extraction_successful = len(text.strip()) > 0
    
    if not extraction_successful:
        raw_words, clean_words = [], []
        total_words, total_clean_words, sentence_count, paragraph_count = 0, 0, 0, 0
        all_sentences = []
    else:
        raw_words = re.findall(r"\b[a-zA-Z']+\b", text)
        clean_words = [w.lower() for w in raw_words if w.lower() not in STOP_WORDS]
        total_words = len(raw_words) if raw_words else 0
        total_clean_words = len(clean_words) if clean_words else 0

        all_sentences = [s.strip() for s in re.split(r"[.!?]+", text) if s.strip()]
        sentence_count = len(all_sentences) if all_sentences else 0
        paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
        paragraph_count = len(paragraphs) if paragraphs else 0

    chars_total = len(text)
    chars_no_spaces = len(re.sub(r"\s", "", text))
    unique_words_count = len(set(clean_words))
    vocab_richness = float(unique_words_count / total_clean_words) if total_clean_words else 0.0
    avg_word_len = sum(len(w) for w in raw_words) / total_words if total_words else 0.0
    longest_word = max(raw_words, key=len) if raw_words else "N/A"
    shortest_word = min(raw_words, key=len) if raw_words else "N/A"
    avg_sentence_len = total_words / sentence_count if sentence_count else 0.0
    avg_paragraph_len = total_words / paragraph_count if paragraph_count else 0.0

    detected_doc_type = detect_document_type(text, filename)
    overview_text = extract_overview(all_sentences, clean_words)

    # 1. Page-Mapped extractions: Structure, Takeaways, Facts, NER
    structure = []
    takeaways = []
    facts = []
    ner_raw = {
        "People": [], "Organizations": [], "Locations": [], "Dates": [],
        "Technologies": [], "Models": [], "Datasets": []
    }
    
    takeaway_keywords = ["conclude", "significant", "important", "must", "recommend", "critical", "essential", "crucial", "therefore", "results show", "indicates"]
    
    seen_takeaways = set()
    seen_facts = set()
    seen_headers = set()
    keyword_pages = {}

    current_section = None

    for page_idx, page_text in enumerate(pages):
        page_num = page_idx + 1
        page_words = [w.lower() for w in re.findall(r"\b[a-zA-Z']+\b", page_text) if w.lower() not in STOP_WORDS]
        for w in page_words:
            if w not in keyword_pages: keyword_pages[w] = set()
            keyword_pages[w].add(page_num)
            
        page_sentences = [s.strip() for s in re.split(r"[.!?]+", page_text) if s.strip()]
        page_lines = [line.strip() for line in page_text.split("\n") if line.strip()]
        
        # Structure Extraction
        for i, line in enumerate(page_lines):
            if 3 < len(line) < 80:
                is_header = False
                level = 1
                
                if line.startswith("### "): is_header, level = True, 3
                elif line.startswith("## "): is_header, level = True, 2
                elif line.startswith("# "): is_header, level = True, 1
                elif line.lower().startswith("chapter ") or line.lower().startswith("section "):
                    is_header, level = True, 1 if "chapter" in line.lower() else 2
                elif line.isupper() and len(line.split()) < 8 and not re.search(r'\d', line):
                    is_header, level = True, 2

                if is_header:
                    clean_header = re.sub(r'^#+\s*', '', line).strip()
                    if clean_header.lower() not in STOP_WORDS and clean_header not in seen_headers and len(clean_header) > 3:
                        # Validate it's not just a student name or random capitalized phrase
                        if len(clean_header.split()) > 10: continue
                        if re.search(r'\b(?:roll no|student|assignment|submitted by)\b', clean_header, re.IGNORECASE): continue
                        
                        # Extract description from subsequent lines
                        desc = ""
                        for j in range(i+1, min(i+5, len(page_lines))):
                            candidate = page_lines[j].strip()
                            if len(candidate) > 20 and not candidate.isupper() and not candidate.startswith("#"):
                                desc = candidate[:150] + ("..." if len(candidate) > 150 else "")
                                break
                        
                        if current_section:
                            current_section["end_page"] = page_num
                            structure.append(current_section)
                            
                        current_section = {
                            "section": clean_header,
                            "level": "Chapter" if level == 1 else ("Subsection" if level == 3 else "Section"),
                            "start_page": page_num,
                            "end_page": page_num,
                            "description": desc or "No description available."
                        }
                        seen_headers.add(clean_header)

        # Facts Extraction
        for s in page_sentences:
            s_clean = s.replace("\n", " ").strip()
            if len(s_clean) < 10 or len(s_clean) > 200: continue
            
            extracted_fact = None
            
            # Match Models (e.g. T5, BERT, DistilBART, GPT-4)
            model_match = re.search(r'\b(?:[A-Z][a-z]*BART|BERT|T5|GPT-[34]|LLaMA|Claude|PaLM)\b', s_clean)
            if model_match and not extracted_fact:
                extracted_fact = {"type": "Model", "value": model_match.group(), "context": s_clean, "page": page_num}
                
            # Match Datasets (CNN/DailyMail, XSum, SQuAD)
            if not extracted_fact:
                ds_match = re.search(r'\b(?:CNN/DailyMail|XSum|SQuAD|WikiText|ImageNet)\b', s_clean, re.IGNORECASE)
                if ds_match:
                    extracted_fact = {"type": "Dataset", "value": ds_match.group(), "context": s_clean, "page": page_num}
            
            # Match Metrics/Eval
            if not extracted_fact:
                eval_match = re.search(r'\b(?:ROUGE[-A-Z0-9]*|BLEU|F1(?:-score)?|Accuracy|Precision|Recall)\b', s_clean, re.IGNORECASE)
                num_match = re.search(r'\b\d+(?:\.\d+)?\b', s_clean)
                if eval_match and num_match:
                    extracted_fact = {"type": "Metric", "value": f"{eval_match.group().upper()} score", "context": s_clean, "page": page_num}
            
            # Match Percentages/Monetary
            if not extracted_fact:
                pct_match = re.search(r'\b\d+(?:\.\d+)?\s*%', s_clean)
                if pct_match:
                    extracted_fact = {"type": "Percentage", "value": pct_match.group(), "context": s_clean, "page": page_num}
                else:
                    money_match = re.search(r'\$[0-9,]+(?:\.\d+)?', s_clean)
                    if money_match:
                        extracted_fact = {"type": "Monetary", "value": money_match.group(), "context": s_clean, "page": page_num}

            # Match Year
            if not extracted_fact:
                year_match = re.search(r'\b(?:19|20)\d{2}\b', s_clean)
                if year_match and any(w in s_clean.lower() for w in ['published', 'released', 'conducted', 'year']):
                    extracted_fact = {"type": "Date/Year", "value": year_match.group(), "context": s_clean, "page": page_num}
            
            if extracted_fact:
                sig = f"{extracted_fact.get('type')}_{extracted_fact.get('value')}"
                if sig not in seen_facts and len(facts) < 8 and extracted_fact.get('value'):
                    facts.append(extracted_fact)
                    seen_facts.add(sig)

            # Takeaways Extraction
            s_lower = s.lower()
            if any(k in s_lower for k in takeaway_keywords):
                clean_s = clean_takeaway_text(s)
                if clean_s and clean_s not in seen_takeaways and len(clean_s.split()) >= 5 and len(takeaways) < 6:
                    takeaways.append({"text": clean_s + ".", "page": page_num})
                    seen_takeaways.add(clean_s)
                    
        # NER / Entity Extraction per page
        capitalized_runs = re.finditer(r"\b[A-Z][a-z]+(?:[ -][A-Z][a-z]+)*\b", page_text)
        for match in capitalized_runs:
            cap = match.group().strip()
            if cap.lower() in STOP_WORDS or len(cap) <= 3: continue
            
            # Tech rules
            if any(t in cap.lower() for t in ["python", "react", "fastapi", "node", "typescript", "java", "sql", "aws", "docker"]):
                ner_raw["Technologies"].append({"entity": cap, "page": page_num})
            # Model rules
            elif re.search(r'\b(?:BART|BERT|T5|GPT|LLaMA|Claude|PaLM)\b', cap, re.IGNORECASE):
                ner_raw["Models"].append({"entity": cap, "page": page_num})
            # Dataset rules
            elif cap.lower() in ["cnn", "dailymail", "xsum", "squad"]:
                ner_raw["Datasets"].append({"entity": cap, "page": page_num})
            # Org rules
            elif cap in ["Google", "Microsoft", "Apple", "OpenAI", "Meta", "IBM", "Amazon", "Tesla", "Nvidia"]:
                ner_raw["Organizations"].append({"entity": cap, "page": page_num})
            # Location rules
            elif cap in ["London", "Paris", "New York", "California", "Europe", "Asia", "America", "Tokyo", "Berlin", "India"]:
                ner_raw["Locations"].append({"entity": cap, "page": page_num})
            # Dates
            elif re.match(r'^(?:January|February|March|April|May|June|July|August|September|October|November|December)$', cap):
                ner_raw["Dates"].append({"entity": cap, "page": page_num})
            # People heuristic
            elif " " in cap and not any(w in cap.lower() for w in ["learning", "backend", "frontend", "development", "roll no", "authentication", "api", "database", "model", "network"]):
                # Avoid tagging titles or long phrases
                if len(cap.split()) <= 3 and cap.istitle():
                    ner_raw["People"].append({"entity": cap, "page": page_num})

    if current_section:
        current_section["end_page"] = doc_page_count
        structure.append(current_section)

    # Process NER raw into finalized schema
    ner_results = {}
    for cat, items in ner_raw.items():
        if not items: continue
        entity_map = {}
        for item in items:
            ent = item["entity"]
            pg = item["page"]
            if ent not in entity_map:
                entity_map[ent] = {"count": 0, "pages": set()}
            entity_map[ent]["count"] += 1
            entity_map[ent]["pages"].add(pg)
            
        sorted_entities = sorted(
            [{"entity": k, "count": v["count"], "pages": sorted(list(v["pages"]))[:3]} for k, v in entity_map.items()],
            key=lambda x: x["count"], 
            reverse=True
        )[:8]
        
        if sorted_entities:
            ner_results[cat] = sorted_entities

    text_statistics = {
        "totalCharacters": chars_total,
        "charactersWithoutSpaces": chars_no_spaces,
        "totalWords": total_words,
        "uniqueWords": unique_words_count,
        "vocabularyRichness": round(vocab_richness, 3),
        "averageWordLength": round(avg_word_len, 1),
        "longestWord": longest_word,
        "shortestWord": shortest_word,
        "sentenceCount": sentence_count,
        "averageSentenceLength": round(avg_sentence_len, 1),
        "paragraphCount": paragraph_count,
        "averageParagraphLength": round(avg_paragraph_len, 1),
        "ocrRequired": ocr_required,
        "extractionSuccessful": extraction_successful,
        "pagesProcessed": doc_page_count,
        "documentType": detected_doc_type,
        "overview": overview_text,
        "structure": structure,
        "takeaways": takeaways,
        "facts": facts
    }

    # 2. Readability Indices
    total_syllables = sum(count_syllables_in_word(w) for w in raw_words)
    complex_words_count = sum(1 for w in raw_words if count_syllables_in_word(w) >= 3)
    fre = max(0.0, min(100.0, 206.835 - 1.015 * (total_words / sentence_count) - 84.6 * (total_syllables / total_words))) if sentence_count and total_words else 0.0
    fkg = max(0.0, 0.39 * (total_words / sentence_count) + 11.8 * (total_syllables / total_words) - 15.59) if sentence_count and total_words else 0.0
    gfi = max(0.0, 0.4 * ((total_words / sentence_count) + 100 * (complex_words_count / total_words))) if sentence_count and total_words else 0.0
    smog = 1.043 * math.sqrt(complex_words_count * (30 / sentence_count)) + 3.1291 if sentence_count else 0.0

    if fre > 90: difficulty, edu_level = "Very Easy", "5th Grade"
    elif fre > 80: difficulty, edu_level = "Easy", "6th Grade"
    elif fre > 70: difficulty, edu_level = "Fairly Easy", "7th Grade"
    elif fre > 60: difficulty, edu_level = "Standard", "8th-9th Grade"
    elif fre > 50: difficulty, edu_level = "Fairly Difficult", "High School"
    elif fre > 30: difficulty, edu_level = "Difficult", "College Student"
    else: difficulty, edu_level = "Very Difficult", "College Graduate"

    readability_scores = {
        "fleschReadingEase": round(fre, 1),
        "fleschKincaidGrade": round(fkg, 1),
        "gunningFogIndex": round(gfi, 1),
        "smogIndex": round(smog, 1),
        "readingDifficulty": difficulty,
        "estimatedEducationLevel": edu_level
    }

    # 3. Language detection
    es_stops = {"el", "la", "los", "las", "un", "una", "y", "o", "pero", "en", "para", "con"}
    fr_stops = {"le", "la", "les", "un", "une", "et", "ou", "mais", "dans", "pour", "avec"}
    de_stops = {"der", "die", "das", "ein", "eine", "und", "oder", "aber", "in", "für", "mit"}

    lang_scores = {"en": 0, "es": 0, "fr": 0, "de": 0}
    for w in raw_words:
        w_lower = w.lower()
        if w_lower in es_stops: lang_scores["es"] += 1
        elif w_lower in fr_stops: lang_scores["fr"] += 1
        elif w_lower in de_stops: lang_scores["de"] += 1
        elif w_lower in STOP_WORDS: lang_scores["en"] += 1

    detected_lang = max(lang_scores, key=lang_scores.get)
    lang_names = {"en": "English", "es": "Spanish", "fr": "French", "de": "German"}

    if avg_sentence_len > 22 or (total_words and complex_words_count / total_words > 0.2):
        writing_style = "Academic / Technical"
        tone = "Formal"
    elif avg_sentence_len < 12:
        writing_style = "Conversational / Casual"
        tone = "Informal"
    else:
        writing_style = "Business Professional"
        tone = "Neutral"

    language_analysis = {
        "language": lang_names.get(detected_lang, "English"),
        "confidenceScore": 99.0,
    }

    # 4. Keyword and TF-IDF Scoring
    word_counts = Counter(clean_words)
    total_clean = len(clean_words) or 1
    
    keywords_list = []
    for word, count in word_counts.most_common(60):
        if len(word) <= 2: continue
        
        tf = count / total_clean
        idf = 1.5 + (1.0 / (count + 1))
        tf_idf = tf * idf * 10
        importance = min(99.0, float(count * 8 + len(word) * 2))
        
        pages_appeared = sorted(list(keyword_pages.get(word, set())))
        
        keywords_list.append({
            "keyword": word,
            "frequency": count,
            "tfIdfScore": round(tf_idf, 3),
            "importanceScore": round(importance, 1),
            "pages": pages_appeared[:5]
        })
        if len(keywords_list) >= 40: break

    # 6. Part of Speech (POS) Distribution
    pos_counts = {"Nouns": 0, "Verbs": 0, "Adjectives": 0, "Adverbs": 0, "Pronouns": 0, "Prepositions": 0, "Conjunctions": 0}
    pronouns = {"i", "me", "my", "we", "us", "our", "you", "he", "him", "she", "her", "it", "they"}
    preps = {"in", "on", "at", "to", "for", "of", "with", "by", "from", "into"}
    conjs = {"and", "but", "or", "so", "yet", "because"}

    for w in raw_words:
        w_lower = w.lower()
        if w_lower in pronouns: pos_counts["Pronouns"] += 1
        elif w_lower in preps: pos_counts["Prepositions"] += 1
        elif w_lower in conjs: pos_counts["Conjunctions"] += 1
        elif w_lower.endswith("ing") or w_lower.endswith("ed") or w_lower in ["is", "are", "was", "were", "be"]: pos_counts["Verbs"] += 1
        elif w_lower.endswith("ly"): pos_counts["Adverbs"] += 1
        elif w_lower.endswith("ful") or w_lower.endswith("able") or w_lower.endswith("ous"): pos_counts["Adjectives"] += 1
        else: pos_counts["Nouns"] += 1

    total_pos = sum(pos_counts.values()) or 1
    pos_distribution = {k: round((v / total_pos) * 100, 1) for k, v in pos_counts.items()}

    # 7. Tone & Writing Style
    pos_score = sum(1 for w in raw_words if w.lower() in POSITIVE_WORDS)
    neg_score = sum(1 for w in raw_words if w.lower() in NEGATIVE_WORDS)
    total_sentiment_words = pos_score + neg_score or 1
    
    if pos_score > neg_score * 1.5: sentiment = "Positive"
    elif neg_score > pos_score * 1.5: sentiment = "Negative"
    else: sentiment = "Neutral"

    subjective_pronouns = {"i", "me", "my", "we", "us", "our", "you"}
    subj_count = sum(1 for w in raw_words if w.lower() in subjective_pronouns)
    obj_ratio = subj_count / (total_words or 1)
    objectivity = "Low" if obj_ratio > 0.035 else ("Medium" if obj_ratio > 0.015 else "High")
    
    if vocab_richness > 0.35 and avg_sentence_len > 18:
        complexity = "High"
    elif vocab_richness > 0.25 and avg_sentence_len > 12:
        complexity = "Medium"
    else:
        complexity = "Low"

    sentiment_emotion = {
        "sentiment": sentiment,
        "tone": tone,
        "writingStyle": writing_style,
        "complexity": complexity,
        "objectivity": objectivity
    }

    # 8. Dynamic Topic Extraction modeling
    topics_list = []
    
    # Generate topics from top keywords
    top_kws = keywords_list[:5] if keywords_list else []
    total_freq = sum(kw["frequency"] for kw in top_kws) or 1
    
    for idx, kw in enumerate(top_kws):
        pct = (kw["frequency"] / total_freq) * 100
        # Give them some related subtopics from the rest of the keyword list
        sub_kws = [k["keyword"] for k in keywords_list[5:] if len(k["keyword"]) > 3]
        subs = sub_kws[idx*2 : idx*2+2]
        
        topics_list.append({
            "topic": kw["keyword"].capitalize(),
            "distribution": round(pct, 1),
            "importance": "High" if pct > 25 else "Medium",
            "subtopics": subs,
            "count": kw["frequency"]
        })
        
    if not topics_list:
        topics_list = [{"topic": "General", "distribution": 100.0, "importance": "High", "subtopics": [], "count": 1}]
        
    topics = {
        "mainTopic": topics_list[0]["topic"],
        "distribution": topics_list
    }

    return {
        "text_statistics": text_statistics,
        "readability_scores": readability_scores,
        "language_analysis": language_analysis,
        "keywords": keywords_list,
        "ner_results": ner_results,
        "pos_distribution": pos_distribution,
        "sentiment_emotion": sentiment_emotion,
        "topics": topics
    }
