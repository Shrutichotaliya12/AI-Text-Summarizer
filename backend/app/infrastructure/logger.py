import logging
import json
from datetime import datetime, timezone

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_obj = {
            "timestamp": datetime.now(timezone.utc).replace(tzinfo=None).isoformat() + "Z",
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "funcName": record.funcName,
            "lineNo": record.lineno,
        }
        if hasattr(record, "request_id"):
            log_obj["request_id"] = record.request_id
        return json.dumps(log_obj)

def get_logger(name: str):
    logger = logging.getLogger(name)
    if not logger.handlers:
        import os
        # Console Handler
        handler = logging.StreamHandler()
        handler.setFormatter(JSONFormatter())
        logger.addHandler(handler)
        
        # File Handler
        try:
            os.makedirs("logs", exist_ok=True)
            file_handler = logging.FileHandler("logs/app.log", encoding="utf-8")
            file_handler.setFormatter(JSONFormatter())
            logger.addHandler(file_handler)
        except OSError:
            pass # Skip file logging if filesystem is read-only
        except Exception as e:
            print(f"Failed to initialize file logger: {e}")
            
        logger.setLevel(logging.INFO)
    return logger

logger = get_logger("saas_summarizer")
