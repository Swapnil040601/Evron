export class BackfillCameraSessionsFromTracks1764674000006 {
    name = "BackfillCameraSessionsFromTracks1764674000006";

    async up(queryRunner) {
        await queryRunner.query(`
            INSERT INTO camera_sessions (
                session_uid,
                camera_id,
                user_id,
                unknown_face_id,
                confidence,
                start_time,
                end_time,
                status,
                image_path,
                created_on,
                updated_on
            )
            SELECT
                track_uid,
                camera_id,
                user_id,
                unknown_face_id,
                confidence,
                start_time,
                end_time,
                status,
                image_path,
                created_on,
                updated_on
            FROM camera_tracks
            ON CONFLICT (session_uid) DO NOTHING
        `);

        await queryRunner.query(`
            UPDATE attendances a
            SET in_camera_session_id = cs.id
            FROM camera_tracks ct
            INNER JOIN camera_sessions cs ON cs.session_uid = ct.track_uid
            WHERE a.in_camera_track_id = ct.id
              AND a.in_camera_session_id IS NULL
        `);

        await queryRunner.query(`
            UPDATE attendances a
            SET out_camera_session_id = cs.id
            FROM camera_tracks ct
            INNER JOIN camera_sessions cs ON cs.session_uid = ct.track_uid
            WHERE a.out_camera_track_id = ct.id
              AND a.out_camera_session_id IS NULL
        `);
    }

    async down() {
        // Backfill is intentionally not reversed to avoid deleting live session data.
    }
}
