import bcrypt from "bcryptjs";
import crypto from "crypto";
import https from "https";

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

function assertStrongPassword(password) {
  if (!STRONG_PASSWORD_REGEX.test(password)) {
    throw new Error(
      "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character."
    );
  }
}

async function verifyRecaptcha(token, secretKey) {
  if (!secretKey || !token) return false;
  return new Promise((resolve) => {
    const body = `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(token)}`;
    const req = https.request(
      {
        hostname: "www.google.com",
        path: "/recaptcha/api/siteverify",
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(body) },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data).success === true);
          } catch {
            resolve(false);
          }
        });
      }
    );
    req.on("error", () => resolve(false));
    req.write(body);
    req.end();
  });
}

export const AuthenticationService = {
  login: async (fastify, db, data) => {
    const { email, password, recaptcha_token } = data;

    if (!email || !password) throw new Error("Email & password required");

    // Verify reCAPTCHA if a secret key is configured
    const secretKey = await db.query(`SELECT value FROM settings WHERE key = 'recaptcha_secret_key' LIMIT 1`);
    const secret = secretKey?.[0]?.value || "";
    if (secret) {
      const ok = await verifyRecaptcha(recaptcha_token || "", secret);
      if (!ok) throw new Error("reCAPTCHA verification failed. Please try again.");
    }

    const userRepo = db.getRepository("User");
    const user = await userRepo
      .createQueryBuilder("User")
      .addSelect("User.password")
      .where("User.email = :email", { email })
      .getOne();

    if (!user) throw new Error("Invalid credentials");
    if (user.status !== "Active") throw new Error("Your account is inactive. Contact Admin.");

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new Error("Invalid credentials");

    const token = fastify.jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      { expiresIn: "60d" }
    );
    return { token };
  },

  register: async (db, data) => {
    const repo = db.getRepository("User");
    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      data.password = await bcrypt.hash(data.password, salt);
    }
    const saved = await repo.save(data);
    return saved.id;
  },

  changePassword: async (db, userId, data) => {
    const { old_password, new_password, confirm_password } = data;

    if (!old_password || !new_password || !confirm_password) throw new Error("All fields are required");
    if (new_password !== confirm_password) throw new Error("New password and Confirm password do not match");
    assertStrongPassword(new_password);

    const userRepo = db.getRepository("User");
    const user = await userRepo.findOne({ where: { id: userId }, select: ["id", "password"] });
    if (!user) throw new Error("User not found");

    const isMatch = await bcrypt.compare(old_password, user.password);
    if (!isMatch) throw new Error("Incorrect old password");

    const salt = await bcrypt.genSalt(10);
    await userRepo.update({ id: userId }, { password: await bcrypt.hash(new_password, salt) });
    return { message: "Password updated successfully" };
  },

  forgotPassword: async (db, email, sendEmail) => {
    const userRepo = db.getRepository("User");
    const user = await userRepo.findOne({ where: { email } });
    // Always return success to prevent email enumeration
    if (!user || user.status !== "Active") return { message: "If that email is registered you will receive a reset link." };

    // Invalidate old tokens
    await db.query(`DELETE FROM password_reset_tokens WHERE user_id = $1`, [user.id]);

    const token = crypto.randomBytes(48).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [user.id, token, expiresAt]
    );

    if (sendEmail) {
      await sendEmail(user.email, user.name, token);
    }

    return { message: "If that email is registered you will receive a reset link." };
  },

  resetPassword: async (db, token, new_password) => {
    if (!token || !new_password) throw new Error("Token and new password are required");
    assertStrongPassword(new_password);

    const rows = await db.query(
      `SELECT * FROM password_reset_tokens WHERE token = $1 AND used_at IS NULL AND expires_at > NOW() LIMIT 1`,
      [token]
    );
    if (!rows?.[0]) throw new Error("This reset link is invalid or has expired. Please request a new one.");

    const resetRow = rows[0];
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(new_password, salt);

    const userRepo = db.getRepository("User");
    await userRepo.update({ id: resetRow.user_id }, { password: hashed });
    await db.query(`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`, [resetRow.id]);

    return { message: "Password reset successfully. You can now log in." };
  },
};
