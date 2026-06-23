import bcrypt from "bcryptjs";

export class ResetAllUserPasswords1764674000037 {
  name = "ResetAllUserPasswords1764674000037";

  async up(queryRunner) {
    const passwordHash = await bcrypt.hash("Evron@2025", 10);

    await queryRunner.query(
      `
      UPDATE users
      SET password = $1,
          updated_at = NOW()
      `,
      [passwordHash]
    );
  }

  async down() {
    // Password resets cannot be safely reversed.
  }
}
