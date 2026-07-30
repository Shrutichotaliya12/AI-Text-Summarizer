import sqlite3

def create_indexes():
    conn = sqlite3.connect('saas_summarizer.db')
    cursor = conn.cursor()
    
    indexes = [
        # Users
        "CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);",
        # Documents
        "CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);",
        "CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON documents(deleted_at);",
        # Summaries
        "CREATE INDEX IF NOT EXISTS idx_summaries_user_id ON summaries(user_id);",
        "CREATE INDEX IF NOT EXISTS idx_summaries_document_id ON summaries(document_id);",
        "CREATE INDEX IF NOT EXISTS idx_summaries_created_at ON summaries(created_at);",
        # Chats
        "CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);",
        "CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(created_at);",
        "CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);",
        # Activity Logs
        "CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);",
        "CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp);",
        # Notifications
        "CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);",
        "CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);",
        "CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);",
    ]
    
    for idx in indexes:
        try:
            cursor.execute(idx)
        except Exception as e:
            print(f"Failed to create index: {e}")

    conn.commit()
    conn.close()
    print("Database indexes created successfully.")

if __name__ == '__main__':
    create_indexes()
