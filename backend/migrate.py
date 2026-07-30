import os
import sqlite3

def upgrade_db():
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'saas_summarizer.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Notifications columns
    try: cursor.execute("ALTER TABLE notifications ADD COLUMN title VARCHAR")
    except: pass
    try: cursor.execute("ALTER TABLE notifications ADD COLUMN event_type VARCHAR")
    except: pass
    try: cursor.execute("ALTER TABLE notifications ADD COLUMN priority VARCHAR DEFAULT 'medium'")
    except: pass
    try: cursor.execute("ALTER TABLE notifications ADD COLUMN is_archived BOOLEAN DEFAULT 0")
    except: pass
    try: cursor.execute("ALTER TABLE notifications ADD COLUMN is_pinned BOOLEAN DEFAULT 0")
    except: pass
    try: cursor.execute("ALTER TABLE notifications ADD COLUMN source_module VARCHAR")
    except: pass
    try: cursor.execute("ALTER TABLE notifications ADD COLUMN related_document_id VARCHAR")
    except: pass
    try: cursor.execute("ALTER TABLE notifications ADD COLUMN related_chat_id VARCHAR")
    except: pass
    
    # ActivityLog columns
    try: cursor.execute("ALTER TABLE activity_logs ADD COLUMN module VARCHAR")
    except: pass
    try: cursor.execute("ALTER TABLE activity_logs ADD COLUMN device VARCHAR")
    except: pass
    try: cursor.execute("ALTER TABLE activity_logs ADD COLUMN browser VARCHAR")
    except: pass
    try: cursor.execute("ALTER TABLE activity_logs ADD COLUMN ip_address VARCHAR")
    except: pass

    conn.commit()
    conn.close()
    print("DB migration applied successfully.")

if __name__ == '__main__':
    upgrade_db()
