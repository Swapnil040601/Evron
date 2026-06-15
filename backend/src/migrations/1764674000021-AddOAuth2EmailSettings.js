export class AddOAuth2EmailSettings1764674000021 {
  name = "AddOAuth2EmailSettings1764674000021";

  async up(queryRunner) {
    await queryRunner.query(`
      INSERT INTO settings (key, label, type, group_name, value, description) VALUES
        ('email_provider',       'Email Provider',            'select',   'Email', 'smtp',  'Choose how to send emails: SMTP, Google OAuth2, or Microsoft OAuth2'),
        ('google_client_id',     'Google Client ID',          'text',     'Email', '',      'OAuth2 Client ID from Google Cloud Console'),
        ('google_client_secret', 'Google Client Secret',      'password', 'Email', '',      'OAuth2 Client Secret from Google Cloud Console'),
        ('google_refresh_token', 'Google Refresh Token',      'password', 'Email', '',      'Refresh token obtained via Google OAuth2 consent flow'),
        ('google_sender_email',  'Google Sender Email',       'text',     'Email', '',      'Gmail address used to send emails (must match the OAuth2 account)'),
        ('ms_client_id',         'Microsoft App Client ID',   'text',     'Email', '',      'Application (client) ID from Azure AD app registration'),
        ('ms_client_secret',     'Microsoft Client Secret',   'password', 'Email', '',      'Client secret from Azure AD app registration'),
        ('ms_refresh_token',     'Microsoft Refresh Token',   'password', 'Email', '',      'Refresh token obtained via Microsoft OAuth2 consent flow'),
        ('ms_tenant_id',         'Microsoft Tenant ID',       'text',     'Email', '',      'Azure AD tenant ID (Directory ID) — use "common" for multi-tenant'),
        ('ms_sender_email',      'Microsoft Sender Email',    'text',     'Email', '',      'Outlook/Office365 address used to send emails')
      ON CONFLICT (key) DO NOTHING
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      DELETE FROM settings WHERE key IN (
        'email_provider','google_client_id','google_client_secret','google_refresh_token','google_sender_email',
        'ms_client_id','ms_client_secret','ms_refresh_token','ms_tenant_id','ms_sender_email'
      )
    `);
  }
}
