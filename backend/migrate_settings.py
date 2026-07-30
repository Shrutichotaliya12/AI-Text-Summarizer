import sqlite3

def upgrade_db_settings():
    conn = sqlite3.connect('saas_summarizer.db')
    cursor = conn.cursor()
    
    try: cursor.execute("ALTER TABLE user_settings ADD COLUMN toast_alerts BOOLEAN DEFAULT 1")
    except: pass
    try: cursor.execute("ALTER TABLE user_settings ADD COLUMN sound_alerts BOOLEAN DEFAULT 1")
    except: pass
    try: cursor.execute("ALTER TABLE user_settings ADD COLUMN desktop_notifications BOOLEAN DEFAULT 0")
    except: pass
    try: cursor.execute("ALTER TABLE user_settings ADD COLUMN weekly_summary BOOLEAN DEFAULT 1")
    except: pass

    conn.commit()
    conn.close()
    print("DB settings migration applied successfully.")

if __name__ == '__main__':
    upgrade_db_settings()
