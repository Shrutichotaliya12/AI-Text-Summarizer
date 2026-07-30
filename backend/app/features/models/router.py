from fastapi import APIRouter

router = APIRouter()

# Details for the 9 AI models
MODELS_CATALOG = [
    {
        "id": "t5",
        "name": "T5-Base",
        "architecture": "Encoder-Decoder (Transformer)",
        "capabilities": "Extractive/Abstractive Summarization & Translation",
        "quality_score": 85,
        "speed": "45 wps",
        "latency": "1.2s",
        "context_length": "512 tokens",
        "memory_usage": "2.4 GB",
        "recommended_use": "Standard articles, news briefs, general content",
        "best_doc_type": "News & Short Reports",
        "expected_quality": "High-fidelity summaries with low latency",
        "accuracy": 85,
        "memory": "2.4 GB",
        "rouge": "0.42 / 0.19 / 0.38",
        "bleu": 34.5,
        "bertScore": 0.88,
        "size": "890 MB",
        "downloadStatus": "downloaded",
        "availability": "active",
        "parameters": "Base 220M",
        "supported_languages": "English",
        "performance": "Standard",
        "documentation_url": "https://huggingface.co/docs",
        "installation_guide": "pip install transformers"
    },
    {
        "id": "bart",
        "name": "BART-Large-CNN",
        "architecture": "Sequence-to-Sequence (BART)",
        "capabilities": "High-fidelity CNN news and article summarization",
        "quality_score": 89,
        "speed": "35 wps",
        "latency": "1.8s",
        "context_length": "1024 tokens",
        "memory_usage": "4.1 GB",
        "recommended_use": "CNN articles, long reports, and news summaries",
        "best_doc_type": "Structured Articles",
        "expected_quality": "Highly coherent human-like abstractive summary",
        "accuracy": 89,
        "memory": "4.1 GB",
        "rouge": "0.45 / 0.22 / 0.41",
        "bleu": 37.2,
        "bertScore": 0.91,
        "size": "1.62 GB",
        "downloadStatus": "downloaded",
        "availability": "active",
        "parameters": "Large 406M",
        "supported_languages": "English",
        "performance": "Standard",
        "documentation_url": "https://huggingface.co/docs",
        "installation_guide": "pip install transformers"
    },
    {
        "id": "pegasus",
        "name": "PEGASUS-Large",
        "architecture": "Gap-Sentence Generation Transformer",
        "capabilities": "Premium abstractive document understanding",
        "quality_score": 91,
        "speed": "18 wps",
        "latency": "3.2s",
        "context_length": "1024 tokens",
        "memory_usage": "5.6 GB",
        "recommended_use": "Academic publications, research reviews, papers",
        "best_doc_type": "Scientific Papers",
        "expected_quality": "Extremely detailed semantic abstracts",
        "accuracy": 91,
        "memory": "5.6 GB",
        "rouge": "0.47 / 0.24 / 0.43",
        "bleu": 39.0,
        "bertScore": 0.93,
        "size": "2.2 GB",
        "downloadStatus": "not_downloaded",
        "availability": "inactive",
        "parameters": "Large 568M",
        "supported_languages": "English",
        "performance": "Standard",
        "documentation_url": "https://huggingface.co/docs",
        "installation_guide": "pip install transformers"
    },
    {
        "id": "distilbart",
        "name": "DistilBART-CNN-12-6",
        "architecture": "Distilled Sequence-to-Sequence",
        "capabilities": "Ultra-fast low-resource summarization",
        "quality_score": 82,
        "speed": "85 wps",
        "latency": "0.6s",
        "context_length": "1024 tokens",
        "memory_usage": "1.2 GB",
        "recommended_use": "Real-time updates, microblogs, rapid drafts",
        "best_doc_type": "Quick Blogs & Notes",
        "expected_quality": "Good summarization with maximum speed",
        "accuracy": 82,
        "memory": "1.2 GB",
        "rouge": "0.40 / 0.17 / 0.36",
        "bleu": 31.8,
        "bertScore": 0.86,
        "size": "450 MB",
        "downloadStatus": "downloaded",
        "availability": "active",
        "parameters": "Distil 306M",
        "supported_languages": "English",
        "performance": "Standard",
        "documentation_url": "https://huggingface.co/docs",
        "installation_guide": "pip install transformers"
    },
    {
        "id": "flant5",
        "name": "FLAN-T5-Large",
        "architecture": "Instruction-tuned T5",
        "capabilities": "Instruction-based summarization and Q&A tasks",
        "quality_score": 88,
        "speed": "30 wps",
        "latency": "2.1s",
        "context_length": "2048 tokens",
        "memory_usage": "3.8 GB",
        "recommended_use": "Key bullet extraction, instructional content",
        "best_doc_type": "Manuals & Instructions",
        "expected_quality": "High accuracy following custom guidelines",
        "accuracy": 88,
        "memory": "3.8 GB",
        "rouge": "0.44 / 0.21 / 0.40",
        "bleu": 36.8,
        "bertScore": 0.90,
        "size": "1.5 GB",
        "downloadStatus": "not_downloaded",
        "availability": "inactive",
        "parameters": "Large 783M",
        "supported_languages": "English",
        "performance": "Standard",
        "documentation_url": "https://huggingface.co/docs",
        "installation_guide": "pip install transformers"
    },
    {
        "id": "llama",
        "name": "Llama-3-8B-Instruct",
        "architecture": "Autoregressive Decoder-Only LLM",
        "capabilities": "High-reasoning general LLM summarization and chat",
        "quality_score": 94,
        "speed": "12 wps",
        "latency": "5.4s",
        "context_length": "8192 tokens",
        "memory_usage": "16.2 GB",
        "recommended_use": "Legal briefs, complex medical files, financial docs",
        "best_doc_type": "Contracts & Reports",
        "expected_quality": "State-of-the-Art precision summary & QA",
        "accuracy": 94,
        "memory": "16.2 GB",
        "rouge": "0.52 / 0.28 / 0.48",
        "bleu": 44.5,
        "bertScore": 0.96,
        "size": "4.8 GB",
        "downloadStatus": "not_downloaded",
        "availability": "inactive",
        "parameters": "8B",
        "supported_languages": "English",
        "performance": "Standard",
        "documentation_url": "https://huggingface.co/docs",
        "installation_guide": "pip install transformers"
    },
    {
        "id": "gemma",
        "name": "Gemma-2B-IT",
        "architecture": "Lightweight Decoder-Only Transformer",
        "capabilities": "Balanced latency and reasoning instruction model",
        "quality_score": 86,
        "speed": "25 wps",
        "latency": "2.8s",
        "context_length": "8192 tokens",
        "memory_usage": "5.2 GB",
        "recommended_use": "Interactive chatbot, conversational summaries",
        "best_doc_type": "Transcripts & Discussions",
        "expected_quality": "Cohesive summaries with dialogue structure",
        "accuracy": 86,
        "memory": "5.2 GB",
        "rouge": "0.43 / 0.20 / 0.39",
        "bleu": 35.1,
        "bertScore": 0.89,
        "size": "1.8 GB",
        "downloadStatus": "not_downloaded",
        "availability": "inactive",
        "parameters": "2B",
        "supported_languages": "English",
        "performance": "Standard",
        "documentation_url": "https://huggingface.co/docs",
        "installation_guide": "pip install transformers"
    },
    {
        "id": "mistral",
        "name": "Mistral-7B-v0.2",
        "architecture": "Attention-grouped Autoregressive LLM",
        "capabilities": "High context reasoning & abstractive synthesis",
        "quality_score": 93,
        "speed": "15 wps",
        "latency": "4.8s",
        "context_length": "32768 tokens",
        "memory_usage": "14.8 GB",
        "recommended_use": "Deep search, research papers compilation",
        "best_doc_type": "Books & Technical Manuals",
        "expected_quality": "Excellent context retention summary",
        "accuracy": 93,
        "memory": "14.8 GB",
        "rouge": "0.50 / 0.26 / 0.46",
        "bleu": 42.8,
        "bertScore": 0.95,
        "size": "4.1 GB",
        "downloadStatus": "not_downloaded",
        "availability": "inactive",
        "parameters": "7B",
        "supported_languages": "English",
        "performance": "Standard",
        "documentation_url": "https://huggingface.co/docs",
        "installation_guide": "pip install transformers"
    },
    {
        "id": "phi",
        "name": "Phi-3-Mini",
        "architecture": "Autoregressive SLM (Small Language Model)",
        "capabilities": "High speed reasoning summaries and math logic",
        "quality_score": 87,
        "speed": "28 wps",
        "latency": "2.4s",
        "context_length": "4096 tokens",
        "memory_usage": "7.2 GB",
        "recommended_use": "Mathematical briefs, logical code walkthroughs",
        "best_doc_type": "Logic & Math Papers",
        "expected_quality": "Concise summary preserving logical order",
        "accuracy": 87,
        "memory": "7.2 GB",
        "rouge": "0.44 / 0.21 / 0.40",
        "bleu": 35.8,
        "bertScore": 0.90,
        "size": "2.2 GB",
        "downloadStatus": "not_downloaded",
        "availability": "inactive",
        "parameters": "3.8B",
        "supported_languages": "English",
        "performance": "Standard",
        "documentation_url": "https://huggingface.co/docs",
        "installation_guide": "pip install transformers"
    }
]

@router.get("/available")
def list_models():
    return {"models": MODELS_CATALOG}

@router.post("/download/{model_id}")
def download_model(model_id: str):
    # Triggers download status switches
    for model in MODELS_CATALOG:
        if model["id"] == model_id:
            model["downloadStatus"] = "downloaded"
            model["availability"] = "active"
            return {"status": "success", "message": f"Model {model_id} downloaded successfully."}
    return {"status": "error", "message": "Model not found."}

@router.get("/ready")
def models_ready():
    return {
        "status": "ready",
        "database": "connected",
        "ai": "connected",
        "auth": "connected",
        "email": "connected",
        "storage": "connected"
    }

@router.post("/activate/{model_id}")
def activate_model(model_id: str):
    for model in MODELS_CATALOG:
        if model["id"] == model_id:
            if model["downloadStatus"] != "downloaded":
                return {"status": "error", "message": "Model must be downloaded first."}
            model["availability"] = "active"
            return {"status": "success", "message": f"Model {model_id} activated successfully."}
    return {"status": "error", "message": "Model not found."}

@router.post("/deactivate/{model_id}")
def deactivate_model(model_id: str):
    for model in MODELS_CATALOG:
        if model["id"] == model_id:
            model["availability"] = "inactive"
            return {"status": "success", "message": f"Model {model_id} deactivated successfully."}
    return {"status": "error", "message": "Model not found."}
