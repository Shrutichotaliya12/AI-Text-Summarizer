import re
import math
from collections import Counter

# Standard English stop words to filter out noisy terms
STOP_WORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can't",
    "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
    "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having",
    "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", "him", "himself", "his", "how",
    "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself",
    "let's", "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only",
    "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd",
    "she'll", "she's", "should", "shouldn't", "so", "some", "such", "than", "that", "that's", "the", "their",
    "theirs", "them", "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll", "they're",
    "they've", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we",
    "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's", "where", "where's",
    "which", "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you",
    "you'd", "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves"
}

def clean_and_tokenize(text: str) -> list[str]:
    """Lowercase, strip special characters, and split text into tokens."""
    tokens = re.findall(r"\b\w{2,}\b", text.lower())
    return [t for t in tokens if t not in STOP_WORDS]

def split_into_chunks(text: str, filename: str, chunk_size: int = 150) -> list[dict]:
    """Split text into structured chunks of rough word count with page mapping."""
    paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
    chunks = []
    
    current_chunk = []
    current_word_count = 0
    page_number = 1
    chunk_index = 0

    for p in paragraphs:
        # Detect simple PDF page markers if PyPDF outputs them
        if "--- Page" in p or "[Page " in p:
            page_number += 1
            
        words = p.split()
        if not words:
            continue
            
        current_chunk.append(p)
        current_word_count += len(words)
        
        if current_word_count >= chunk_size:
            chunk_text = "\n".join(current_chunk)
            chunks.append({
                "chunk_index": chunk_index,
                "text": chunk_text,
                "page_number": page_number
            })
            chunk_index += 1
            current_chunk = []
            current_word_count = 0

    # Remaining items
    if current_chunk:
        chunk_text = "\n".join(current_chunk)
        chunks.append({
            "chunk_index": chunk_index,
            "text": chunk_text,
            "page_number": page_number
        })
        
    return chunks

def get_cosine_similarity(vec1: dict, vec2: dict) -> float:
    """Calculate the cosine similarity between two term frequency vectors."""
    intersection = set(vec1.keys()) & set(vec2.keys())
    if not intersection:
        return 0.0
        
    dot_product = sum(vec1[x] * vec2[x] for x in intersection)
    
    sum1 = sum(val ** 2 for val in vec1.values())
    sum2 = sum(val ** 2 for val in vec2.values())
    
    denominator = math.sqrt(sum1) * math.sqrt(sum2)
    if not denominator:
        return 0.0
        
    return float(dot_product) / denominator

def score_and_rank_chunks(query: str, chunks_list: list, limit: int = 4) -> list:
    """Tokenize query and rank database chunks using Term Frequency vectors similarity."""
    query_tokens = clean_and_tokenize(query)
    if not query_tokens:
        return [(c, 0.0) for c in chunks_list[:limit]]
        
    query_vector = Counter(query_tokens)
    
    ranked = []
    for chunk in chunks_list:
        chunk_tokens = clean_and_tokenize(chunk.text)
        chunk_vector = Counter(chunk_tokens)
        
        # Calculate similarity
        score = get_cosine_similarity(query_vector, chunk_vector)
        # Give a small boost if an exact query word appears verbatim
        if any(qt in chunk.text.lower() for qt in query_tokens):
            score += 0.05
            
        ranked.append((chunk, score))
        
    # Sort by descending score
    ranked.sort(key=lambda x: x[1], reverse=True)
    return ranked[:limit]
