import asyncio
import asyncpg
from supabase import create_client, Client
from typing import List, Dict, Any
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

NEW_DB_URL = os.getenv("NEW_DATABASE_URL")


class DataMigrator:
    def __init__(self):
        self.conn = None
        self.stats = {
            'organizations': 0,
            'profiles': 0,
            'attendance_records': 0,
            'recording_sessions': 0,
            'screenshots': 0,
            'audio_recordings': 0,
            'productivity_metrics': 0,
            'work_hours_settings': 0,
        }

    async def connect_target_db(self):
        self.conn = await asyncpg.connect(NEW_DB_URL)
        print("Connected to target database")

    async def migrate_organizations(self):
        print("\n[1/8] Migrating organizations...")

        result = supabase.table('profiles').select('organization_id').execute()
        org_ids = list(set([r['organization_id'] for r in result.data if r.get('organization_id')]))

        for org_id in org_ids:
            await self.conn.execute('''
                INSERT INTO organizations (id, name, slug, created_at)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (id) DO NOTHING
            ''', org_id, f'Organization {org_id[:8]}', f'org-{org_id[:8]}', datetime.utcnow())
            self.stats['organizations'] += 1

        print(f"Migrated {self.stats['organizations']} organizations")

    async def migrate_profiles(self):
        print("\n[2/8] Migrating profiles...")

        offset = 0
        batch_size = 1000

        while True:
            result = supabase.table('profiles').select('*').range(offset, offset + batch_size - 1).execute()
            profiles = result.data

            if not profiles:
                break

            for profile in profiles:
                await self.conn.execute('''
                    INSERT INTO profiles (
                        id, email, password_hash, name, department, role,
                        organization_id, hourly_rate, is_active, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    ON CONFLICT (id) DO UPDATE SET
                        email = EXCLUDED.email,
                        name = EXCLUDED.name,
                        updated_at = EXCLUDED.updated_at
                ''',
                    profile['id'],
                    profile['email'],
                    profile.get('password_hash', ''),
                    profile.get('name'),
                    profile.get('department'),
                    profile.get('role', 'user'),
                    profile['organization_id'],
                    profile.get('hourly_rate'),
                    True,
                    profile.get('created_at', datetime.utcnow()),
                    profile.get('updated_at', datetime.utcnow())
                )
                self.stats['profiles'] += 1

            offset += batch_size
            print(f"  Processed {offset} profiles...")

        print(f"Migrated {self.stats['profiles']} profiles")

    async def migrate_attendance_records(self):
        print("\n[3/8] Migrating attendance records...")

        offset = 0
        batch_size = 1000

        while True:
            result = supabase.table('attendance_records').select('*').range(offset, offset + batch_size - 1).execute()
            records = result.data

            if not records:
                break

            for record in records:
                await self.conn.execute('''
                    INSERT INTO attendance_records (
                        id, user_id, organization_id, date,
                        clock_in_time, clock_out_time,
                        first_activity_time, last_activity_time,
                        is_late, late_by_minutes, status,
                        auto_clocked_in, clock_in_verified,
                        created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                    ON CONFLICT (user_id, organization_id, date) DO UPDATE SET
                        clock_out_time = EXCLUDED.clock_out_time,
                        updated_at = EXCLUDED.updated_at
                ''',
                    record['id'],
                    record['user_id'],
                    record['organization_id'],
                    record['date'],
                    record.get('clock_in_time'),
                    record.get('clock_out_time'),
                    record.get('first_activity_time'),
                    record.get('last_activity_time'),
                    record.get('is_late', False),
                    record.get('late_by_minutes', 0),
                    record.get('status', 'present'),
                    record.get('auto_clocked_in', False),
                    record.get('clock_in_verified', True),
                    record.get('created_at', datetime.utcnow()),
                    record.get('updated_at', datetime.utcnow())
                )
                self.stats['attendance_records'] += 1

            offset += batch_size
            print(f"  Processed {offset} attendance records...")

        print(f"Migrated {self.stats['attendance_records']} attendance records")

    async def migrate_recording_sessions(self):
        print("\n[4/8] Migrating recording sessions...")

        offset = 0
        batch_size = 1000

        while True:
            result = supabase.table('recording_sessions').select('*').range(offset, offset + batch_size - 1).execute()
            sessions = result.data

            if not sessions:
                break

            for session in sessions:
                await self.conn.execute('''
                    INSERT INTO recording_sessions (
                        id, user_id, organization_id,
                        session_start_time, session_end_time,
                        total_duration_seconds, total_chunks,
                        total_chunk_duration_seconds, is_active,
                        created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    ON CONFLICT (id) DO NOTHING
                ''',
                    session['id'],
                    session['user_id'],
                    session['organization_id'],
                    session['session_start_time'],
                    session.get('session_end_time'),
                    session.get('total_duration_seconds', 0),
                    session.get('total_chunks', 0),
                    session.get('total_chunk_duration_seconds', 0),
                    session.get('session_end_time') is None,
                    session.get('created_at', datetime.utcnow()),
                    session.get('updated_at', datetime.utcnow())
                )
                self.stats['recording_sessions'] += 1

            offset += batch_size
            print(f"  Processed {offset} sessions...")

        print(f"Migrated {self.stats['recording_sessions']} recording sessions")

    async def migrate_screenshots(self):
        print("\n[5/8] Migrating screenshots...")

        offset = 0
        batch_size = 1000

        while True:
            result = supabase.table('screenshots').select('*').range(offset, offset + batch_size - 1).execute()
            screenshots = result.data

            if not screenshots:
                break

            for screenshot in screenshots:
                await self.conn.execute('''
                    INSERT INTO screenshots (
                        id, user_id, organization_id, session_id,
                        filename, file_url, storage_provider,
                        is_deleted, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (id) DO NOTHING
                ''',
                    screenshot['id'],
                    screenshot['user_id'],
                    screenshot['organization_id'],
                    screenshot.get('session_id'),
                    screenshot['filename'],
                    screenshot['file_url'],
                    screenshot.get('storage_provider', 'backblaze'),
                    False,
                    screenshot.get('created_at', datetime.utcnow())
                )
                self.stats['screenshots'] += 1

            offset += batch_size
            print(f"  Processed {offset} screenshots...")

        print(f"Migrated {self.stats['screenshots']} screenshots")

    async def migrate_audio_recordings(self):
        print("\n[6/8] Migrating audio recordings...")

        try:
            result = supabase.table('audio_recordings').select('*').limit(1).execute()
        except Exception:
            print("  audio_recordings table not found in Supabase, skipping...")
            return

        offset = 0
        batch_size = 1000

        while True:
            result = supabase.table('audio_recordings').select('*').range(offset, offset + batch_size - 1).execute()
            recordings = result.data

            if not recordings:
                break

            for recording in recordings:
                await self.conn.execute('''
                    INSERT INTO audio_recordings (
                        id, user_id, organization_id, session_id,
                        filename, file_url, duration_seconds,
                        storage_provider, is_deleted, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    ON CONFLICT (id) DO NOTHING
                ''',
                    recording['id'],
                    recording['user_id'],
                    recording['organization_id'],
                    recording.get('session_id'),
                    recording['filename'],
                    recording['file_url'],
                    recording.get('duration_seconds'),
                    recording.get('storage_provider', 'backblaze'),
                    False,
                    recording.get('created_at', datetime.utcnow())
                )
                self.stats['audio_recordings'] += 1

            offset += batch_size
            print(f"  Processed {offset} audio recordings...")

        print(f"Migrated {self.stats['audio_recordings']} audio recordings")

    async def migrate_productivity_metrics(self):
        print("\n[7/8] Migrating productivity metrics...")

        try:
            result = supabase.table('productivity_metrics').select('*').limit(1).execute()
        except Exception:
            print("  productivity_metrics table not found in Supabase, skipping...")
            return

        offset = 0
        batch_size = 1000

        while True:
            result = supabase.table('productivity_metrics').select('*').range(offset, offset + batch_size - 1).execute()
            metrics = result.data

            if not metrics:
                break

            for metric in metrics:
                await self.conn.execute('''
                    INSERT INTO productivity_metrics (
                        id, user_id, organization_id, date,
                        focus_time_seconds, idle_time_seconds,
                        active_time_seconds, productivity_score,
                        created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    ON CONFLICT (user_id, organization_id, date) DO UPDATE SET
                        focus_time_seconds = EXCLUDED.focus_time_seconds,
                        updated_at = EXCLUDED.updated_at
                ''',
                    metric['id'],
                    metric['user_id'],
                    metric['organization_id'],
                    metric['date'],
                    metric.get('focus_time_seconds', 0),
                    metric.get('idle_time_seconds', 0),
                    metric.get('active_time_seconds', 0),
                    metric.get('productivity_score'),
                    metric.get('created_at', datetime.utcnow()),
                    metric.get('updated_at', datetime.utcnow())
                )
                self.stats['productivity_metrics'] += 1

            offset += batch_size
            print(f"  Processed {offset} productivity metrics...")

        print(f"Migrated {self.stats['productivity_metrics']} productivity metrics")

    async def migrate_work_hours_settings(self):
        print("\n[8/8] Migrating work hours settings...")

        try:
            result = supabase.table('work_hours_settings').select('*').execute()
            settings = result.data

            for setting in settings:
                await self.conn.execute('''
                    INSERT INTO work_hours_settings (
                        id, organization_id, work_start_time, work_end_time,
                        late_threshold_minutes, break_duration_minutes,
                        created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (organization_id) DO UPDATE SET
                        work_start_time = EXCLUDED.work_start_time,
                        updated_at = EXCLUDED.updated_at
                ''',
                    setting['id'],
                    setting['organization_id'],
                    setting.get('work_start_time', '09:00:00'),
                    setting.get('work_end_time', '17:00:00'),
                    setting.get('late_threshold_minutes', 15),
                    setting.get('break_duration_minutes', 60),
                    setting.get('created_at', datetime.utcnow()),
                    setting.get('updated_at', datetime.utcnow())
                )
                self.stats['work_hours_settings'] += 1

        except Exception as e:
            print(f"  work_hours_settings table not found or error: {e}")

        print(f"Migrated {self.stats['work_hours_settings']} work hours settings")

    async def verify_migration(self):
        print("\nVerifying migration...")

        for table, count in self.stats.items():
            db_count = await self.conn.fetchval(f'SELECT COUNT(*) FROM {table}')
            if db_count == count:
                print(f"  {table}: {db_count} records (matches)")
            else:
                print(f"  {table}: {db_count} in DB vs {count} migrated (mismatch)")

    async def run(self):
        print("=" * 60)
        print("Starting Supabase to PostgreSQL Migration")
        print("=" * 60)

        try:
            await self.connect_target_db()
            await self.migrate_organizations()
            await self.migrate_profiles()
            await self.migrate_attendance_records()
            await self.migrate_recording_sessions()
            await self.migrate_screenshots()
            await self.migrate_audio_recordings()
            await self.migrate_productivity_metrics()
            await self.migrate_work_hours_settings()
            await self.verify_migration()

            print("\n" + "=" * 60)
            print("Migration completed successfully")
            print("=" * 60)
            print("\nFinal Statistics:")
            for table, count in self.stats.items():
                print(f"  {table}: {count}")

        except Exception as e:
            print(f"\nMigration failed: {e}")
            raise
        finally:
            if self.conn:
                await self.conn.close()


if __name__ == "__main__":
    migrator = DataMigrator()
    asyncio.run(migrator.run())
