import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, ForeignKey, DateTime, LargeBinary
from sqlalchemy.orm import relationship
from app.shared.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_verified = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)
    role = Column(String, default="user")          # super_admin, admin, moderator, user
    status = Column(String, default="active")       # active, suspended, deactivated
    otp_secret = Column(String, nullable=True)
    otp_expiry = Column(DateTime, nullable=True)
    otp_sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    profile = relationship("Profile", uselist=False, back_populates="user", cascade="all, delete-orphan")
    settings = relationship("UserSettings", uselist=False, back_populates="user", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")
    summaries = relationship("Summary", back_populates="user", cascade="all, delete-orphan")

    rouge_reports = relationship("ROUGEReport", back_populates="user", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="user", cascade="all, delete-orphan")
    login_histories = relationship("LoginHistory", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    password_histories = relationship("PasswordHistory", cascade="all, delete-orphan")


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    name = Column(String, nullable=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    display_name = Column(String, nullable=True)
    username = Column(String, nullable=True, unique=True, index=True)
    bio = Column(Text, nullable=True)
    country = Column(String, nullable=True)
    state = Column(String, nullable=True)
    city = Column(String, nullable=True)
    timezone = Column(String, nullable=True)
    language = Column(String, default="en")
    theme = Column(String, default="dark")
    avatar = Column(String, nullable=True)          # URL or empty
    avatar_data = Column(Text, nullable=True)        # base64 image data
    avatar_mime = Column(String, nullable=True)      # e.g. image/png
    last_active = Column(DateTime, nullable=True)
    last_login = Column(DateTime, nullable=True)

    # Back populates
    user = relationship("User", back_populates="profile")


class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    display_name = Column(String, nullable=True)
    text = Column(Text, nullable=False)
    size = Column(String, nullable=False)
    type = Column(String, nullable=False)
    word_count = Column(Integer, nullable=False)
    char_count = Column(Integer, nullable=False)
    upload_time = Column(String, nullable=False)
    last_modified = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    status = Column(String, default="ready") # "ready", "processing", "error"
    tags = Column(String, nullable=True) # Comma separated
    notes = Column(Text, nullable=True)
    page_count = Column(Integer, default=1)
    original_file_bytes = Column(LargeBinary, nullable=True)
    is_favorite = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="documents")
    summaries = relationship("Summary", back_populates="document", cascade="all, delete-orphan")

    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")


class Summary(Base):
    __tablename__ = "summaries"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    document_id = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), nullable=True)
    title = Column(String, nullable=False)
    original_text = Column(Text, nullable=False)
    summary_text = Column(Text, nullable=False)
    model_used = Column(String, nullable=False)
    language = Column(String, nullable=False)
    confidence_score = Column(Float, nullable=False)
    compression_ratio = Column(Float, nullable=False)
    reading_time_saved = Column(Float, nullable=False)
    keywords = Column(String, nullable=False) # Comma separated
    is_favorite = Column(Boolean, default=False)
    latency = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="summaries")
    document = relationship("Document", back_populates="summaries")




class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    page_number = Column(Integer, default=1)

    # Relationships
    document = relationship("Document", back_populates="chunks")


class ROUGEReport(Base):
    __tablename__ = "rouge_reports"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    document_id = Column(String, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    candidate = Column(Text, nullable=False)
    reference = Column(Text, nullable=False)
    original_text = Column(Text, nullable=True)
    model_used = Column(String, nullable=True)
    
    # Precision, Recall, F1
    rouge1 = Column(Float, nullable=False)
    rouge2 = Column(Float, nullable=False)
    rougel = Column(Float, nullable=False)
    precision = Column(Float, default=0.0)
    recall = Column(Float, default=0.0)
    f1_score = Column(Float, default=0.0)
    
    # NLP parameters
    bleu = Column(Float, nullable=False)
    bert_score = Column(Float, nullable=False)
    meteor = Column(Float, nullable=False)
    quality_score = Column(Float, default=0.0)
    generation_time = Column(Float, default=0.0)
    
    comparison_metadata = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="rouge_reports")
    document = relationship("Document")


class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)

    # ── Core ─────────────────────────────────
    theme = Column(String, default="dark")              # dark | light | system
    language = Column(String, default="en")
    model_id = Column(String, default="distilbart")
    notifications_enabled = Column(Boolean, default=True)
    auto_save = Column(Boolean, default=True)
    storage_provider = Column(String, default="local")
    backup_enabled = Column(Boolean, default=True)
    security_level = Column(String, default="standard")
    openai_key = Column(String, nullable=True)
    hf_key = Column(String, nullable=True)
    enable_2fa = Column(Boolean, default=False)
    trash_clear_days = Column(Integer, default=30)

    # ── Appearance ───────────────────────────
    accent_color = Column(String, default="#6366f1")   # hex color
    font_size = Column(String, default="medium")        # small | medium | large
    sidebar_mode = Column(String, default="expanded")   # expanded | collapsed | auto
    compact_mode = Column(Boolean, default=False)
    animations_enabled = Column(Boolean, default=True)
    reduce_motion = Column(Boolean, default=False)
    rounded_corners = Column(Boolean, default=True)
    card_density = Column(String, default="comfortable")  # compact | comfortable | spacious

    # ── AI Preferences ───────────────────────
    summary_length = Column(String, default="medium")   # short | medium | long
    temperature = Column(Float, default=0.7)
    max_tokens = Column(Integer, default=512)
    reading_mode = Column(Boolean, default=False)
    response_style = Column(String, default="balanced") # concise | balanced | detailed
    creativity_level = Column(Float, default=0.5)       # 0.0–1.0
    auto_detect_language = Column(Boolean, default=True)
    streaming_responses = Column(Boolean, default=True)
    auto_save_summaries = Column(Boolean, default=True)
    auto_save_chats = Column(Boolean, default=True)
    auto_generate_titles = Column(Boolean, default=True)

    # ── Document Preferences ─────────────────
    auto_extract_text = Column(Boolean, default=True)
    auto_analyze_documents = Column(Boolean, default=False)
    auto_generate_summary = Column(Boolean, default=False)
    auto_run_rouge = Column(Boolean, default=False)
    auto_delete_temp = Column(Boolean, default=True)
    default_export_format = Column(String, default="pdf")  # pdf | docx | txt | md

    # ── Chat Settings ────────────────────────
    conversation_history = Column(Boolean, default=True)
    follow_up_suggestions = Column(Boolean, default=True)
    citations_enabled = Column(Boolean, default=True)
    markdown_rendering = Column(Boolean, default=True)
    code_highlighting = Column(Boolean, default=True)
    auto_scroll = Column(Boolean, default=True)
    message_timestamp = Column(Boolean, default=True)

    # ── Notification Preferences ─────────────
    email_notifications = Column(Boolean, default=True)
    toast_alerts = Column(Boolean, default=True)
    sound_alerts = Column(Boolean, default=True)
    desktop_notifications = Column(Boolean, default=False)
    weekly_summary = Column(Boolean, default=True)
    summary_alerts = Column(Boolean, default=True)
    upload_alerts = Column(Boolean, default=True)
    security_alerts = Column(Boolean, default=True)
    product_updates = Column(Boolean, default=False)
    analysis_alerts = Column(Boolean, default=True)
    rouge_alerts = Column(Boolean, default=True)
    chat_notifications = Column(Boolean, default=True)
    system_updates = Column(Boolean, default=True)
    maintenance_notices = Column(Boolean, default=True)

    # ── Privacy ──────────────────────────────
    save_conversation_history = Column(Boolean, default=True)
    document_retention = Column(Boolean, default=True)
    search_history = Column(Boolean, default=True)
    usage_analytics = Column(Boolean, default=True)
    diagnostic_data = Column(Boolean, default=False)
    personalized_recommendations = Column(Boolean, default=True)
    data_sharing = Column(Boolean, default=False)

    # ── Accessibility ─────────────────────────
    high_contrast = Column(Boolean, default=False)
    large_text = Column(Boolean, default=False)
    keyboard_navigation = Column(Boolean, default=True)
    screen_reader_support = Column(Boolean, default=False)
    focus_indicators = Column(Boolean, default=True)
    color_blind_mode = Column(Boolean, default=False)

    # ── Language & Region ─────────────────────
    timezone = Column(String, default="UTC")
    date_format = Column(String, default="MM/DD/YYYY")
    time_format = Column(String, default="12h")
    number_format = Column(String, default="1,000.00")

    # ── Keyboard Shortcuts ────────────────────
    shortcuts_enabled = Column(Boolean, default=True)
    quick_search_shortcut = Column(Boolean, default=True)
    quick_upload_shortcut = Column(Boolean, default=True)
    quick_summary_shortcut = Column(Boolean, default=True)
    quick_chat_shortcut = Column(Boolean, default=True)

    # ── Security Preferences ──────────────────
    session_timeout_minutes = Column(Integer, default=60)  # 0 = never
    auto_logout = Column(Boolean, default=False)
    security_notifications = Column(Boolean, default=True)
    trusted_devices = Column(Boolean, default=True)

    # Relationships
    user = relationship("User", back_populates="settings")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    action = Column(String, nullable=False)
    details = Column(String, nullable=True)
    module = Column(String, nullable=True)
    device = Column(String, nullable=True)
    browser = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="activity_logs")


class LoginHistory(Base):
    __tablename__ = "login_histories"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    browser = Column(String, nullable=True)
    os = Column(String, nullable=True)
    country = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    status = Column(String, default="success")  # success / failed
    last_activity = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="login_histories")


class PasswordHistory(Base):
    """Stores last N hashed passwords to prevent password reuse."""
    __tablename__ = "password_histories"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String, unique=True, index=True, nullable=False)
    device_info = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    is_revoked = Column(Boolean, default=False)

    # Relationships
    user = relationship("User", back_populates="refresh_tokens")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=True)
    text = Column(String, nullable=False)
    event_type = Column(String, nullable=True)
    priority = Column(String, default="medium")
    is_read = Column(Boolean, default=False)
    is_archived = Column(Boolean, default=False)
    is_pinned = Column(Boolean, default=False)
    source_module = Column(String, nullable=True)
    related_document_id = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="notifications")


class DocumentAnalysis(Base):
    __tablename__ = "document_analysis"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), unique=True, nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    text_statistics = Column(Text, nullable=False)
    readability_scores = Column(Text, nullable=False)
    language_analysis = Column(Text, nullable=False)
    keywords = Column(Text, nullable=False)
    ner_results = Column(Text, nullable=False)
    pos_distribution = Column(Text, nullable=False)
    sentiment_emotion = Column(Text, nullable=False)
    topics = Column(Text, nullable=False)
    summarization_analysis = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    document = relationship("Document")
    user = relationship("User")


class AdminAuditLog(Base):
    __tablename__ = "admin_audit_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    admin_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    admin_name = Column(String, nullable=False)
    action = Column(String, nullable=False)
    target = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    browser = Column(String, nullable=True)
    status = Column(String, default="success")  # success, failed
    timestamp = Column(DateTime, default=datetime.utcnow)

    admin = relationship("User")


class SystemConfiguration(Base):
    __tablename__ = "system_configurations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    key = Column(String, unique=True, index=True, nullable=False)
    value = Column(Text, nullable=False)
    description = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AdminAnnouncement(Base):
    __tablename__ = "admin_announcements"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    type = Column(String, default="announcement")  # announcement, maintenance, alert
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)


class BackupHistory(Base):
    __tablename__ = "backup_histories"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String, nullable=False)
    filepath = Column(String, nullable=False)
    filesize = Column(String, nullable=False)
    status = Column(String, default="completed")  # completed, failed
    created_at = Column(DateTime, default=datetime.utcnow)


