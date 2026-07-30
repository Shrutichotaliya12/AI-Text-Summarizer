import re
import math
from collections import Counter

# Synsets and vocabulary helpers for lexicons
STOP_WORDS = {
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", 
    "is", "are", "was", "were", "be", "been", "am", "it", "this", "that", "these", "those",
    "as", "from", "into", "through", "during", "then", "them", "they", "their", "he", "she", 
    "you", "your", "we", "our", "us", "i", "my", "me", "has", "have", "had", "do", "does", "did",
    "not", "no", "yes", "so", "up", "out", "about", "which", "who", "whom", "this", "that",
    "would", "should", "could", "will", "can", "their", "there"
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

EMOTION_LEXICON = {
    "happy": ["joy", "glad", "delight", "happy", "smile", "love", "succeed", "triumph", "pleasure", "celebrate"],
    "sad": ["grief", "sad", "sorrow", "cry", "mourn", "hurt", "pain", "unhappy", "depressed", "lonely"],
    "angry": ["rage", "fury", "angry", "mad", "hate", "irritated", "annoyed", "offend", "hostile", "outrage"],
    "fear": ["panic", "terror", "dread", "fear", "scared", "afraid", "danger", "threat", "anxiety", "worry"],
    "surprise": ["wonder", "amaze", "surprise", "shock", "astonish", "unexpected", "startle", "miracle", "marvel"]
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

def run_document_nlp_analysis(text: str, filename: str) -> dict:
    """Run comprehensive text stats, readability, sentiment, POS, NER, and topic modeling."""
    
    # 1. Cleaning & Tokens
    raw_words = re.findall(r"\b[a-zA-Z']+\b", text)
    clean_words = [w.lower() for w in raw_words if w.lower() not in STOP_WORDS]
    total_words = len(raw_words) if raw_words else 1
    total_clean_words = len(clean_words) if clean_words else 1

    sentences = [s.strip() for s in re.split(r"[.!?]+", text) if s.strip()]
    sentence_count = len(sentences) if sentences else 1
    paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
    paragraph_count = len(paragraphs) if paragraphs else 1

    # Text Statistics
    chars_total = len(text)
    chars_no_spaces = len(re.sub(r"\s", "", text))
    unique_words_count = len(set(clean_words))
    vocab_richness = float(unique_words_count / total_clean_words) if total_clean_words else 0.0
    avg_word_len = sum(len(w) for w in raw_words) / total_words if total_words else 0.0
    longest_word = max(raw_words, key=len) if raw_words else ""
    shortest_word = min(raw_words, key=len) if raw_words else ""
    avg_sentence_len = total_words / sentence_count
    avg_paragraph_len = total_words / paragraph_count
    whitespace_count = len(re.findall(r"\s", text))
    special_char_count = len(re.findall(r"[^\w\s]", text))
    number_count = len(re.findall(r"\d", text))
    uppercase_count = sum(1 for c in text if c.isupper())
    lowercase_count = sum(1 for c in text if c.islower())

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
        "whitespaceCount": whitespace_count,
        "specialCharacterCount": special_char_count,
        "numberCount": number_count,
        "uppercaseCount": uppercase_count,
        "lowercaseCount": lowercase_count
    }

    # 2. Readability Indices
    total_syllables = sum(count_syllables_in_word(w) for w in raw_words)
    complex_words_count = sum(1 for w in raw_words if count_syllables_in_word(w) >= 3)

    # Flesch Reading Ease
    fre = 206.835 - 1.015 * (total_words / sentence_count) - 84.6 * (total_syllables / total_words)
    fre = max(0.0, min(100.0, fre))

    # Flesch-Kincaid Grade
    fkg = 0.39 * (total_words / sentence_count) + 11.8 * (total_syllables / total_words) - 15.59
    fkg = max(0.0, fkg)

    # Gunning Fog Index
    gfi = 0.4 * ((total_words / sentence_count) + 100 * (complex_words_count / total_words))
    gfi = max(0.0, gfi)

    # SMOG Index
    smog = 1.043 * math.sqrt(complex_words_count * (30 / sentence_count)) + 3.1291

    # Coleman-Liau
    # L = avg letters per 100 words, S = avg sentences per 100 words
    l_val = (chars_no_spaces / total_words) * 100
    s_val = (sentence_count / total_words) * 100
    cli = 0.0588 * l_val - 0.296 * s_val - 15.8

    # Automated Readability Index
    ari = 4.71 * (chars_no_spaces / total_words) + 0.5 * (total_words / sentence_count) - 21.43

    # Qualitative indicators
    if fre > 90:
        difficulty = "Very Easy"
        edu_level = "5th Grade"
    elif fre > 80:
        difficulty = "Easy"
        edu_level = "6th Grade"
    elif fre > 70:
        difficulty = "Fairly Easy"
        edu_level = "7th Grade"
    elif fre > 60:
        difficulty = "Standard"
        edu_level = "8th-9th Grade"
    elif fre > 50:
        difficulty = "Fairly Difficult"
        edu_level = "High School"
    elif fre > 30:
        difficulty = "Difficult"
        edu_level = "College Student"
    else:
        difficulty = "Very Difficult"
        edu_level = "College Graduate"

    readability_scores = {
        "fleschReadingEase": round(fre, 1),
        "fleschKincaidGrade": round(fkg, 1),
        "gunningFogIndex": round(gfi, 1),
        "smogIndex": round(smog, 1),
        "colemanLiauIndex": round(cli, 1),
        "automatedReadabilityIndex": round(ari, 1),
        "readingDifficulty": difficulty,
        "estimatedEducationLevel": edu_level
    }

    # 3. Language detection
    # Check stop words overlap
    es_stops = {"el", "la", "los", "las", "un", "una", "y", "o", "pero", "en", "para", "con", "por", "es", "son", "fue"}
    fr_stops = {"le", "la", "les", "un", "une", "et", "ou", "mais", "dans", "pour", "avec", "par", "est", "sont"}
    de_stops = {"der", "die", "das", "ein", "eine", "und", "oder", "aber", "in", "für", "mit", "von", "ist", "sind"}

    lang_scores = {"en": 0, "es": 0, "fr": 0, "de": 0}
    for w in raw_words:
        w_lower = w.lower()
        if w_lower in es_stops: lang_scores["es"] += 1
        elif w_lower in fr_stops: lang_scores["fr"] += 1
        elif w_lower in de_stops: lang_scores["de"] += 1
        elif w_lower in STOP_WORDS: lang_scores["en"] += 1

    detected_lang = max(lang_scores, key=lang_scores.get)
    lang_confidence = 95.0 if lang_scores[detected_lang] > 2 else 99.0
    lang_names = {"en": "English", "es": "Spanish", "fr": "French", "de": "German"}

    # Style indicator
    if avg_sentence_len > 22 or complex_words_count / total_words > 0.2:
        writing_style = "Academic / Technical"
        tone = "Formal"
    elif avg_sentence_len < 12:
        writing_style = "Conversational / Casual"
        tone = "Informal"
    else:
        writing_style = "Business Professional"
        tone = "Formal"

    language_analysis = {
        "language": lang_names.get(detected_lang, "English"),
        "confidenceScore": lang_confidence,
        "writingStyle": writing_style,
        "tone": tone
    }

    # 4. Keyword and TF-IDF Scoring
    word_counts = Counter(clean_words)
    total_clean = len(clean_words) or 1
    
    keywords_list = []
    for word, count in word_counts.most_common(50):
        # Calculate a mock tf-idf score based on frequency
        tf = count / total_clean
        # standard fallback idf weight
        idf = 1.5 + (1.0 / (count + 1))
        tf_idf = tf * idf * 10
        
        # Keyword importance score
        importance = min(99.0, float(count * 8 + len(word) * 2))
        
        keywords_list.append({
            "keyword": word,
            "frequency": count,
            "tfIdfScore": round(tf_idf, 3),
            "importanceScore": round(importance, 1)
        })

    # 5. Named Entity Recognition (NER)
    ner_results = {
        "Person": [],
        "Organization": [],
        "Location": [],
        "Date": [],
        "Time": [],
        "Money": [],
        "Email": [],
        "Phone Number": [],
        "Website": [],
        "Product": [],
        "Technology": []
    }

    # Match raw values via patterns
    ner_results["Email"] = list(set(re.findall(r"\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b", text)))[:10]
    ner_results["Phone Number"] = list(set(re.findall(r"\b(?:\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}\b", text)))[:10]
    ner_results["Website"] = list(set(re.findall(r"\bhttps?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\S*\b", text)))[:10]
    ner_results["Money"] = list(set(re.findall(r"\b[$\u20ac\u00a3]\d+(?:,\d{3})*(?:\.\d{2})?\b", text)))[:10]
    ner_results["Date"] = list(set(re.findall(r"\b(?:\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})\b", text)))[:10]
    ner_results["Time"] = list(set(re.findall(r"\b\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\b", text)))[:10]

    # NLP Dictionary matching for nouns/capitalized words
    capitalized_runs = set(re.findall(r"\b[A-Z][a-z]+\b", text))
    for cap in capitalized_runs:
        if cap.lower() in STOP_WORDS:
            continue
            
        if cap.lower() in TECH_KEYWORDS:
            ner_results["Technology"].append(cap)
        elif cap in ["Google", "Microsoft", "Apple", "OpenAI", "Meta", "IBM", "Amazon"]:
            ner_results["Organization"].append(cap)
        elif cap in ["London", "Paris", "New York", "California", "Europe", "Asia", "America", "Tokyo", "Berlin"]:
            ner_results["Location"].append(cap)
        elif len(cap) > 3:
            ner_results["Person"].append(cap)

    # Clean duplicates and limit to 10 entities each category
    for cat in ner_results:
        ner_results[cat] = list(set(ner_results[cat]))[:10]

    # 6. Part of Speech (POS) Distribution
    # Lexical parsing mapping
    pos_counts = {"Nouns": 0, "Verbs": 0, "Adjectives": 0, "Adverbs": 0, "Pronouns": 0, "Prepositions": 0, "Conjunctions": 0}
    pronouns = {"i", "me", "my", "we", "us", "our", "you", "your", "he", "him", "his", "she", "her", "it", "they", "them", "their"}
    preps = {"in", "on", "at", "to", "for", "of", "with", "by", "from", "into", "through", "during", "under", "over"}
    conjs = {"and", "but", "or", "so", "yet", "for", "nor", "because", "although", "since", "unless"}

    for w in raw_words:
        w_lower = w.lower()
        if w_lower in pronouns:
            pos_counts["Pronouns"] += 1
        elif w_lower in preps:
            pos_counts["Prepositions"] += 1
        elif w_lower in conjs:
            pos_counts["Conjunctions"] += 1
        elif w_lower.endswith("ing") or w_lower.endswith("ed") or w_lower.endswith("es") or w_lower in ["is", "are", "was", "were", "be", "do", "have", "run", "make", "take"]:
            pos_counts["Verbs"] += 1
        elif w_lower.endswith("ly"):
            pos_counts["Adverbs"] += 1
        elif w_lower.endswith("ful") or w_lower.endswith("able") or w_lower.endswith("ive") or w_lower.endswith("ous") or w_lower in ["good", "bad", "great", "small", "large", "new", "old"]:
            pos_counts["Adjectives"] += 1
        else:
            pos_counts["Nouns"] += 1

    total_pos = sum(pos_counts.values()) or 1
    pos_distribution = {k: round((v / total_pos) * 100, 1) for k, v in pos_counts.items()}

    # 7. Sentiment & Emotion
    pos_score = sum(1 for w in raw_words if w.lower() in POSITIVE_WORDS)
    neg_score = sum(1 for w in raw_words if w.lower() in NEGATIVE_WORDS)
    total_sentiment_words = pos_score + neg_score or 1
    
    pos_pct = (pos_score / total_sentiment_words) * 100
    neg_pct = (neg_score / total_sentiment_words) * 100
    
    if pos_score > neg_score:
        sentiment = "Positive"
        sentiment_confidence = 70.0 + (pos_score - neg_score) * 2
    elif neg_score > pos_score:
        sentiment = "Negative"
        sentiment_confidence = 70.0 + (neg_score - pos_score) * 2
    else:
        sentiment = "Neutral"
        sentiment_confidence = 90.0

    sentiment_confidence = min(99.9, sentiment_confidence)

    # Emotions scores
    emotion_scores = {k: 0 for k in EMOTION_LEXICON}
    for w in raw_words:
        w_lower = w.lower()
        for emotion, keywords in EMOTION_LEXICON.items():
            if w_lower in keywords:
                emotion_scores[emotion] += 1

    total_emotions = sum(emotion_scores.values()) or 1
    emotion_pcts = {k: round((v / total_emotions) * 100, 1) for k, v in emotion_scores.items()}

    sentiment_emotion = {
        "sentiment": sentiment,
        "confidence": sentiment_confidence,
        "positive": round(pos_pct, 1) if pos_score > 0 else 10.0,
        "negative": round(neg_pct, 1) if neg_score > 0 else 5.0,
        "neutral": round(100.0 - (pos_pct if pos_score > 0 else 10.0) - (neg_pct if neg_score > 0 else 5.0), 1),
        "emotions": emotion_pcts
    }

    # 8. Topic Extraction modeling
    topics_list = []
    # Simple rule based categorizer
    tech_count = sum(1 for w in raw_words if w.lower() in TECH_KEYWORDS)
    biz_count = sum(1 for w in raw_words if w.lower() in BUSINESS_KEYWORDS)
    acad_count = sum(1 for w in raw_words if w.lower() in ACADEMIC_KEYWORDS)
    
    categories = [
        ("Technology & Frameworks", tech_count, ["System Architecture", "NLP Core", "API Routes"]),
        ("Business & Corporate Finances", biz_count, ["Quarterly Margins", "Operational Expenses", "Strategic Growth"]),
        ("Academic Research & Theories", acad_count, ["Methodology", "Empirical Analysis", "Hypothesis Verification"])
    ]
    
    categories.sort(key=lambda x: x[1], reverse=True)
    total_cat = sum(c[1] for c in categories) or 1
    
    for title, val, subs in categories:
        pct = (val / total_cat) * 100
        topics_list.append({
            "topic": title,
            "distribution": round(pct if val > 0 else 20.0, 1),
            "importance": "High" if val > total_cat * 0.4 else "Medium",
            "subtopics": subs
        })

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
