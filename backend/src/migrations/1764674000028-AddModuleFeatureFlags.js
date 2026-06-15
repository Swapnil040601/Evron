export class AddModuleFeatureFlags1764674000028 {
  name = "AddModuleFeatureFlags1764674000028";

  async up(queryRunner) {
    await queryRunner.query(`
      INSERT INTO settings (key, label, type, group_name, value, description) VALUES
      ('enable_ai_monitoring',              'AI Monitoring Module',             'boolean', 'Features', 'true',  'Enables cameras, tracks, unknown/employee monitoring and AI camera configuration'),
      ('enable_ai_playground',              'AI Playground Module',             'boolean', 'Features', 'true',  'Enables the AI Playground image testing page'),
      ('enable_hrms',                       'HRMS Module',                      'boolean', 'Features', 'true',  'Enables attendance, monthly attendance, leave, office visits, reports, shifts and holidays'),
      ('enable_food_coupons',               'Food Coupons Module',              'boolean', 'Features', 'true',  'Enables canteen and meal coupon tracking'),
      ('enable_nvr_monitoring',             'NVR Monitoring Module',            'boolean', 'Features', 'true',  'Enables NVR management and NVR camera setup'),
      ('enable_playback',                   'Playback Module',                  'boolean', 'Features', 'true',  'Enables NVR playback and clip download'),
      ('enable_live_view',                  'Live View Module',                 'boolean', 'Features', 'true',  'Enables the live camera wall'),
      ('enable_live_view_ai_overlay',       'Live View AI Overlay',             'boolean', 'Features', 'true',  'Shows the AI overlay toggle on Live View'),
      ('enable_live_view_saved_views',      'Live View Custom Views',           'boolean', 'Features', 'true',  'Allows saving named live camera groups'),
      ('enable_live_view_slideshow',        'Live View Slideshow',              'boolean', 'Features', 'true',  'Allows automatic page rotation in Live View'),
      ('enable_live_view_full_page',        'Live View Full Page Mode',         'boolean', 'Features', 'true',  'Allows opening Live View as a full-page wall'),
      ('enable_live_view_layout_controls',  'Live View Layout Controls',        'boolean', 'Features', 'true',  'Allows changing preset and custom grid layouts')
      ON CONFLICT (key) DO NOTHING
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      DELETE FROM settings WHERE key IN (
        'enable_ai_monitoring',
        'enable_ai_playground',
        'enable_hrms',
        'enable_food_coupons',
        'enable_nvr_monitoring',
        'enable_playback',
        'enable_live_view',
        'enable_live_view_ai_overlay',
        'enable_live_view_saved_views',
        'enable_live_view_slideshow',
        'enable_live_view_full_page',
        'enable_live_view_layout_controls'
      )
    `);
  }
}
